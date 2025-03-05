from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base, Setting
from pathlib import Path

# Definir la ruta de la base de datos
DB_PATH = Path("assistants.db")
DATABASE_URL = f"sqlite:///./{DB_PATH}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Inicializar settings por defecto
    db = SessionLocal()
    default_settings = [
        # General
        {"category": "general", "key": "default_LLM", "value": "none", "is_encrypted": False},
        {"category": "general", "key": "landing_welcome", "value": "Welcome to ScolaIA Lounge", "is_encrypted": False},
        {"category": "general", "key": "owner_email", "value": "", "is_encrypted": False},
        {"category": "general", "key": "owner_name", "value": "", "is_encrypted": False},
        {"category": "general", "key": "owner_organization", "value": "", "is_encrypted": False},
        {"category": "general", "key": "default_ip_license", "value": "CC By-Sa 4.0", "is_encrypted": False},
        
        # Mail
        {"category": "mail", "key": "smtp_server", "value": "", "is_encrypted": False},
        {"category": "mail", "key": "smtp_username", "value": "", "is_encrypted": False},
        {"category": "mail", "key": "smtp_password", "value": "", "is_encrypted": True},
        {"category": "mail", "key": "smtp_fullname", "value": "", "is_encrypted": False},
        {"category": "mail", "key": "smtp_TLSport", "value": "587", "is_encrypted": False},
        {"category": "mail", "key": "smtp_SSLport", "value": "465", "is_encrypted": False},
        {"category": "mail", "key": "smtp_SSLreq", "value": "no", "is_encrypted": False},
        {"category": "mail", "key": "smtp_TLSreq", "value": "yes", "is_encrypted": False},
        {"category": "mail", "key": "smtp_authreq", "value": "yes", "is_encrypted": False},
        {"category": "mail", "key": "smtp_safecnx", "value": "yes", "is_encrypted": False},
        {"category": "mail", "key": "smtp_subject", "value": "no-reply. Automatic email sent by ScolaIA Lounge", "is_encrypted": False},
        {"category": "mail", "key": "smtp_signature", "value": "By ScolaIA Lounge. If you have received this mail by mistake, please contact to admin@scolaia.net", "is_encrypted": False},
        
        # Ollama
        {"category": "ollama", "key": "ollama_url", "value": "", "is_encrypted": False},
        {"category": "ollama", "key": "ollama_port", "value": "11434", "is_encrypted": False},
        {"category": "ollama", "key": "ollama_apikey", "value": "ollama", "is_encrypted": True},
        {"category": "ollama", "key": "ollama_model", "value": "none", "is_encrypted": False},
        
        # OpenAPI
        {"category": "openapi", "key": "openapi_apikey", "value": "enter here your 164 char OpenAI Project API key", "is_encrypted": True},
        {"category": "openapi", "key": "openapi_organization", "value": "", "is_encrypted": False},
        {"category": "openapi", "key": "openapi_project", "value": "", "is_encrypted": False},
        {"category": "openapi", "key": "openapi_model", "value": "none", "is_encrypted": False},
        {"category": "openapi", "key": "openapi_message", "value": "", "is_encrypted": False},
        {"category": "openapi", "key": "openapi_temperature", "value": "0.7", "is_encrypted": False},
        {"category": "openapi", "key": "openapi_url", "value": "", "is_encrypted": False},

        # Theme
        {"category": "theme", "key": "primary_color", "value": "#00897B", "is_encrypted": False},
        {"category": "theme", "key": "secondary_color", "value": "#26A69A", "is_encrypted": False},
        {"category": "theme", "key": "background_color", "value": "#121212", "is_encrypted": False},
        {"category": "theme", "key": "text_color", "value": "#FFFFFF", "is_encrypted": False},
        {"category": "theme", "key": "accent_color", "value": "#80CBC4", "is_encrypted": False},
        {"category": "theme", "key": "titles_color", "value": "#586994", "is_encrypted": False},
        {"category": "theme", "key": "card_bg", "value": "#9ac1bb", "is_encrypted": False},
        {"category": "theme", "key": "logo_color", "value": "#008080", "is_encrypted": False},

        # Improve
        {"category": "improve", "key": "improve_role", "value": "You are an AI assistant trained to help users improve their prompts. Your goal is to analyze prompts and suggest improvements to make them more effective, clear, and aligned with best practices.", "is_encrypted": False},
        {"category": "improve", "key": "improve_tool", "value": "As a prompt improvement assistant, you have the following capabilities:\n1. Analyze prompt structure and components\n2. Identify areas for improvement\n3. Suggest specific enhancements\n4. Explain the reasoning behind suggestions\n5. Provide examples of improved versions", "is_encrypted": False}
    ]

    for setting_data in default_settings:
        existing = db.query(Setting).filter_by(key=setting_data["key"]).first()
        if not existing:
            setting = Setting(**setting_data)
            db.add(setting)
    
    db.commit()
    db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 