from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse
import yaml
import os
from pathlib import Path
from typing import Dict, Any
from app.utils.defaults_manager import get_defaults_manager

router = APIRouter()

@router.get("/defaults", response_class=PlainTextResponse)
async def get_defaults():
    try:
        # Usar el DefaultsManager para obtener los valores predeterminados del schema.yaml
        defaults_manager = get_defaults_manager()
        defaults = defaults_manager.load_defaults()
        
        # Convertir a formato YAML
        yaml_content = yaml.safe_dump(defaults, default_flow_style=False, sort_keys=False)
        
        return yaml_content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading defaults from schema: {str(e)}")
