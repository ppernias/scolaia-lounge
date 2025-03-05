from fastapi import APIRouter, Request, Depends, Cookie, Form, HTTPException, Body
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
import yaml
import os
import logging
from datetime import datetime

from ...database.database import get_db
from ...database.models import Assistant, User
from ...routers.auth import get_current_user
from ...utils.history_utils import format_history_entry, clean_redundant_history_fields

logger = logging.getLogger(__name__)

router = APIRouter()

def create_assistant_from_yaml(db: Session, user_id: int, yaml_content: str):
    try:
        yaml_data = yaml.safe_load(yaml_content)
        metadata = yaml_data.get('metadata', {})
        description = metadata.get('description', {})
        
        # Get the forked_from ID if present
        forked_from = metadata.get('forked_from')
        
        # Get current user
        current_user = db.query(User).filter(User.id == user_id).first()
        if not current_user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Set creation timestamp
        current_date = datetime.utcnow()
        
        # Initialize metadata if not present
        if 'metadata' not in yaml_data:
            yaml_data['metadata'] = {}
            
        # Initialize history if not present
        if 'history' not in yaml_data['metadata']:
            yaml_data['metadata']['history'] = []
            
        # Add creation entry to history using the formatted entry
        yaml_data['metadata']['history'].append(
            format_history_entry("create", current_user.username, current_date)
        )
        
        # Eliminar campos redundantes
        yaml_data = clean_redundant_history_fields(yaml_data)
        
        # Convert back to YAML
        updated_yaml = yaml.dump(yaml_data, allow_unicode=True)
        
        assistant = Assistant(
            user_id=user_id,
            title=description.get('title', 'Untitled Assistant'),
            yaml_content=updated_yaml,
            is_public=metadata.get('visibility', {}).get('is_public', True),
            created_by=metadata.get('author', {}).get('name'),
            forked_from=forked_from
        )
        
        return assistant
    except Exception as e:
        logger.error(f"Error creating assistant from YAML: {str(e)}")
        return None

@router.post("/create-from-template")
async def create_assistant_from_template(
    request: Request,
    yaml_content: dict = Body(...),
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # Cargar el YAML y actualizarlo con la información del usuario actual
        yaml_data = yaml.safe_load(yaml_content["yaml_content"])
        
        # Actualizar metadatos
        current_date = datetime.utcnow()
        if not yaml_data.get('metadata'):
            yaml_data['metadata'] = {}
        
        if not yaml_data['metadata'].get('author'):
            yaml_data['metadata']['author'] = {}
        yaml_data['metadata']['author']['name'] = current_user.full_name or current_user.username
        
        # Inicializar el historial con la entrada de creación
        if 'history' not in yaml_data['metadata']:
            yaml_data['metadata']['history'] = []
        
        # Añadir entrada de creación al historial
        yaml_data['metadata']['history'] = [
            format_history_entry("create", current_user.full_name or current_user.username, current_date)
        ]
        
        # Eliminar campos redundantes
        yaml_data = clean_redundant_history_fields(yaml_data)
        
        # Convertir de nuevo a YAML
        updated_yaml = yaml.dump(yaml_data, allow_unicode=True)
        
        # Crear el asistente
        assistant = Assistant(
            user_id=current_user.id,
            yaml_content=updated_yaml,
            title=yaml_data.get('metadata', {}).get('description', {}).get('title', 'Untitled Assistant'),
            created_by=current_user.full_name or current_user.username
        )
        
        db.add(assistant)
        db.commit()
        db.refresh(assistant)
        
        return {"message": "Assistant created successfully", "assistant_id": assistant.id}
    except Exception as e:
        db.rollback()
        error_msg = f"Error creating assistant: {str(e.__class__.__name__)}: {str(e)}"
        print(error_msg)  # Log the error for debugging
        raise HTTPException(status_code=500, detail=error_msg)

@router.post("/create")
async def create_assistant(
    request: Request,
    yaml_content: dict = Body(...),
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    try:
        # El contenido YAML viene en el campo yaml_content del JSON
        yaml_str = yaml_content.get("yaml_content")
        if not yaml_str:
            raise HTTPException(status_code=400, detail="YAML content is required")
            
        # Validate YAML format
        try:
            yaml_data = yaml.safe_load(yaml_str)
        except yaml.YAMLError as e:
            raise HTTPException(status_code=400, detail=f"Invalid YAML format: {str(e)}")
            
        assistant = create_assistant_from_yaml(db, current_user.id, yaml_str)
        if assistant:
            db.add(assistant)
            db.commit()
            
            # Si es una nueva versión, incrementar el contador de versiones del original
            if assistant.forked_from:
                original_assistant = db.query(Assistant).filter(Assistant.id == assistant.forked_from).first()
                if original_assistant:
                    original_assistant.remixed_by = (original_assistant.remixed_by or '') + f"{current_user.username}, "
                    db.commit()
            
            return {"message": "Assistant created successfully", "assistant_id": assistant.id}
        else:
            raise HTTPException(status_code=500, detail="Failed to create assistant")
    except Exception as e:
        logger.error(f"Error creating assistant: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{assistant_id}")
async def update_assistant(
    assistant_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    assistant = db.query(Assistant).filter(Assistant.id == assistant_id).first()
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
        
    if assistant.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this assistant")
        
    try:
        form_data = await request.form()
        yaml_content = form_data.get("yaml_content")
        
        if not yaml_content:
            raise HTTPException(status_code=400, detail="YAML content is required")
            
        # Validate YAML format
        try:
            yaml_data = yaml.safe_load(yaml_content)
        except yaml.YAMLError as e:
            raise HTTPException(status_code=400, detail=f"Invalid YAML format: {str(e)}")
            
        # Actualizar el valor de is_public según el YAML
        is_public = yaml_data.get('metadata', {}).get('visibility', {}).get('is_public', True)
        
        assistant.yaml_content = yaml_content
        assistant.updated_at = datetime.utcnow()
        assistant.is_public = is_public
        db.commit()
        
        return {"message": "Assistant updated successfully"}
    except Exception as e:
        logger.error(f"Error updating assistant {assistant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{assistant_id}/delete")
async def delete_assistant_redirect(
    assistant_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user:
        return RedirectResponse(url="/auth/login")

    assistant = db.query(Assistant).filter(Assistant.id == assistant_id).first()
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
        
    if assistant.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this assistant")
        
    db.delete(assistant)
    db.commit()
    
    return RedirectResponse(url="/assistants")

@router.delete("/{assistant_id}")
async def delete_assistant(
    assistant_id: int,
    db: Session = Depends(get_db),
    session: Optional[str] = Cookie(None)
):
    current_user = get_current_user(db, session)
    if not current_user:
        return JSONResponse(
            status_code=401,
            content={"detail": "Not authenticated"}
        )

    # Obtener el asistente
    assistant = db.query(Assistant).filter(Assistant.id == assistant_id).first()
    if not assistant:
        return JSONResponse(
            status_code=404,
            content={"detail": "Assistant not found"}
        )

    try:
        # Verificar si el asistente pertenece al usuario
        if assistant.user_id == current_user.id:
            # Si es el propietario, eliminar el asistente completamente
            db.delete(assistant)
        else:
            # Si no es el propietario, solo eliminar de la colección
            delete_sql = text("""
                DELETE FROM user_assistant_collections 
                WHERE user_id = :user_id AND assistant_id = :assistant_id
            """)
            result = db.execute(
                delete_sql,
                {"user_id": current_user.id, "assistant_id": assistant_id}
            )
            
            # Decrementar el contador de colecciones
            assistant.in_collections = max(0, assistant.in_collections - 1)
            db.add(assistant)

        db.commit()
        return JSONResponse(
            status_code=200,
            content={"status": "success", "message": "Assistant removed successfully"}
        )
    except Exception as e:
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error removing assistant: {str(e)}"}
        )

@router.post("/{assistant_id}/clone")
async def clone_assistant(
    assistant_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    source_assistant = db.query(Assistant).filter(Assistant.id == assistant_id).first()
    if not source_assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
        
    try:
        # Cargar el YAML actual
        yaml_data = yaml.safe_load(source_assistant.yaml_content)
        
        # Obtener título y autor del asistente original
        original_title = yaml_data.get('metadata', {}).get('description', {}).get('title', 'Untitled Assistant')
        original_author = yaml_data.get('metadata', {}).get('author', {}).get('name', 'Unknown Author')
        
        # Modificar el título y el historial
        current_date = datetime.utcnow()
        
        # Añadir "(copy)" al título
        if 'metadata' in yaml_data and 'description' in yaml_data['metadata']:
            title = yaml_data['metadata']['description'].get('title', 'Untitled Assistant')
            yaml_data['metadata']['description']['title'] = f"{title} (copy)"
        
        # Reiniciar el historial con solo la entrada de clonación
        if 'metadata' not in yaml_data:
            yaml_data['metadata'] = {}
            
        # Crear nueva entrada de historial con información del original
        clone_message = f"Cloned from '{original_title}' by {original_author}"
        yaml_data['metadata']['history'] = [
            format_history_entry("clone", current_user.full_name or current_user.username, current_date) + f" ({clone_message})"
        ]
        
        # Eliminar campos redundantes
        yaml_data = clean_redundant_history_fields(yaml_data)
        
        # Convertir de vuelta a YAML
        new_yaml_content = yaml.dump(yaml_data, allow_unicode=True)
        
        # Crear nuevo asistente
        new_assistant = Assistant(
            user_id=current_user.id,
            title=yaml_data['metadata']['description'].get('title', 'Untitled Assistant'),
            yaml_content=new_yaml_content,
            is_public=source_assistant.is_public,
            created_by=current_user.username,
            forked_from=assistant_id
        )
        
        db.add(new_assistant)
        db.commit()
        
        return {"message": "Assistant cloned successfully", "id": new_assistant.id}
    except Exception as e:
        logger.error(f"Error cloning assistant {assistant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{assistant_id}/import")
async def import_assistant(
    assistant_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    source_assistant = db.query(Assistant).filter(Assistant.id == assistant_id).first()
    if not source_assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
        
    try:
        # Cargar el YAML actual
        yaml_data = yaml.safe_load(source_assistant.yaml_content)
        
        # Set import timestamp
        current_date = datetime.utcnow()
        
        # Initialize metadata if not present
        if 'metadata' not in yaml_data:
            yaml_data['metadata'] = {}
            yaml_data['metadata']['history'] = []
            
        # Add import entry to history
        yaml_data['metadata']['history'].append(
            format_history_entry("import", current_user.username, current_date)
        )
        
        # Eliminar campos redundantes
        yaml_data = clean_redundant_history_fields(yaml_data)
        
        # Convert back to YAML
        updated_yaml = yaml.dump(yaml_data, allow_unicode=True)
        
        # Create new assistant
        new_assistant = Assistant(
            user_id=current_user.id,
            title=source_assistant.title,
            yaml_content=updated_yaml,
            is_public=source_assistant.is_public,
            created_by=current_user.username,
            forked_from=assistant_id
        )
        
        db.add(new_assistant)
        db.commit()
        
        # Update original assistant's remixed_by field
        if source_assistant.remixed_by:
            source_assistant.remixed_by += f"{current_user.username}, "
        else:
            source_assistant.remixed_by = f"{current_user.username}, "
        db.commit()
        
        return {"message": "Assistant imported successfully", "id": new_assistant.id}
    except Exception as e:
        logger.error(f"Error importing assistant {assistant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{assistant_id}/increment-downloads")
async def increment_downloads(
    assistant_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    try:
        assistant = db.query(Assistant).filter(Assistant.id == assistant_id).first()
        if not assistant:
            raise HTTPException(status_code=404, detail="Assistant not found")
            
        assistant.downloads += 1
        db.commit()
        
        return {"message": "Downloads incremented successfully"}
    except Exception as e:
        logger.error(f"Error incrementing downloads for assistant {assistant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{assistant_id}/yaml")
async def update_assistant_yaml(
    assistant_id: int,
    request: Request,
    yaml_data: dict = Body(...),
    db: Session = Depends(get_db)
):
    """Update an assistant's YAML content"""
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    assistant = db.query(Assistant).filter(Assistant.id == assistant_id).first()
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
        
    # Verificar que el usuario es el propietario
    if assistant.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this assistant")

    try:
        # Obtener el contenido YAML y el título
        yaml_content = yaml_data['yaml_content']
        parsed_yaml = yaml.safe_load(yaml_content)
        new_title = parsed_yaml.get('metadata', {}).get('description', {}).get('title', 'Untitled Assistant')
        
        # Actualizar el valor de is_public según el YAML
        is_public = parsed_yaml.get('metadata', {}).get('visibility', {}).get('is_public', True)
        
        # Asegurarse de que el historial existe
        if 'metadata' not in parsed_yaml:
            parsed_yaml['metadata'] = {}
        if 'history' not in parsed_yaml['metadata']:
            parsed_yaml['metadata']['history'] = []
            
        # Eliminar campos redundantes
        parsed_yaml = clean_redundant_history_fields(parsed_yaml)
        
        # Actualizar el YAML
        updated_yaml = yaml.dump(parsed_yaml, allow_unicode=True)
        
        # Crear nuevo asistente si se solicita
        if yaml_data.get('create_new_version'):
            # Añadir entrada de versión al historial
            current_date = datetime.utcnow()
            parsed_yaml['metadata']['history'].append(
                format_history_entry("version", current_user.username, current_date)
            )
            
            # Actualizar el YAML con la nueva entrada de historial
            updated_yaml = yaml.dump(parsed_yaml, allow_unicode=True)
            
            new_assistant = Assistant(
                user_id=current_user.id,
                title=new_title,
                yaml_content=updated_yaml,
                is_public=is_public,
                created_by=current_user.username,
                forked_from=assistant_id
            )
            db.add(new_assistant)
            db.commit()
            
            # Actualizar el campo remixed_by del asistente original
            if assistant.remixed_by:
                assistant.remixed_by += f"{current_user.username}, "
            else:
                assistant.remixed_by = f"{current_user.username}, "
            db.commit()
            
            return {"message": "New version created successfully", "id": new_assistant.id}
        
        # Actualizar el asistente existente
        assistant.yaml_content = updated_yaml
        assistant.title = new_title
        assistant.is_public = is_public
        db.commit()
        
        return {"message": "Assistant updated successfully"}
    except Exception as e:
        logger.error(f"Error updating assistant {assistant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
