#!/usr/bin/env python3

from app.utils.defaults_manager import get_defaults_manager
import yaml
import json

# Obtener el DefaultsManager
defaults_manager = get_defaults_manager()

# Cargar los valores predeterminados
defaults = defaults_manager.load_defaults()

# Imprimir los valores predeterminados en formato JSON para ver la estructura completa
print("\nEstructura completa de los valores predeterminados:")
print(json.dumps(defaults, indent=2))

# Verificar específicamente las herramientas
print("\nVerificando estructura de herramientas:")
if 'assistant_instructions' in defaults and 'tools' in defaults['assistant_instructions']:
    tools = defaults['assistant_instructions']['tools']
    print("Herramientas encontradas en assistant_instructions.tools:")
    print(json.dumps(tools, indent=2))
else:
    print("No se encontraron herramientas en assistant_instructions.tools")

# Verificar el campo prompt_visibility
print("\nVerificando campo prompt_visibility:")
if 'assistant_instructions' in defaults and 'behavior' in defaults['assistant_instructions']:
    behavior = defaults['assistant_instructions']['behavior']
    if 'prompt_visibility' in behavior:
        print("prompt_visibility encontrado:", behavior['prompt_visibility'])
    else:
        print("No se encontró prompt_visibility en behavior")
else:
    print("No se encontró la estructura assistant_instructions.behavior")
