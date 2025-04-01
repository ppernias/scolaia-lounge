from fastapi import APIRouter, Depends, HTTPException, Request, Cookie
from fastapi.responses import RedirectResponse, PlainTextResponse, HTMLResponse, JSONResponse
from sqlalchemy.orm import Session
from fastapi.templating import Jinja2Templates
from ...database.database import get_db
from ...database.models import Assistant, User, Setting
from ..auth import get_current_user
from ...utils.filters import datetime_filter, shortdate_filter
from ...utils.history_utils import extract_dates_from_history
import logging
import yaml
import os
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")
templates.env.filters["datetime"] = datetime_filter
templates.env.filters["shortdate"] = shortdate_filter

@router.get("/")
async def list_assistants(
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user:
        return RedirectResponse(url="/auth/login")
    
    # Obtener asistentes ordenados por fecha de actualización
    db_assistants = db.query(Assistant).filter(
        Assistant.user_id == current_user.id
    ).order_by(Assistant.updated_at.desc()).all()
    
    # Procesar los asistentes para incluir la metadata
    assistants = []
    for assistant in db_assistants:
        try:
            yaml_data = yaml.safe_load(assistant.yaml_content)
            
            # Extraer fechas del historial
            history = yaml_data.get('metadata', {}).get('history', [])
            dates = extract_dates_from_history(history)
            
            # Extract tool display names
            tools = []
            tools_data = yaml_data.get('assistant_instructions', {}).get('tools', {})
            
            # Add command display names
            for cmd_name, cmd_data in tools_data.get('commands', {}).items():
                if isinstance(cmd_data, dict) and 'display_name' in cmd_data:
                    tools.append({
                        'name': cmd_data['display_name'],
                        'type': 'command'
                    })
            
            # Add option display names
            for opt_name, opt_data in tools_data.get('options', {}).items():
                if isinstance(opt_data, dict) and 'display_name' in opt_data:
                    tools.append({
                        'name': opt_data['display_name'],
                        'type': 'option'
                    })
            
            # Add decorator display names
            for dec_name, dec_data in tools_data.get('decorators', {}).items():
                if isinstance(dec_data, dict) and 'display_name' in dec_data:
                    tools.append({
                        'name': dec_data['display_name'],
                        'type': 'decorator'
                    })
            
            assistants.append({
                'id': assistant.id,
                'title': assistant.title,
                'created_at': assistant.created_at,
                'updated_at': assistant.updated_at,
                'downloads': assistant.downloads,
                'metadata': yaml_data.get('metadata', {}),
                'yaml_content': assistant.yaml_content,
                'tools': tools,
                'creation_date': dates['creation_date'],
                'last_update': dates['last_update']
            })
        except Exception as e:
            logger.error(f"Error processing assistant {assistant.id}: {str(e)}")
            continue
    
    return templates.TemplateResponse(
        "pages/assistants/base.html",
        {
            "request": request,
            "assistants": assistants,
            "current_user": current_user
        }
    )

@router.get("/{assistant_id}", response_class=HTMLResponse)
async def get_assistant(
    assistant_id: int,
    request: Request,
    db: Session = Depends(get_db),
    session: Optional[str] = Cookie(None)
):
    """Get a specific assistant by ID"""
    current_user = get_current_user(db, session)
    
    assistant = db.query(Assistant).filter(Assistant.id == assistant_id).first()
    if not assistant:
        return templates.TemplateResponse(
            "pages/error.html",
            {"request": request, "error_message": "Assistant not found", "status_code": 404}
        )
    
    # Verificar si el asistente es público o si el usuario es el propietario
    is_owner = current_user and assistant.user_id == current_user.id
    if not assistant.is_public and not is_owner:
        return templates.TemplateResponse(
            "pages/error.html",
            {"request": request, "error_message": "You don't have permission to view this assistant", "status_code": 403}
        )
    
    try:
        yaml_data = yaml.safe_load(assistant.yaml_content)
        metadata = yaml_data.get('metadata', {})
        description = metadata.get('description', {})
        
        # Extraer fechas del historial
        history = metadata.get('history', [])
        dates = extract_dates_from_history(history)
        
        # Extraer información de las herramientas
        tools = yaml_data.get('tools', [])
        tool_names = []
        for tool in tools:
            if isinstance(tool, dict) and 'name' in tool:
                tool_names.append(tool['name'])
            elif isinstance(tool, str):
                tool_names.append(tool)
        
        # Extraer palabras clave
        keywords = metadata.get('keywords', [])
        
        # Incrementar contador de visualizaciones
        assistant.views += 1
        db.commit()
        
        # Obtener información del propietario
        owner = db.query(User).filter(User.id == assistant.user_id).first()
        owner_name = owner.username if owner else "Unknown"
        
        return templates.TemplateResponse(
            "pages/assistants/view.html",
            {
                "request": request,
                "assistant": {
                    'id': assistant.id,
                    'title': assistant.title,
                    'author': metadata.get('author', {}).get('name', assistant.created_by or 'Unknown'),
                    'summary': description.get('summary', ''),
                    'tools': tool_names,
                    'keywords': keywords,
                    'is_public': assistant.is_public,
                    'created_at': assistant.created_at,
                    'updated_at': assistant.updated_at,
                    'created_by': assistant.created_by,
                    'creation_date': dates['creation_date'],
                    'last_update': dates['last_update'],
                    'yaml_content': assistant.yaml_content,
                    'views': assistant.views,
                    'downloads': assistant.downloads,
                    'forked_from': assistant.forked_from,
                    'remixed_by': assistant.remixed_by.split(', ') if assistant.remixed_by else []
                },
                "current_user": current_user,
                "is_owner": is_owner,
                "owner_name": owner_name
            }
        )
    except Exception as e:
        logger.error(f"Error loading assistant {assistant_id}: {str(e)}")
        return templates.TemplateResponse(
            "pages/error.html",
            {"request": request, "error_message": f"Error loading assistant: {str(e)}", "status_code": 500}
        )

@router.get("/{assistant_id}/yaml")
async def get_assistant_yaml(
    assistant_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    assistant = db.query(Assistant).filter(
        Assistant.id == assistant_id,
        Assistant.user_id == current_user.id
    ).first()
    
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Log the YAML content for debugging
    logger.info(f"YAML content for assistant {assistant_id}:")
    logger.info(assistant.yaml_content)
    
    # Parse the YAML to check if assistant_instructions exists
    try:
        parsed_yaml = yaml.safe_load(assistant.yaml_content)
        logger.info(f"Parsed YAML for assistant {assistant_id}:")
        logger.info(f"Has assistant key: {('assistant' in parsed_yaml)}")
        logger.info(f"Has instructions key: {('instructions' in parsed_yaml.get('assistant', {}))}")
    except Exception as e:
        logger.error(f"Error parsing YAML: {str(e)}")
    
    # Devolver el contenido YAML como JSON para que sea más fácil de manejar en el frontend
    return {"yaml_content": assistant.yaml_content}

@router.put("/{assistant_id}/yaml")
async def update_assistant_yaml(
    assistant_id: int,
    yaml_data: dict,
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    assistant = db.query(Assistant).filter(
        Assistant.id == assistant_id,
        Assistant.user_id == current_user.id
    ).first()
    
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    # Actualizar el contenido YAML
    try:
        # Validar que el YAML es válido
        yaml_content = yaml_data.get("yaml_content")
        if not yaml_content:
            raise HTTPException(status_code=400, detail="No YAML content provided")
            
        # Intentar cargar el YAML para validarlo
        yaml.safe_load(yaml_content)
        
        # Actualizar el asistente
        assistant.yaml_content = yaml_content
        db.commit()
        
        return {"message": "YAML updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error updating YAML: {str(e)}")

@router.get("/user/data")
async def get_current_user_data(
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"username": current_user.username}

@router.get("/defaults")
async def get_defaults(
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        defaults_manager = get_defaults_manager()
        defaults = defaults_manager.get_defaults()
        
        # Get license from settings
        license_setting = db.query(Setting).filter(
            Setting.category == "license",
            Setting.key == "default_license"
        ).first()
        
        if license_setting:
            defaults['license'] = license_setting.value
            
        return defaults
    except Exception as e:
        logger.error(f"Error getting defaults: {str(e)}")
        raise HTTPException(status_code=500, detail="Error getting defaults")

@router.get("/api/schema")
async def get_schema():
    try:
        # Obtener la ruta absoluta al archivo schema.yaml
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        schema_path = os.path.join(base_dir, "schema.yaml")
        
        logger.info(f"Cargando esquema desde: {schema_path}")
        
        # Abrir y leer el archivo schema.yaml
        with open(schema_path, "r") as schema_file:
            schema_content = schema_file.read()
            
        # Convertir el YAML a un diccionario Python
        schema_dict = yaml.safe_load(schema_content)
        
        # Devolver el esquema como JSON
        return JSONResponse(content=schema_dict)
    except Exception as e:
        logger.error(f"Error al cargar el esquema: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al cargar el esquema: {str(e)}")
