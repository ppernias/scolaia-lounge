from fastapi import APIRouter, Request, Depends, Cookie
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
import yaml
from datetime import datetime

from ..database.database import get_db
from ..database.models import Assistant
from ..utils.filters import datetime_filter, shortdate_filter
from .auth import get_current_user

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")
templates.env.filters["datetime"] = datetime_filter
templates.env.filters["shortdate"] = shortdate_filter

@router.get("/collection")
async def list_collection(
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user:
        return RedirectResponse(url="/auth/login")
    
    # Obtener asistentes que el usuario ha añadido a su colección
    # usando la tabla de relaciones
    sql = text("""
        SELECT a.* FROM assistants a 
        JOIN user_assistant_collections uac ON a.id = uac.assistant_id 
        WHERE uac.user_id = :user_id
        ORDER BY a.updated_at DESC
    """)
    db_assistants = db.query(Assistant).from_statement(sql).params(user_id=current_user.id).all()
    
    # Procesar los asistentes para incluir la metadata
    assistants = []
    for assistant in db_assistants:
        try:
            yaml_data = yaml.safe_load(assistant.yaml_content)
            
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
                'tools': tools
            })
        except Exception as e:
            print(f"Error processing assistant {assistant.id}: {str(e)}")
            continue
    
    return templates.TemplateResponse(
        "pages/collection/mycollection.html",
        {
            "request": request,
            "assistants": assistants,
            "current_user": current_user
        }
    )
