#!/usr/bin/env python3

import os
import yaml
from pathlib import Path
from app.utils.defaults_manager import DefaultsManager, get_defaults_manager

def test_defaults_manager():
    print("\n=== Probando DefaultsManager ===\n")
    
    # Obtener la ruta del esquema
    base_dir = os.path.dirname(os.path.abspath(__file__))
    schema_path = os.path.join(base_dir, "schema.yaml")
    
    # Crear una instancia de DefaultsManager
    defaults_manager = DefaultsManager(schema_path)
    
    # Cargar el esquema
    print("Cargando esquema...")
    schema = defaults_manager.load_schema()
    print(f"Esquema cargado correctamente. Tipo: {type(schema)}")
    
    # Extraer valores predeterminados
    print("\nExtrayendo valores predeterminados...")
    defaults = defaults_manager.extract_defaults_from_schema(schema)
    print("Valores predeterminados extraídos correctamente.")
    
    # Mostrar algunos valores predeterminados
    print("\nAlgunos valores predeterminados:")
    for key, value in list(defaults.items())[:5]:  # Mostrar solo los primeros 5 para no saturar la salida
        print(f"  {key}: {value}")
    
    # Probar get_defaults
    print("\nProbando get_defaults()...")
    all_defaults = defaults_manager.get_defaults()
    print(f"get_defaults() devolvió correctamente un objeto de tipo: {type(all_defaults)}")
    
    # Probar get_default con una ruta específica
    print("\nProbando get_default() con una ruta específica...")
    try:
        # Intentar obtener un valor predeterminado que debería existir en el esquema
        educational_level = defaults_manager.get_default("metadata.description.educational_level")
        print(f"Valor predeterminado para 'metadata.description.educational_level': {educational_level}")
        
        # Intentar obtener un valor predeterminado para el campo on_tool
        on_tool = defaults_manager.get_default("assistant_instructions.behavior.on_tool")
        print(f"Valor predeterminado para 'assistant_instructions.behavior.on_tool': {on_tool}")
    except Exception as e:
        print(f"Error al obtener valor predeterminado: {str(e)}")
    
    print("\n=== Prueba de DefaultsManager completada ===\n")

def main():
    test_defaults_manager()

if __name__ == "__main__":
    main()
