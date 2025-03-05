from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse
import yaml
import os
from pathlib import Path
from typing import Dict, Any

router = APIRouter()

@router.get("/defaults", response_class=PlainTextResponse)
async def get_defaults():
    try:
        # Get the root directory of the project
        root_dir = Path(__file__).parent.parent.parent.parent
        defaults_path = root_dir / "defaults.yaml"
        
        # Check if file exists
        if not defaults_path.exists():
            raise HTTPException(status_code=404, detail="defaults.yaml not found")
            
        # Read the file as text
        with open(defaults_path, 'r', encoding='utf-8') as file:
            yaml_content = file.read()
            
        # Validate that it's valid YAML
        try:
            yaml.safe_load(yaml_content)
        except yaml.YAMLError as e:
            raise HTTPException(status_code=500, detail=f"Invalid YAML format: {str(e)}")
            
        return yaml_content
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
