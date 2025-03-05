from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from ...database.database import get_db
from ...database.models import Setting, User
from ..auth import get_current_user
import logging
import openai
from pydantic import BaseModel, Field, validator
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter()

class ImprovePromptRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="The prompt to improve")
    context: Optional[dict] = Field(None, description="Optional context for the prompt improvement")
    
    @validator('prompt')
    def validate_prompt(cls, v):
        if not v or not v.strip():
            raise ValueError('Prompt cannot be empty')
        return v.strip()
    
    class Config:
        json_schema_extra = {
            "example": {
                "prompt": "You are a helpful assistant...",
                "context": {
                    "tool_name": "example",
                    "tool_type": "command",
                    "display_name": "Example Tool"
                }
            }
        }

@router.get("/ollama_url")
async def get_ollama_url(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get the complete Ollama URL with protocol"""
    logger.info(f"Received request for ollama_url")
    
    # Verificar autenticación
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user:
        logger.warning("Unauthorized attempt to access ollama_url")
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        url = db.query(Setting).filter(
            Setting.category == "ollama",
            Setting.key == "ollama_url"
        ).first()
        
        port = db.query(Setting).filter(
            Setting.category == "ollama",
            Setting.key == "ollama_port"
        ).first()
        
        logger.info(f"Retrieved settings - URL: {url and url.value}, Port: {port and port.value}")
        
        if not url or not port:
            logger.warning("Ollama settings not found in database")
            raise HTTPException(status_code=404, detail="Ollama settings not found")
            
        # Ensure URL has protocol
        base_url = url.value
        if not base_url.startswith(('http://', 'https://')):
            base_url = f"https://{base_url}"  # Usar HTTPS por defecto
            
        final_url = f"{base_url}:{port.value}"
        logger.info(f"Returning final Ollama URL: {final_url}")
        
        return {
            "url": final_url
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in get_ollama_url: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/license")
async def get_license(db: Session = Depends(get_db)):
    """Get default IP license from settings"""
    try:
        license_setting = db.query(Setting).filter(
            Setting.category == "license",
            Setting.key == "default_license"
        ).first()
        
        if not license_setting:
            return {"default_license": None}
            
        return {"default_license": license_setting.value}
    except Exception as e:
        logger.error(f"Error getting license: {str(e)}")
        raise HTTPException(status_code=500, detail="Error getting license")

@router.post("/improve-prompt", tags=["assistants"])
async def improve_prompt(
    request: Request,
    data: ImprovePromptRequest,
    db: Session = Depends(get_db)
):
    """Improve a prompt using either Ollama or OpenAI based on default_LLM setting"""
    logger.info("Starting improve_prompt endpoint")
    
    try:
        # Get request data
        logger.info(f"Received prompt: {data.prompt[:100]}...")  # Log first 100 chars
        
        if not data.prompt:
            logger.error("Empty prompt received")
            raise HTTPException(status_code=400, detail="Prompt is required")
            
        # Get default LLM setting
        default_llm = db.query(Setting).filter(
            Setting.category == "general",
            Setting.key == "default_LLM"
        ).first()
        
        if not default_llm:
            logger.error("Default LLM setting not found")
            raise HTTPException(status_code=404, detail="Default LLM setting not found")
            
        logger.info(f"Using LLM: {default_llm.value}")
        
        # Get improve role prompt from settings
        improve_role_setting = db.query(Setting).filter(
            Setting.category == "improve",
            Setting.key == "improve_role"
        ).first()
        
        if not improve_role_setting:
            logger.error("Improve role prompt setting not found")
            raise HTTPException(status_code=404, detail="Improve role prompt setting not found")
            
        system_prompt = improve_role_setting.value
        
        try:
            if default_llm.value.lower() == "local":
                # Use Ollama with OpenAI compatibility
                url = db.query(Setting).filter(
                    Setting.category == "ollama",
                    Setting.key == "ollama_url"
                ).first()
                logger.info(f"Ollama URL setting: {url.value if url else 'Not found'}")
                
                port = db.query(Setting).filter(
                    Setting.category == "ollama",
                    Setting.key == "ollama_port"
                ).first()
                logger.info(f"Ollama port setting: {port.value if port else 'Not found'}")
                
                model = db.query(Setting).filter(
                    Setting.category == "ollama",
                    Setting.key == "ollama_model"
                ).first()
                logger.info(f"Ollama model setting: {model.value if model else 'Not found'}")
                
                if not url or not port or not model:
                    logger.error("Missing Ollama settings")
                    raise HTTPException(status_code=404, detail="Ollama settings not found")
                    
                # Ensure URL has protocol
                base_url = url.value
                if not base_url.startswith(('http://', 'https://')):
                    base_url = f"http://{base_url}"
                    
                ollama_url = f"{base_url}:{port.value}"
                logger.info(f"Final Ollama URL: {ollama_url}")
                
                # Configure OpenAI client for Ollama
                client = openai.AsyncOpenAI(
                    base_url=f"{ollama_url}/v1",
                    api_key="ollama"  # Ollama no requiere API key real
                )
                logger.info("Configured Ollama client with OpenAI compatibility")
                
            else:
                # Use OpenAI
                api_key = db.query(Setting).filter(
                    Setting.category == "openapi",
                    Setting.key == "openapi_apikey"
                ).first()
                logger.info("Found OpenAI API key setting")
                
                if not api_key:
                    logger.error("OpenAI API key not found")
                    raise HTTPException(status_code=404, detail="OpenAI API key not found")
                    
                decrypted_key = api_key.get_value()
                logger.info("Decrypted OpenAI API key")
                
                if not decrypted_key or decrypted_key == "<encrypted>":
                    logger.error("Invalid OpenAI API key state")
                    raise HTTPException(status_code=400, detail="Invalid OpenAI API key")

                # Get OpenAI model from settings
                openai_model = db.query(Setting).filter(
                    Setting.category == "openapi",
                    Setting.key == "openapi_model"
                ).first()
                logger.info(f"OpenAI model setting: {openai_model.value if openai_model else 'Not found'}")

                if not openai_model:
                    logger.error("OpenAI model setting not found")
                    raise HTTPException(status_code=404, detail="OpenAI model setting not found")
                
                # Configure standard OpenAI client
                client = openai.AsyncOpenAI(api_key=decrypted_key)
                model_to_use = openai_model.value
                logger.info("Configured OpenAI client")

            # Create chat completion using the OpenAI library
            logger.info("Sending request to LLM API...")
            try:
                # Prepare user content including context if present
                user_content = data.prompt
                if data.context:
                    context_str = "\nContext:\n"
                    for key, value in data.context.items():
                        context_str += f"- {key}: {value}\n"
                    user_content = f"{context_str}\nPrompt to improve:\n{data.prompt}"
                
                completion = await client.chat.completions.create(
                    model=model.value if default_llm.value.lower() == "local" else model_to_use,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ],
                    temperature=0.7,
                    max_tokens=1000
                )
                logger.info("Received response from LLM API")
                
                improved_prompt = completion.choices[0].message.content.strip()
                logger.info("Successfully processed response")
                return {"success": True, "improved_prompt": improved_prompt}
                
            except openai.APIError as e:
                logger.error(f"OpenAI API error details: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error calling LLM API: {str(e)}")
            except Exception as e:
                logger.error(f"Unexpected error during API call: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
                
        except openai.APIError as e:
            logger.error(f"OpenAI API error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error calling LLM API: {str(e)}")
            
    except HTTPException as e:
        logger.error(f"HTTP exception: {str(e)}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
