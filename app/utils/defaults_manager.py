from pathlib import Path
import yaml
from typing import Dict, Any, Optional
from functools import lru_cache
import os
import jsonschema

class DefaultsManager:
    """Manages default settings loaded from schema.yaml"""
    
    def __init__(self, schema_path: str = "schema.yaml"):
        # Usar solo schema.yaml, eliminar la referencia a defaults.yaml
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.schema_path = Path(os.path.join(base_dir, schema_path)).resolve()
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
        """Load defaults from schema.yaml file with caching"""
        if not self._defaults:
            try:
                # Cargar schema primero
                schema = self.load_schema()
                
                # Extraer valores predeterminados del schema
                self._defaults = self.extract_defaults_from_schema(schema)
                    
            except Exception as e:
                print(f"Error loading defaults from {self.schema_path}: {str(e)}")
                raise
        return self._defaults

    def extract_defaults_from_schema(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Extraer valores predeterminados del schema de manera recursiva"""
        defaults = {}
        
        # Procesar propiedades recursivamente
        if 'properties' in schema:
            for prop_name, prop_schema in schema['properties'].items():
                if 'default' in prop_schema:
                    # Caso especial para herramientas (commands, options, decorators)
                    if prop_name in ['commands', 'options', 'decorators'] and isinstance(prop_schema['default'], str):
                        # No almacenar el valor predeterminado directamente, se manejará más adelante
                        pass
                    else:
                        defaults[prop_name] = prop_schema['default']
                elif 'properties' in prop_schema:
                    # Recursión para propiedades anidadas
                    nested_defaults = self.extract_defaults_from_schema(prop_schema)
                    if nested_defaults:
                        defaults[prop_name] = nested_defaults
                elif 'items' in prop_schema and 'properties' in prop_schema['items']:
                    # Manejar arrays de objetos
                    defaults[prop_name] = []
                
                # Caso especial para la sección de herramientas
                if prop_name == 'tools' and 'properties' in prop_schema:
                    tools_defaults = {}
                    
                    # Procesar cada tipo de herramienta (commands, options, decorators)
                    for tool_type, tool_schema in prop_schema['properties'].items():
                        if 'default' in tool_schema and isinstance(tool_schema['default'], str):
                            tool_name = tool_schema['default']
                            
                            # Determinar el prefijo correcto
                            if tool_type == 'commands' or tool_type == 'options':
                                if tool_name.startswith('/'):
                                    name_without_prefix = tool_name[1:]
                                else:
                                    name_without_prefix = tool_name
                                prefix = '/'
                            elif tool_type == 'decorators':
                                if tool_name.startswith('+++'):
                                    name_without_prefix = tool_name[3:]
                                else:
                                    name_without_prefix = tool_name
                                prefix = '+++'
                            else:
                                continue
                            
                            # Obtener las propiedades predeterminadas para esta herramienta
                            if 'additionalProperties' in tool_schema and 'properties' in tool_schema['additionalProperties']:
                                tool_props = tool_schema['additionalProperties']['properties']
                                tool_defaults = {}
                                
                                for tool_prop_name, tool_prop_schema in tool_props.items():
                                    if 'default' in tool_prop_schema:
                                        tool_defaults[tool_prop_name] = tool_prop_schema['default']
                                
                                # Asegurarse de que la estructura de herramientas exista
                                if tool_type not in tools_defaults:
                                    tools_defaults[tool_type] = {}
                                
                                # Agregar esta herramienta a la estructura
                                tools_defaults[tool_type][f"{prefix}{name_without_prefix}"] = tool_defaults
                    
                    # Agregar las herramientas a los valores predeterminados
                    if tools_defaults:
                        defaults['tools'] = tools_defaults
        
        return defaults

    def validate_against_schema(self, data: Dict[str, Any]) -> bool:
        """Validate data against the schema"""
        schema = self.load_schema()
        try:
            jsonschema.validate(instance=data, schema=schema)
            return True
        except jsonschema.exceptions.ValidationError:
            return False

    def get_default(self, key: str, default: Any = None) -> Any:
        """Get a default value by key"""
        defaults = self.load_defaults()
        return defaults.get(key, default)

    def get_nested_default(self, keys: list, default: Any = None) -> Any:
        """Get a nested default value by list of keys"""
        current = self.load_defaults()
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return default
        return current

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

def get_defaults_manager(schema_path: str = None) -> DefaultsManager:
    """Get or create the DefaultsManager singleton"""
    global _defaults_manager
    if not _defaults_manager:
        if schema_path is None:
            # Si no se proporciona ruta, usar la ruta por defecto en el directorio raíz del proyecto
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            schema_path = os.path.join(base_dir, "schema.yaml")
        _defaults_manager = DefaultsManager(schema_path)
    return _defaults_manager