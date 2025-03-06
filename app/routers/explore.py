from fastapi import APIRouter, Request, Depends, Query, Cookie
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from typing import List, Optional
from sqlalchemy.orm import Session
import yaml
from datetime import datetime
from sqlalchemy import func, text

from ..database.database import get_db
from ..database.models import Assistant, AssistantLike, User, UserAssistantCollection
from ..utils.filters import datetime_filter
from .auth import get_current_user, get_current_user_optional
from ..utils.history_utils import extract_dates_from_history

router = APIRouter(prefix="/explore", tags=["explore"])

templates = Jinja2Templates(directory="app/templates")
templates.env.filters["datetime"] = datetime_filter

# Define the ordered list of educational levels
ORDERED_EDUCATIONAL_LEVELS = [
    "Postgraduate Higher Education",
    "Undergraduate Higher Education",
    "Technical / Vocational Education",
    "Upper Secondary Education",
    "Lower Secondary Education",
    "Primary Education",
    "Pre-School / Early Childhood Education",
    "Professional Development / Continuing Education",
    "other"
]

# Mapping of possible variations to standardized names
EDUCATIONAL_LEVEL_MAPPING = {
    "Educación Universitaria": "Undergraduate Higher Education",
    "Universidad": "Undergraduate Higher Education",
    "University": "Undergraduate Higher Education",
    "Higher Education": "Undergraduate Higher Education",
    # Add more mappings as needed
}

def normalize_text(text: str) -> str:
    """Normaliza el texto para búsqueda insensible a mayúsculas/minúsculas y acentos"""
    if not isinstance(text, str):
        return ""
        
    text = text.lower()
    replacements = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'à': 'a', 'è': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u',
        'ä': 'a', 'ë': 'e', 'ï': 'i', 'ö': 'o', 'ü': 'u',
        'â': 'a', 'ê': 'e', 'î': 'i', 'ô': 'o', 'û': 'u',
        'ñ': 'n'
    }
    for acc, normal in replacements.items():
        text = text.replace(acc, normal)
    return text

@router.get("")  # Ruta base para /explore
async def explore(
    request: Request,
    search: Optional[str] = None,
    language: Optional[str] = None,
    db: Session = Depends(get_db),
    session: Optional[str] = Cookie(None)
):
    """
    Explore page with search functionality
    """
    current_user = get_current_user(db, session) if session else None
    
    # Join with users table to ensure we only show assistants from existing users
    query = db.query(Assistant).join(
        User, Assistant.user_id == User.id
    ).filter(
        Assistant.is_public == True  # Only show public assistants
    )
    
    if search and search.lower() != "none":
        search_normalized = normalize_text(search)
        # Usar la función lower() de SQL para hacer la búsqueda insensible a mayúsculas/minúsculas
        query = query.filter(
            func.lower(Assistant.yaml_content).like(f"%{search_normalized}%")
        )
    if language and language.lower() != "none":
        query = query.filter(Assistant.yaml_content.ilike(f"%language: {language}%"))
        
    assistants = query.all()
    
    # Procesar el YAML de cada asistente
    processed_assistants = []
    found_educational_levels = set()
    
    for assistant in assistants:
        try:
            yaml_data = yaml.safe_load(assistant.yaml_content)
            metadata = yaml_data.get('metadata', {})
            description = metadata.get('description', {})
            author = metadata.get('author', {})
            
            # Get and standardize educational levels
            raw_levels = description.get('educational_level', [])
            if isinstance(raw_levels, str):
                raw_levels = [raw_levels]
            
            # Map educational levels to standard format
            educational_levels = []
            for level in raw_levels:
                standardized_level = EDUCATIONAL_LEVEL_MAPPING.get(level, level)
                if standardized_level in ORDERED_EDUCATIONAL_LEVELS:
                    educational_levels.append(standardized_level)
                    found_educational_levels.add(standardized_level)
            
            # Extraer fechas del historial
            history = metadata.get('history', [])
            dates = extract_dates_from_history(history)
            
            assistant_dict = {
                'id': assistant.id,
                'user_id': assistant.user_id,
                'metadata': metadata,
                'description': description,
                'title': description.get('title', 'Untitled'),
                'summary': description.get('summary', ''),
                'author': {
                    'name': author.get('name', 'Unknown'),
                    'role': author.get('role', ''),
                    'organization': author.get('organization', '')
                },
                'educational_levels': educational_levels,
                'keywords': description.get('keywords', []),
                'coverage': description.get('coverage', ''),
                'in_collections': assistant.in_collections,
                'likes': assistant.likes,
                'tools': [],
                'created_at': assistant.created_at,
                'updated_at': assistant.updated_at,
                'creation_date': dates['creation_date'],
                'last_update': dates['last_update']
            }

            # Extract tool display names
            tools = yaml_data.get('assistant_instructions', {}).get('tools', {})
            
            # Add command display names
            for cmd_name, cmd_data in tools.get('commands', {}).items():
                if isinstance(cmd_data, dict) and 'display_name' in cmd_data:
                    assistant_dict['tools'].append({
                        'name': cmd_data['display_name'],
                        'type': 'command'
                    })
            
            # Add option display names
            for opt_name, opt_data in tools.get('options', {}).items():
                if isinstance(opt_data, dict) and 'display_name' in opt_data:
                    assistant_dict['tools'].append({
                        'name': opt_data['display_name'],
                        'type': 'option'
                    })
                    
            # Add decorator display names
            for dec_name, dec_data in tools.get('decorators', {}).items():
                if isinstance(dec_data, dict) and 'display_name' in dec_data:
                    assistant_dict['tools'].append({
                        'name': dec_data['display_name'],
                        'type': 'decorator'
                    })

            processed_assistants.append(assistant_dict)
        except Exception as e:
            print(f"Error processing YAML for assistant {assistant.id}: {e}")
            continue

    if search and search.lower() != "none":
        search_terms = search.lower().split()
        filtered_assistants = []
        
        for assistant in processed_assistants:
            matches = False
            search_text = (
                assistant['title'].lower() + ' ' +
                ' '.join(assistant['keywords']).lower() + ' ' +
                assistant['author']['name'].lower() + ' ' +
                assistant['author']['organization'].lower() + ' ' +
                assistant['author']['role'].lower()
            )
            
            # Un asistente coincide si contiene todos los términos de búsqueda
            if all(term in search_text for term in search_terms):
                matches = True
            
            if matches:
                filtered_assistants.append(assistant)
        
        processed_assistants = filtered_assistants

    # Filter and order the educational levels
    educational_levels_list = [level for level in ORDERED_EDUCATIONAL_LEVELS 
                             if any(level in assistant.get('educational_levels', []) 
                                   for assistant in processed_assistants)]

    return templates.TemplateResponse(
        "pages/explore/explore.html",
        {
            "request": request,
            "assistants": processed_assistants,
            "educational_levels": educational_levels_list,
            "search": search if search and search.lower() != "none" else "",
            "language": language if language and language.lower() != "none" else None,
            "current_user": current_user
        }
    )

@router.get("/assistant/{assistant_id}")
async def get_assistant_details(
    assistant_id: int,
    db: Session = Depends(get_db),
    session: Optional[str] = Cookie(None)
):
    """
    Get detailed information about an assistant for the modal view
    """
    current_user = get_current_user(db, session) if session else None
    
    assistant = db.query(Assistant).filter(Assistant.id == assistant_id).first()
    if not assistant:
        return JSONResponse(status_code=404, content={"error": "Assistant not found"})
    
    # Verify the assistant is public or the user is the owner
    if not assistant.is_public and (not current_user or assistant.user_id != current_user.id):
        return JSONResponse(status_code=403, content={"error": "You don't have permission to view this assistant"})
    
    try:
        yaml_data = yaml.safe_load(assistant.yaml_content)
        metadata = yaml_data.get('metadata', {})
        description = metadata.get('description', {})
        author = metadata.get('author', {})
        
        # Extraer fechas del historial
        history = metadata.get('history', [])
        dates = extract_dates_from_history(history)
        
        # Get educational levels
        raw_levels = description.get('educational_level', [])
        if isinstance(raw_levels, str):
            raw_levels = [raw_levels]
        
        # Map educational levels to standard format
        educational_levels = []
        for level in raw_levels:
            standardized_level = EDUCATIONAL_LEVEL_MAPPING.get(level, level)
            if standardized_level in ORDERED_EDUCATIONAL_LEVELS:
                educational_levels.append(standardized_level)
        
        # Check if the user has this assistant in their collection
        in_collection = False
        if current_user:
            collection_entry = db.query(UserAssistantCollection).filter(
                UserAssistantCollection.user_id == current_user.id,
                UserAssistantCollection.assistant_id == assistant_id
            ).first()
            in_collection = collection_entry is not None
        
        # Check if the user has liked this assistant
        has_liked = False
        if current_user:
            like_entry = db.query(AssistantLike).filter(
                AssistantLike.user_id == current_user.id,
                AssistantLike.assistant_id == assistant_id
            ).first()
            has_liked = like_entry is not None
        
        return {
            'id': assistant.id,
            'title': description.get('title', 'Untitled'),
            'summary': description.get('summary', ''),
            'author': {
                'name': author.get('name', 'Unknown'),
                'role': author.get('role', ''),
                'organization': author.get('organization', '')
            },
            'educational_levels': educational_levels,
            'keywords': description.get('keywords', []),
            'coverage': description.get('coverage', ''),
            'in_collection': in_collection,
            'has_liked': has_liked,
            'likes': assistant.likes,
            'created_at': assistant.created_at,
            'updated_at': assistant.updated_at,
            'creation_date': dates['creation_date'],
            'last_update': dates['last_update'],
            'history': history,
            'metadata': {
                'rights': metadata.get('rights', 'Not specified')
            },
            'yaml_content': assistant.yaml_content
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Error processing assistant: {str(e)}"})

@router.post("/assistant/{assistant_id}/add")
async def add_assistant_to_collection(
    assistant_id: int,
    db: Session = Depends(get_db),
    session: Optional[str] = Cookie(None)
):
    """
    Add an assistant to the user's collection
    """
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
    
    # Validar si el usuario es el autor
    if assistant.user_id == current_user.id:
        return JSONResponse(
            status_code=400,
            content={"detail": "The author cannot add their own assistants to their collection because they are already included in it."}
        )
    
    try:
        # Verificar si ya está en la colección
        check_sql = text("""
            SELECT 1 FROM user_assistant_collections 
            WHERE user_id = :user_id AND assistant_id = :assistant_id
        """)
        existing = db.execute(
            check_sql,
            {"user_id": current_user.id, "assistant_id": assistant_id}
        ).fetchone()
        
        if existing:
            return JSONResponse(
                status_code=400,
                content={"detail": "Assistant is already in your collection"}
            )
        
        # Añadir a la colección
        insert_sql = text("""
            INSERT INTO user_assistant_collections (user_id, assistant_id)
            VALUES (:user_id, :assistant_id)
        """)
        db.execute(
            insert_sql,
            {"user_id": current_user.id, "assistant_id": assistant_id}
        )
        
        # Incrementar el contador de in_collections
        assistant.in_collections = (assistant.in_collections or 0) + 1
        db.commit()
        
        return JSONResponse(
            status_code=200,
            content={
                "message": "Assistant added to your collection successfully!",
                "in_collections": assistant.in_collections
            }
        )
        
    except Exception as e:
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error adding assistant to collection: {str(e)}"}
        )

@router.post("/like/{assistant_id}")
async def like_assistant(
    assistant_id: int,
    db: Session = Depends(get_db),
    session: Optional[str] = Cookie(None)
):
    """
    Toggle like status for an assistant. If already liked, remove the like.
    If not liked, add a new like.
    """
    current_user = get_current_user(db, session)
    if not current_user:
        return JSONResponse(status_code=401, content={"error": "Authentication required"})

    assistant = db.query(Assistant).filter(Assistant.id == assistant_id).first()
    if not assistant:
        return JSONResponse(status_code=404, content={"error": "Assistant not found"})

    # Check if user is trying to like their own assistant
    if assistant.user_id == current_user.id:
        return JSONResponse(
            status_code=400,
            content={"error": "You cannot like your own assistant"}
        )

    # Check if user has already liked this assistant
    existing_like = db.query(AssistantLike).filter(
        AssistantLike.user_id == current_user.id,
        AssistantLike.assistant_id == assistant_id
    ).first()

    try:
        if existing_like:
            # Remove like
            db.delete(existing_like)
            assistant.likes = max(0, (assistant.likes or 1) - 1)
            action = "removed"
        else:
            # Add new like
            new_like = AssistantLike(
                user_id=current_user.id,
                assistant_id=assistant_id
            )
            db.add(new_like)
            assistant.likes = (assistant.likes or 0) + 1
            action = "added"

        db.commit()
        return JSONResponse(content={
            "likes": assistant.likes,
            "action": action
        })
    except Exception as e:
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={"error": f"Error updating like: {str(e)}"}
        )
