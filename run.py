#!/usr/bin/env python3
import os
import argparse
from pathlib import Path

def main():
    # Parsear argumentos de línea de comandos
    parser = argparse.ArgumentParser(description='Iniciar el servidor ScolaIA Lounge')
    parser.add_argument('--port', type=int, default=8000, help='Puerto en el que se ejecutará el servidor (por defecto: 8000)')
    args = parser.parse_args()
    
    # Asegurarse de que estamos en el directorio correcto
    script_dir = Path(__file__).parent.absolute()
    os.chdir(script_dir)
    
    print(f"Iniciando servidor en el puerto {args.port}...")
    try:
        from app.main import app
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=args.port)
    except Exception as e:
        print(f"Error iniciando el servidor: {e}")

if __name__ == "__main__":
    main()
