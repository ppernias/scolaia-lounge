from pathlib import Path
from typing import Optional
from sqlalchemy.orm import Session
import yaml
import jsonschema
from ..database.models import Assistant, User
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def validate_tools_structure(data: dict) -> list:
    """Validate tools structure and return list of missing display_names"""
    missing = []
    tools = data.get('assistant_instructions', {}).get('tools', {})
    
    # Check commands
    for cmd_name, cmd_data in tools.get('commands', {}).items():
        if not isinstance(cmd_data, dict):
            continue
        if 'display_name' not in cmd_data:
            missing.append(f"Command {cmd_name} missing display_name")
            
    # Check options
    for opt_name, opt_data in tools.get('options', {}).items():
        if not isinstance(opt_data, dict):
            continue
        if 'display_name' not in opt_data:
            missing.append(f"Option {opt_name} missing display_name")
            
    # Check decorators
    for dec_name, dec_data in tools.get('decorators', {}).items():
        if not isinstance(dec_data, dict):
            continue
        if 'display_name' not in dec_data:
            missing.append(f"Decorator {dec_name} missing display_name")
            
    return missing

def create_assistant_from_yaml(
    db: Session,
    user_id: int,
    yaml_content: str,
) -> Optional[Assistant]:
    """
    Creates an assistant from YAML content after validating against schema
    """
    try:
        # Verify user exists and has permissions
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
            
        # Clean up the YAML content
        yaml_content = yaml_content.strip()
        yaml_content = yaml_content.replace('\r\n', '\n')
        
        # Log the cleaned YAML content for debugging
        logger.error("Attempting to parse cleaned YAML content:")
        logger.error("----------------------------------------")
        lines = yaml_content.split('\n')
        for i, line in enumerate(lines, 1):
            logger.error(f"{i:03d}: {line}")
        logger.error("----------------------------------------")
            
        # Parse YAML content with detailed error handling
        try:
            if not isinstance(yaml_content, str):
                yaml_content = yaml_content.decode('utf-8')
                
            if yaml_content.startswith('\ufeff'):
                yaml_content = yaml_content[1:]
                
            try:
                from ruamel.yaml import YAML
                yaml_parser = YAML(typ='safe')
                yaml_parser.preserve_quotes = True
                assistant_data = yaml_parser.load(yaml_content)
            except ImportError:
                assistant_data = yaml.safe_load(yaml_content)
                
            if not isinstance(assistant_data, dict):
                raise yaml.YAMLError("YAML content must be a dictionary")
                
            # Check for missing display_names before schema validation
            missing_display_names = validate_tools_structure(assistant_data)
            if missing_display_names:
                logger.error("Missing display_name fields:")
                for msg in missing_display_names:
                    logger.error(f"  - {msg}")
                raise ValueError("Some commands/options are missing display_name field")
                
        except yaml.YAMLError as e:
            if hasattr(e, 'problem_mark'):
                mark = e.problem_mark
                context = yaml_content.split('\n')
                start = max(0, mark.line - 5)
                end = min(len(context), mark.line + 6)
                context_lines = '\n'.join(f"{i+1}: {line}" for i, line in enumerate(context[start:end]))
                logger.error(f"YAML Error at line {mark.line + 1}, column {mark.column + 1}:")
                logger.error(f"Problem: {getattr(e, 'problem', 'Unknown problem')}")
                logger.error(f"Context:\n{context_lines}")
            raise
            
        # Ensure metadata and visibility exist
        if 'metadata' not in assistant_data:
            assistant_data['metadata'] = {}
        if 'visibility' not in assistant_data['metadata']:
            assistant_data['metadata']['visibility'] = {'is_public': True}
        elif 'is_public' not in assistant_data['metadata']['visibility']:
            assistant_data['metadata']['visibility']['is_public'] = True
            
        # Convert back to YAML with the added fields
        try:
            from ruamel.yaml import YAML
            yaml_parser = YAML()
            yaml_parser.preserve_quotes = True
            yaml_parser.allow_unicode = True
            from io import StringIO
            stream = StringIO()
            yaml_parser.dump(assistant_data, stream)
            yaml_content = stream.getvalue()
        except ImportError:
            yaml_content = yaml.dump(assistant_data, default_flow_style=False, allow_unicode=True)
            
        # Load and validate against schema
        schema_path = Path("schema.yaml")
        if not schema_path.exists():
            raise FileNotFoundError("Schema file not found")
            
        with schema_path.open() as f:
            schema = yaml.safe_load(f)
            
        # Validate against schema with detailed error handling
        try:
            jsonschema.validate(instance=assistant_data, schema=schema)
        except jsonschema.exceptions.ValidationError as e:
            logger.error(f"Schema validation error at path: {' -> '.join(str(p) for p in e.path)}")
            logger.error(f"Schema validation error: {e.message}")
            logger.error(f"Failed validating '{e.validator}' in schema: {e.schema_path}")
            raise
            
        # Extract metadata
        metadata = assistant_data.get('metadata', {})
        description = metadata.get('description', {})
        
        # Extract title
        title = description.get('title')
        if not title:
            raise ValueError("Title is required in metadata.description.title")
            
        # Get visibility setting
        is_public = metadata.get('visibility', {}).get('is_public', True)
            
        # Create assistant
        assistant = Assistant(
            user_id=user_id,
            title=title,
            yaml_content=yaml_content,
            downloads=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            is_public=is_public
        )
        
        return assistant
        
    except (yaml.YAMLError, jsonschema.exceptions.ValidationError) as e:
        logger.error(f"Validation error: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise
