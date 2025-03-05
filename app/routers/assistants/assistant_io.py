from fastapi import APIRouter, Depends, HTTPException, Request, File, UploadFile
from fastapi.responses import Response, RedirectResponse
from sqlalchemy.orm import Session
from ...database.database import get_db
from ...database.models import Assistant, User
from ..auth import get_current_user
from ...utils.assistant_loader import create_assistant_from_yaml
import yaml
import logging
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/import")
async def import_assistant(
    file: UploadFile,
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user:
        return {"status": "error", "message": "Not authenticated"}
    
    try:
        content = await file.read()
        yaml_content = content.decode()
        
        # Validate YAML format
        try:
            yaml_data = yaml.safe_load(yaml_content)
        except yaml.YAMLError as e:
            logger.error(f"Invalid YAML format: {str(e)}")
            return {"status": "error", "message": "Invalid YAML format"}
            
        assistant = create_assistant_from_yaml(db, current_user.id, yaml_content)
        db.add(assistant)
        db.commit()
        
        return {"status": "success", "message": "Assistant imported successfully", "id": assistant.id}
    except Exception as e:
        logger.error(f"Error importing assistant: {str(e)}")
        return {"status": "error", "message": str(e)}

@router.get("/try-demo")
async def try_demo(
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user:
        return {"status": "error", "message": "Not authenticated"}
    
    try:
        demo_path = Path("app/data/demo_assistant.yaml")
        if not demo_path.exists():
            logger.error("Demo assistant file not found")
            return {"status": "error", "message": "Demo assistant file not found"}
        
        with open(demo_path, 'r') as file:
            yaml_content = file.read()
            
        assistant = create_assistant_from_yaml(db, current_user.id, yaml_content)
        db.add(assistant)
        db.commit()
        
        return {"status": "success", "message": "Demo assistant imported successfully"}
    except Exception as e:
        logger.error(f"Error importing demo assistant: {str(e)}")
        return {"status": "error", "message": str(e)}

@router.get("/{assistant_id}/export")
async def export_assistant(
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
        
    try:
        yaml_data = yaml.safe_load(assistant.yaml_content)
        return yaml_data
    except Exception as e:
        logger.error(f"Error exporting assistant {assistant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error exporting assistant")

@router.get("/assistant/{assistant_id}/yaml")
async def get_assistant_yaml(
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
        
    return {"yaml_content": assistant.yaml_content}

@router.get("/assistant/{assistant_id}/download")
async def download_assistant_yaml(
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
        
    response = Response(content=assistant.yaml_content)
    response.headers["Content-Disposition"] = f'attachment; filename="{assistant.title}.yaml"'
    response.headers["Content-Type"] = "application/x-yaml"
    
    return response
