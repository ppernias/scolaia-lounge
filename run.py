#!/usr/bin/env python3
import os
from pathlib import Path

def main():
    # Asegurarse de que estamos en el directorio correcto
    script_dir = Path(__file__).parent.absolute()
    os.chdir(script_dir)
    
    print("Iniciando servidor...")
    try:
        from app.main import app
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8000)
    except Exception as e:
        print(f"Error iniciando el servidor: {e}")

if __name__ == "__main__":
    main()
