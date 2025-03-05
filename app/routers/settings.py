from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from fastapi.templating import Jinja2Templates
from ..database.database import get_db
from ..database.models import Setting, User
from ..schemas.settings import SettingUpdate, DefaultsUpdate, DefaultsResponse
from .auth import get_current_user
from ..utils.email_sender import send_email
from ..schemas.email import EmailSchema
from typing import List, Dict
import logging
from pydantic import BaseModel
from ..utils.defaults_manager import get_defaults_manager
import json
import httpx
import openai
import yaml

logger = logging.getLogger(__name__)

class SettingResponse(BaseModel):
    id: int
    category: str
    key: str
    value: str
    is_encrypted: bool

    class Config:
        from_attributes = True

    @classmethod
    def from_db_model(cls, setting: Setting):
        return cls(
            id=setting.id,
            category=setting.category,
            key=setting.key,
            value="<encrypted>" if setting.is_encrypted else setting.value,
            is_encrypted=setting.is_encrypted
        )

router = APIRouter(prefix="/settings", tags=["settings"])
templates = Jinja2Templates(directory="app/templates")

@router.get("")
async def settings_page(
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    settings = db.query(Setting).all()
    settings_by_category = {}
    
    for setting in settings:
        if setting.category not in settings_by_category:
            settings_by_category[setting.category] = []
        settings_by_category[setting.category].append(setting)
    
    # Get defaults and theme settings
    defaults_manager = get_defaults_manager()
    editable_defaults = defaults_manager.get_editable_fields()
    theme_settings = settings_by_category.pop('theme', None)
    defaults_settings = settings_by_category.pop('defaults', None)
    
    # Create ordered dictionary with specific order
    ordered_categories = {}
    
    # Add categories before openai
    for category in sorted(settings_by_category.keys()):
        if category != 'openai':
            ordered_categories[category] = settings_by_category[category]
    
    # Add openai if exists
    if 'openai' in settings_by_category:
        ordered_categories['openai'] = settings_by_category['openai']
    
    # Add defaults if exists
    if defaults_settings:
        ordered_categories['defaults'] = defaults_settings
    
    # Add theme at the end if it exists
    if theme_settings:
        ordered_categories['theme'] = theme_settings
    
    return templates.TemplateResponse(
        "pages/settings/edit.html",
        {
            "request": request,
            "settings_by_category": ordered_categories,
            "editable_defaults": editable_defaults,
            "current_user": current_user
        }
    )

@router.put("/update/{setting_id}")
async def update_setting(
    setting_id: int,
    setting_data: SettingUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    setting = db.query(Setting).filter(Setting.id == setting_id).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    setting.is_encrypted = setting_data.is_encrypted
    setting.set_value(setting_data.value)
    db.commit()
    
    return {
        "id": setting.id,
        "category": setting.category,
        "key": setting.key,
        "value": setting.get_value(),
        "is_encrypted": setting.is_encrypted
    }

@router.get("/get-value/{setting_id}")
async def get_setting_value(
    setting_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    setting = db.query(Setting).filter(Setting.id == setting_id).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    return {"value": setting.get_value()}

@router.post("/test-email")
async def test_email(request: Request, db: Session = Depends(get_db)):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    owner_email = db.query(Setting).filter(
        Setting.category == "general",
        Setting.key == "owner_email"
    ).first()
    
    if not owner_email or not owner_email.get_value():
        raise HTTPException(
            status_code=400, 
            detail="Owner email not configured in settings"
        )
    
    email_data = EmailSchema(
        to_email=owner_email.get_value(),
        subject="Test Email from ScolaIA Lounge",
        body_text="This is a test email to verify your email configuration."
    )
    
    success, message = await send_email(db, email_data)
    if not success:
        raise HTTPException(
            status_code=500,
            detail=message
        )
    
    return {"message": "Test email sent successfully"}

@router.get("/theme")
async def get_theme_settings(db: Session = Depends(get_db)):
    theme_settings = db.query(Setting).filter(Setting.category == "theme").all()
    return [
        {
            "key": setting.key,
            "value": setting.get_value()
        }
        for setting in theme_settings
    ]

@router.get("/defaults")
async def get_defaults(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get all default values for assistant creation"""
    # Verificar autenticación
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Obtener el defaults manager
    defaults_manager = get_defaults_manager()
    defaults = defaults_manager.load_defaults()
    
    # Obtener defaults de metadata de la base de datos
    metadata_defaults = {}
    metadata_settings = db.query(Setting).filter(
        Setting.category == "metadata_defaults"
    ).all()
    
    if metadata_settings:
        for setting in metadata_settings:
            # Convertir string a lista para campos que son listas
            if setting.key in ["educational_level", "keywords", "use_cases"]:
                try:
                    value = json.loads(setting.value)
                except:
                    value = []
            else:
                value = setting.value
            
            # Organizar los defaults de metadata
            parts = setting.key.split('_')
            if len(parts) > 1:
                # Si el key tiene múltiples partes (ej: desc_title), organizarlo en subobjetos
                if parts[0] not in metadata_defaults:
                    metadata_defaults[parts[0]] = {}
                metadata_defaults[parts[0]]['_'.join(parts[1:])] = value
            else:
                metadata_defaults[setting.key] = value
    
    # Combinar los defaults del archivo yaml con los de metadata
    response = {
        "assistant_instructions": defaults.get("assistant_instructions", {}),
        "metadata": metadata_defaults
    }
    
    return response

@router.put("/defaults/{key}")
async def update_default(
    key: str,
    default_data: DefaultsUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Update a specific default value"""
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        defaults_manager = get_defaults_manager()
        defaults = defaults_manager.load_defaults()
        
        # Convert dot notation to nested dict update
        keys = key.split('.')
        current = defaults
        for k in keys[:-1]:
            if k not in current:
                raise HTTPException(status_code=404, detail=f"Key path {key} not found")
            if not isinstance(current[k], dict):
                raise HTTPException(status_code=400, detail=f"Cannot update nested key in non-dict value at {k}")
            current = current[k]
        
        if keys[-1] not in current:
            raise HTTPException(status_code=404, detail=f"Key {key} not found")
        
        # Update value
        current[keys[-1]] = default_data.value
        
        # Save and validate
        try:
            defaults_manager.save_defaults(defaults)
            return {"status": "success", "message": f"Default value for {key} updated successfully"}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@router.get("/{category}/{key}")
async def get_setting_by_category_key(
    category: str,
    key: str,
    request: Request,
    db: Session = Depends(get_db)
):
    setting = db.query(Setting).filter(
        Setting.category == category,
        Setting.key == key
    ).first()
    
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    return {
        "id": setting.id,
        "category": setting.category,
        "key": setting.key,
        "value": "<encrypted>" if setting.is_encrypted else setting.value,
        "is_encrypted": setting.is_encrypted
    }

@router.get("/", response_model=List[dict])
async def get_settings(db: Session = Depends(get_db)):
    """Get all settings with masked encrypted values"""
    try:
        settings = db.query(Setting).all()
        return [{
            "id": setting.id,
            "category": setting.category,
            "key": setting.key,
            "value": setting.decrypted_value,
            "is_encrypted": setting.is_encrypted
        } for setting in settings]
    except Exception as e:
        logger.error(f"Error getting settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving settings") 

@router.get("/ollama/url")
async def get_ollama_url(db: Session = Depends(get_db)):
    """Get the complete Ollama URL with protocol"""
    try:
        url = db.query(Setting).filter(
            Setting.category == "ollama",
            Setting.key == "ollama_url"
        ).first()
        
        port = db.query(Setting).filter(
            Setting.category == "ollama",
            Setting.key == "ollama_port"
        ).first()
        
        if not url or not port:
            raise HTTPException(status_code=404, detail="Ollama settings not found")
            
        # Ensure URL has protocol
        base_url = url.value
        if not base_url.startswith(('http://', 'https://')):
            base_url = f"http://{base_url}"  # Cambiado a http:// para consistencia
            
        return {
            "url": f"{base_url}:{port.value}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-ollama")
async def test_ollama(request: Request, db: Session = Depends(get_db)):
    """Test Ollama connection and functionality using native Ollama API"""
    try:
        # Verificar autenticación
        current_user = get_current_user(db, request.cookies.get("session"))
        if not current_user or not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Obtener configuración de Ollama
        url = db.query(Setting).filter(
            Setting.category == "ollama",
            Setting.key == "ollama_url"
        ).first()
        
        port = db.query(Setting).filter(
            Setting.category == "ollama",
            Setting.key == "ollama_port"
        ).first()
        
        model = db.query(Setting).filter(
            Setting.category == "ollama",
            Setting.key == "ollama_model"
        ).first()
        
        if not url or not port:
            raise HTTPException(status_code=404, detail="Ollama settings not found")
            
        # Asegurar que la URL tiene protocolo
        base_url = url.value
        if not base_url.startswith(('http://', 'https://')):
            base_url = f"http://{base_url}"
            
        final_url = f"{base_url}:{port.value}"

        result = {
            "server_status": "unknown",
            "models_status": "unknown",
            "configured_model": model.value if model else "not configured",
            "model_status": "unknown"
        }
        
        try:
            # Usar httpx para hacer las peticiones HTTP
            async with httpx.AsyncClient() as client:
                # Obtener lista de modelos usando la API nativa de Ollama
                models_response = await client.get(f"{final_url}/api/tags")
                models_data = models_response.json()
                
                result["server_status"] = "ok"
                result["models_status"] = "ok"
                
                # Extraer información de los modelos
                available_models = []
                for model_info in models_data.get("models", []):
                    model_name = model_info.get("name", "")
                    if model_name:
                        available_models.append(model_name)
                
                result["available_models"] = available_models
                
                # Verificar si el modelo configurado está disponible
                if model and model.value in available_models:
                    result["model_status"] = "ok"
                else:
                    result["model_status"] = "not found"
                
                # Hacer una pequeña prueba con el modelo configurado si está disponible
                if result["model_status"] == "ok":
                    test_response = await client.post(
                        f"{final_url}/api/generate",
                        json={
                            "model": model.value,
                            "prompt": "Say 'test' in one word",
                            "stream": False
                        }
                    )
                    test_data = test_response.json()
                    if test_data.get("response"):
                        result["model_test"] = "ok"
                    else:
                        result["model_test"] = "failed"
            
            # Construir mensaje de éxito
            success_message = "Ollama server is running correctly"
            if result["model_status"] == "ok":
                success_message += f" and model '{result['configured_model']}' is available"
                if result.get("model_test") == "ok":
                    success_message += " and responding"
            elif model:
                success_message += f" but model '{result['configured_model']}' was not found"
            
            return {
                "status": "success",
                "message": success_message,
                "details": result
            }
            
        except httpx.RequestError as e:
            result["server_status"] = "error"
            return {
                "status": "error",
                "message": f"Error connecting to Ollama server: {str(e)}",
                "details": result
            }
            
    except Exception as e:
        return {
            "status": "error",
            "message": f"Unexpected error: {str(e)}",
            "details": {
                "error": str(e)
            }
        }

@router.get("/general/default_ip_license")
async def get_default_ip_license(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get default IP license from settings"""
    # Verificar autenticación
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Obtener la licencia por defecto de la base de datos
    license_setting = db.query(Setting).filter(
        Setting.category == "general",
        Setting.key == "default_ip_license"
    ).first()
    
    if not license_setting:
        # Si no existe, usar valor por defecto
        return {"value": "CC By-Sa 4.0"}
    
    # Devolver el valor sin encriptar
    return {"value": license_setting.get_value() if license_setting.is_encrypted else license_setting.value}

@router.post("/test-openai")
async def test_openai(request: Request, db: Session = Depends(get_db)):
    """Test OpenAI connection and get available models"""
    logger = logging.getLogger(__name__)
    try:
        # Verificar autenticación
        current_user = get_current_user(db, request.cookies.get("session"))
        if not current_user or not current_user.is_admin:
            logger.warning(f"Unauthorized test-openai attempt from user {current_user.username if current_user else 'anonymous'}")
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Obtener configuración de OpenAI
        api_key = db.query(Setting).filter(
            Setting.category == "openapi",
            Setting.key == "openapi_apikey"
        ).first()
        
        if not api_key:
            logger.error("OpenAI API key setting not found in database")
            raise HTTPException(status_code=404, detail="OpenAI API key not found in settings")
            
        # Obtener el valor desencriptado de la API key
        decrypted_key = api_key.get_value()
        
        if not decrypted_key or decrypted_key == "<encrypted>" or decrypted_key == "enter here your 164 char OpenAI Project API key":
            logger.error("OpenAI API key not properly configured")
            raise HTTPException(status_code=400, detail="Please configure your OpenAI API key first")
        
        result = {
            "connection_status": "unknown",
            "models_status": "unknown",
            "available_models": []
        }
        
        # Probar la conexión con OpenAI
        timeout = httpx.Timeout(10.0, connect=5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            headers = {
                "Authorization": f"Bearer {decrypted_key}",
                "Content-Type": "application/json"
            }
            
            try:
                logger.info("Attempting to connect to OpenAI API...")
                # 1. Verificar que podemos conectar y obtener modelos
                models_response = await client.get(
                    "https://api.openai.com/v1/models",
                    headers=headers
                )
                
                if models_response.status_code == 200:
                    result["connection_status"] = "ok"
                    models_data = models_response.json()
                    # Filtrar solo los modelos GPT
                    gpt_models = [
                        model["id"] for model in models_data["data"]
                        if any(prefix in model["id"] for prefix in ["gpt-3.5", "gpt-4"])
                    ]
                    result["models_status"] = "ok"
                    result["available_models"] = sorted(gpt_models)
                    
                    logger.info(f"Successfully connected to OpenAI. Found {len(gpt_models)} GPT models")
                    return {
                        "status": "success",
                        "message": f"Successfully connected to OpenAI. Found {len(gpt_models)} GPT models.",
                        "details": result
                    }
                else:
                    error_msg = models_response.json().get("error", {}).get("message", "Unknown error")
                    result["connection_status"] = "error"
                    logger.error(f"OpenAI API returned error status {models_response.status_code}: {error_msg}")
                    return {
                        "status": "error",
                        "message": f"Error connecting to OpenAI: {error_msg}",
                        "details": result
                    }
                    
            except httpx.TimeoutException as e:
                result["connection_status"] = "error"
                logger.error(f"Timeout while connecting to OpenAI: {str(e)}")
                return {
                    "status": "error",
                    "message": "Connection to OpenAI timed out. Please check your network connection.",
                    "details": result
                }
            except httpx.ConnectError as e:
                result["connection_status"] = "error"
                logger.error(f"Connection error to OpenAI: {str(e)}")
                return {
                    "status": "error", 
                    "message": "Could not connect to OpenAI. Please check your network connection.",
                    "details": result
                }
            except Exception as e:
                result["connection_status"] = "error"
                logger.error(f"Unexpected error while testing OpenAI connection: {str(e)}", exc_info=True)
                return {
                    "status": "error",
                    "message": f"Error connecting to OpenAI: {str(e)}",
                    "details": result
                }
                
    except Exception as e:
        logger.error(f"Error in test_openai endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/defaults-yaml")
async def get_defaults_yaml(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get the contents of defaults.yaml file"""
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        defaults_manager = get_defaults_manager()
        with open(defaults_manager.defaults_path, 'r') as f:
            content = f.read()
        return Response(content=content, media_type="text/plain")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/defaults-yaml")
async def update_defaults_yaml(
    request: Request,
    data: Dict[str, str],
    db: Session = Depends(get_db)
):
    """Update the contents of defaults.yaml file"""
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Validar que el contenido sea YAML válido
        yaml.safe_load(data["content"])
        
        defaults_manager = get_defaults_manager()
        with open(defaults_manager.defaults_path, 'w') as f:
            f.write(data["content"])
            
        # Limpiar el caché del DefaultsManager
        defaults_manager.load_defaults.cache_clear()
        
        return {"message": "defaults.yaml updated successfully"}
    except yaml.YAMLError as e:
        raise HTTPException(status_code=400, detail=f"Invalid YAML format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get_default_llm")
async def get_default_llm(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get the default LLM model and its specific model name from settings"""
    try:
        # Get default LLM setting
        default_llm = db.query(Setting).filter(
            Setting.category == "general",
            Setting.key == "default_LLM"
        ).first()
        
        if not default_llm:
            raise HTTPException(status_code=404, detail="Default LLM setting not found")
            
        if default_llm.value.lower() == "local":
            # Get Ollama model
            model = db.query(Setting).filter(
                Setting.category == "ollama",
                Setting.key == "ollama_model"
            ).first()
            model_name = model.value if model else "Ollama"
        else:
            # Get OpenAI model
            model = db.query(Setting).filter(
                Setting.category == "openapi",
                Setting.key == "openapi_model"
            ).first()
            model_name = model.value if model else "OpenAI"
            
        return {
            "model": model_name
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in get_default_llm: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test-openai-command")
async def get_test_openai_command(request: Request, db: Session = Depends(get_db)):
    """Get a curl command to test OpenAI connection with current API key"""
    try:
        # Verificar autenticación
        current_user = get_current_user(db, request.cookies.get("session"))
        if not current_user or not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Obtener configuración de OpenAI
        api_key = db.query(Setting).filter(
            Setting.category == "openapi",
            Setting.key == "openapi_apikey"
        ).first()
        
        if not api_key:
            raise HTTPException(status_code=404, detail="OpenAI API key not found in settings")
            
        # Obtener el valor desencriptado de la API key
        decrypted_key = api_key.get_value()
        
        if not decrypted_key or decrypted_key == "<encrypted>" or decrypted_key == "enter here your 164 char OpenAI Project API key":
            raise HTTPException(status_code=400, detail="Please configure your OpenAI API key first")
        
        # Generar el comando curl
        curl_command = f'curl -v https://api.openai.com/v1/models -H "Authorization: Bearer {decrypted_key}"'
        
        return {"command": curl_command}
        
    except Exception as e:
        logger.error(f"Error generating test command: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))