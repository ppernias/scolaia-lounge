from pathlib import Path
import yaml
from typing import Dict, Any, Optional
from functools import lru_cache
import os
import jsonschema

class DefaultsManager:
    """Manages default settings loaded from defaults.yaml"""
    
    def __init__(self, defaults_path: str = "defaults.yaml", schema_path: str = None):
        self.defaults_path = Path(defaults_path).resolve()
        if schema_path is None:
            # Si no se proporciona ruta al schema, usar la del directorio raíz
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            schema_path = os.path.join(base_dir, "schema.yaml")
        self.schema_path = Path(schema_path).resolve()
        self._defaults: Optional[Dict[str, Any]] = None
        self._schema: Optional[Dict[str, Any]] = None

    def load_schema(self) -> Dict[str, Any]:
        """Load schema from YAML file"""
        if not self._schema:
            try:
                with self.schema_path.open('r') as f:
                    self._schema = yaml.safe_load(f)
            except Exception as e:
                print(f"Error loading schema from {self.schema_path}: {str(e)}")
                raise
        return self._schema

    @lru_cache(maxsize=1)
    def load_defaults(self) -> Dict[str, Any]:
        """Load defaults from YAML file with caching"""
        if not self._defaults:
            try:
                # Cargar schema primero
                schema = self.load_schema()
                
                # Cargar y validar defaults
                with self.defaults_path.open('r') as f:
                    defaults = yaml.safe_load(f)
                    jsonschema.validate(instance=defaults, schema=schema)
                    self._defaults = defaults
                    
            except jsonschema.exceptions.ValidationError as e:
                print(f"Validation error in defaults: {str(e)}")
                raise
            except Exception as e:
                print(f"Error loading defaults from {self.defaults_path}: {str(e)}")
                raise
        return self._defaults

    def get_defaults(self) -> Dict[str, Any]:
        """Get all defaults"""
        return self.load_defaults()

    def get_default(self, path: str, default: Any = None) -> Any:
        """Get a default value using dot notation path"""
        defaults = self.load_defaults()
        keys = path.split('.')
        value = defaults
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default
                
        return value

    def merge_with_defaults(self, user_config: Dict[str, Any]) -> Dict[str, Any]:
        """Merge user configuration with defaults. User values take precedence."""
        defaults = self.load_defaults()
        
        def deep_merge(defaults: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
            """Merge defaults with user config, user values take precedence"""
            result = defaults.copy()
            
            for key, value in user.items():
                if key in result and isinstance(value, dict) and isinstance(result[key], dict):
                    # Si ambos son diccionarios, hacer merge recursivo
                    result[key] = deep_merge(result[key], value)
                else:
                    # En cualquier otro caso, el valor del usuario prevalece
                    result[key] = value
            return result
            
        return deep_merge(defaults, user_config)

    def clean_yaml(self, yaml_content: str) -> str:
        """Clean YAML content by removing extra blank lines while preserving indentation and markdown format"""
        lines = yaml_content.splitlines()
        cleaned_lines = []
        prev_empty = False
        in_markdown_block = False
        current_indent = ""
        markdown_content = []
        
        for line in lines:
            # Detectar si estamos en un bloque de contenido markdown (como el campo 'role')
            stripped_line = line.strip()
            if stripped_line.startswith('role:'):
                in_markdown_block = True
                current_indent = ' ' * (len(line) - len(line.lstrip()))
                cleaned_lines.append(line.rstrip())
                continue
            
            # Si estamos en un bloque markdown
            if in_markdown_block:
                # Si encontramos una nueva clave YAML (detectada por la indentación)
                if stripped_line and not line.startswith(current_indent + ' '):
                    # Procesar el bloque markdown acumulado
                    if markdown_content:
                        # Limpiar líneas en blanco extra en el contenido markdown
                        md_lines = []
                        prev_md_empty = False
                        for md_line in markdown_content:
                            is_md_empty = not md_line.strip()
                            if not (is_md_empty and prev_md_empty):
                                md_lines.append(md_line)
                            prev_md_empty = is_md_empty
                        
                        # Eliminar líneas en blanco al inicio y final del markdown
                        while md_lines and not md_lines[0].strip():
                            md_lines.pop(0)
                        while md_lines and not md_lines[-1].strip():
                            md_lines.pop()
                            
                        # Añadir el contenido markdown limpio
                        cleaned_lines.extend(md_lines)
                    
                    in_markdown_block = False
                    markdown_content = []
                    cleaned_lines.append(line.rstrip())
                else:
                    markdown_content.append(line)
                continue
            
            # Para líneas normales de YAML
            is_empty = not stripped_line
            if not (is_empty and prev_empty):
                cleaned_lines.append(line.rstrip())
            prev_empty = is_empty
        
        # Procesar último bloque markdown si existe
        if in_markdown_block and markdown_content:
            md_lines = []
            prev_md_empty = False
            for md_line in markdown_content:
                is_md_empty = not md_line.strip()
                if not (is_md_empty and prev_md_empty):
                    md_lines.append(md_line)
                prev_md_empty = is_md_empty
            
            while md_lines and not md_lines[0].strip():
                md_lines.pop(0)
            while md_lines and not md_lines[-1].strip():
                md_lines.pop()
                
            cleaned_lines.extend(md_lines)
        
        # Eliminar líneas en blanco al inicio y final del documento
        while cleaned_lines and not cleaned_lines[0].strip():
            cleaned_lines.pop(0)
        while cleaned_lines and not cleaned_lines[-1].strip():
            cleaned_lines.pop()
        
        return '\n'.join(cleaned_lines) + '\n'

    def save_defaults(self, new_defaults: Dict[str, Any]) -> None:
        """Save new defaults to YAML file after validation"""
        try:
            # Validate against schema
            schema = self.load_schema()
            jsonschema.validate(instance=new_defaults, schema=schema)
            
            # Convert to YAML and clean it
            yaml_content = yaml.safe_dump(new_defaults, default_flow_style=False, sort_keys=False)
            cleaned_yaml = self.clean_yaml(yaml_content)
            
            # Save cleaned YAML to file
            with self.defaults_path.open('w') as f:
                f.write(cleaned_yaml)
            
            # Clear cache to force reload
            self.load_defaults.cache_clear()
            self._defaults = None
            
        except jsonschema.exceptions.ValidationError as e:
            print(f"Validation error in new defaults: {str(e)}")
            raise
        except Exception as e:
            print(f"Error saving defaults to {self.defaults_path}: {str(e)}")
            raise

    def get_editable_fields(self) -> Dict[str, dict]:
        """Returns a dictionary of fields that currently have content with their type information"""
        defaults = self.load_defaults()
        editable = {}
        
        def get_value_type(value):
            if isinstance(value, list):
                return 'list'
            elif isinstance(value, bool):
                return 'boolean'
            elif isinstance(value, (int, float)):
                return 'number'
            else:
                return 'text'
        
        def get_display_key(key: str) -> str:
            """Convert dot notation key to a more readable format"""
            # Remove common prefixes
            key = key.replace('assistant_instructions.', '')
            key = key.replace('metadata.', '')
            
            # Replace dots with spaces and capitalize words
            parts = key.split('.')
            return ' › '.join(part.replace('_', ' ').title() for part in parts)
        
        def extract_non_empty(d: Dict[str, Any], parent_key: str = ""):
            for key, value in d.items():
                current_key = f"{parent_key}.{key}" if parent_key else key
                if isinstance(value, dict):
                    extract_non_empty(value, current_key)
                elif value:  # Only include non-empty values
                    editable[current_key] = {
                        'value': value,
                        'type': get_value_type(value),
                        'display_key': get_display_key(current_key)
                    }
        
        extract_non_empty(defaults)
        return editable

# Singleton instance
_defaults_manager = None

def get_defaults_manager(defaults_path: str = None, schema_path: str = None) -> DefaultsManager:
    """Get or create the DefaultsManager singleton"""
    global _defaults_manager
    if not _defaults_manager:
        if defaults_path is None:
            # Si no se proporciona ruta, usar la ruta por defecto en el directorio raíz del proyecto
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            defaults_path = os.path.join(base_dir, "defaults.yaml")
        _defaults_manager = DefaultsManager(defaults_path, schema_path)
    return _defaults_manager