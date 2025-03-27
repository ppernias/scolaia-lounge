# APPENDIX: How to apply the Apache License to your work.
#
#    To apply the Apache License to your work, attach the following
#    boilerplate notice, with the fields enclosed by brackets "{}"
#    replaced with your own identifying information. (Don’t include
#    the brackets!)  The text should be enclosed in the appropriate
#    comment syntax for the file format. We also recommend that a
#    file or class name and description of purpose be included on
#    the same "printed page" as the copyright notice for easier
#    identification within third-party archives.
#
#    Copyright 2025 Pedro A. Pernías
#
#    Licensed under the Apache License, Version 2.0 (the "License");
#    you may not use this file except in compliance with the License.
#    You may obtain a copy of the License at
#
#        http://www.apache.org/licenses/LICENSE-2.0
#
#    Unless required by applicable law or agreed to in writing,
#    software distributed under the License is distributed on an
#    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
#    KIND, either express or implied. See the License for the
#    specific language governing permissions and limitations
#    under the License.


from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import FileResponse
from pathlib import Path
import os
from contextlib import asynccontextmanager
from .database.database import init_db, get_db, engine, Base
from .database.models import Setting, User
from sqlalchemy.orm import Session
from .utils.config_ok import check_configuration
from .routers.auth import get_current_user
from .routers import auth, profile, settings, users, assistants, explore, email, collection
from .utils.filters import datetime_filter, shortdate_filter
from .utils.defaults_manager import get_defaults_manager
from urllib.parse import urljoin
import logging
import logging.handlers
import sys

# Configurar logging
def setup_logging():
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # Crear el directorio de logs si no existe
    log_dir = os.path.join(BASE_DIR, "logs")
    os.makedirs(log_dir, exist_ok=True)
    
    # Handler para archivo rotativo
    file_handler = logging.handlers.RotatingFileHandler(
        os.path.join(log_dir, "app.log"),
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.INFO)
    
    # Handler para consola
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    
    # Formato detallado para archivo
    file_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    file_handler.setFormatter(file_formatter)
    
    # Formato más simple para consola
    console_formatter = logging.Formatter(
        '%(levelname)s: %(message)s'
    )
    console_handler.setFormatter(console_formatter)
    
    # Añadir handlers al logger root
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

# Obtener la ruta base del proyecto
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "app/static")

# Asegurarse de que el directorio static existe
os.makedirs(STATIC_DIR, exist_ok=True)

# Inicializar logging
logger = setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Cargar defaults al inicio
    defaults_manager = get_defaults_manager(os.path.join(BASE_DIR, "schema.yaml"))
    defaults_manager.load_defaults()
    
    config_status = check_configuration()
    if not config_status["database_initialized"]:
        raise RuntimeError("Failed to initialize database")
    yield

app = FastAPI(title="Modular Web App", lifespan=lifespan)

# Agregar la ruta del favicon aquí
@app.get('/favicon.ico')
async def favicon():
    favicon_path = os.path.join(BASE_DIR, "app", "static", "favicon.ico")
    return FileResponse(favicon_path)


app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(settings.router)
app.include_router(users.router)
app.include_router(assistants.router)
app.include_router(email.router)
app.include_router(explore.router)
app.include_router(collection.router)

# Configuración para forzar HTTPS en archivos estáticos
class HTTPSStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if hasattr(response, 'headers'):
            response.headers['Content-Security-Policy'] = "upgrade-insecure-requests"
        return response

# Montar archivos estáticos con la nueva configuración
app.mount("/static", HTTPSStaticFiles(directory="app/static"), name="static")
#app.mount("/app/static", StaticFiles(directory=STATIC_DIR), name="static")

templates = Jinja2Templates(directory="app/templates")
templates.env.filters["datetime"] = datetime_filter
templates.env.filters["shortdate"] = shortdate_filter

# Función personalizada para generar URLs seguras
def secure_url_for(request: Request, name: str, path: str = None, **kwargs):
    url = request.url_for(name, **kwargs)
    if path:
        url = urljoin(str(url), path.lstrip('/'))
    # Asegurar que la URL use HTTPS
    if url.startswith('http:'):
        url = 'https:' + url[5:]
    return url

# Función personalizada para generar URLs seguras para archivos estáticos
def secure_static_url(request: Request, path: str):
    # Obtener el dominio base de la request
    base_url = str(request.base_url)
    if base_url.startswith('http:'):
        base_url = 'https:' + base_url[5:]
    
    # Construir la URL completa
    if not path.startswith('/'):
        path = '/' + path
    return urljoin(base_url, f"static{path}")

# Agregar las funciones al contexto global de Jinja2
templates.env.globals['secure_url_for'] = secure_url_for
templates.env.globals['secure_static_url'] = secure_static_url

@app.get("/")
async def home(request: Request, db: Session = Depends(get_db)):
    current_user = get_current_user(db, request.cookies.get("session"))
    return templates.TemplateResponse(
        "pages/home.html",
        {"request": request, "current_user": current_user}
    )

@app.get("/learn-more")
async def learn_more(request: Request, db: Session = Depends(get_db)):
    current_user = get_current_user(db, request.cookies.get("session"))
    return templates.TemplateResponse(
        "pages/learn-more.html",
        {"request": request, "current_user": current_user}
    )

@app.get("/adl")
async def adl_page(request: Request, db: Session = Depends(get_db)):
    current_user = get_current_user(db, request.cookies.get("session"))
    return templates.TemplateResponse(
        "pages/adl.html",
        {"request": request, "current_user": current_user}
    )

@app.get("/adl_reference")
async def adl_reference_page(request: Request, db: Session = Depends(get_db)):
    current_user = get_current_user(db, request.cookies.get("session"))
    return templates.TemplateResponse(
        "pages/adl_reference.html",
        {"request": request, "current_user": current_user}
    )

@app.get("/test/create-setting")
async def create_setting(db: Session = Depends(get_db)):
    """Create an encrypted setting"""
    try:
        setting = Setting(
            category="api",
            key="test_api_key",
            value="sk-test123456789",
            is_encrypted=True
        )
        db.add(setting)
        db.commit()
        return {"message": "Setting created", "value": setting.get_value()}
    except Exception as e:
        return {"error": str(e)}

@app.get("/test/get-setting")
async def get_setting(db: Session = Depends(get_db)):
    """Get the encrypted setting"""
    setting = db.query(Setting).filter_by(key="test_api_key").first()
    if setting:
        return {
            "encrypted": setting.value,
            "decrypted": setting.get_value()
        }
    return {"message": "Setting not found"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 