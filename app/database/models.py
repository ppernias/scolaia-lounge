from sqlalchemy import Column, Integer, Text, Boolean, TIMESTAMP, ForeignKey, text, String, DateTime, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import validates, object_session
from cryptography.fernet import Fernet
from pathlib import Path
from datetime import datetime

Base = declarative_base()

# Configuración de encriptación
def get_encryption_key():
    key_file = Path("app/database/secret.key")
    if not key_file.exists():
        key = Fernet.generate_key()
        key_file.parent.mkdir(parents=True, exist_ok=True)
        key_file.write_bytes(key)
    return key_file.read_bytes()

fernet = Fernet(get_encryption_key())

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    username = Column(Text, nullable=False, unique=True)
    email = Column(Text, nullable=False, unique=True)
    password_hash = Column(Text, nullable=False)
    full_name = Column(Text)
    is_admin = Column(Boolean, server_default=text('FALSE'))
    role = Column(Text)
    organization = Column(Text)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))

class Assistant(Base):
    __tablename__ = "assistants"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(255))
    yaml_content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    downloads = Column(Integer, default=0)
    is_public = Column(Boolean, default=True)
    in_collections = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    created_by = Column(Text)
    remixed_by = Column(Text)
    forked_from = Column(Integer, ForeignKey("assistants.id"), nullable=True)

class AssistantLike(Base):
    __tablename__ = "assistant_likes"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assistant_id = Column(Integer, ForeignKey("assistants.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Aseguramos que un usuario solo pueda dar like una vez a cada asistente
    __table_args__ = (
        UniqueConstraint('user_id', 'assistant_id', name='unique_user_assistant_like'),
    )

    @validates('assistant_id')
    def validate_no_self_like(self, key, assistant_id):
        # Obtener el assistant para verificar su user_id
        session = object_session(self)
        if session is not None:
            assistant = session.query(Assistant).get(assistant_id)
            if assistant and assistant.user_id == self.user_id:
                raise ValueError("Users cannot like their own assistants")
        return assistant_id

class Setting(Base):
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True)
    category = Column(Text, nullable=False)
    key = Column(Text, nullable=False, unique=True)
    value = Column(Text)
    is_encrypted = Column(Boolean, default=False)
    
    def get_value(self) -> str:
        """Get the setting value, decrypting if necessary"""
        if not self.value:
            return ""
            
        if self.is_encrypted:
            try:
                return fernet.decrypt(self.value.encode()).decode()
            except Exception:
                return "<encrypted>"
        return self.value
    
    def set_value(self, value: str) -> None:
        """Set the setting value, encrypting if necessary"""
        if self.is_encrypted and value:
            try:
                self.value = fernet.encrypt(value.encode()).decode()
            except Exception:
                self.value = value
        else:
            self.value = value

    def __repr__(self):
        return f"<Setting {self.category}.{self.key}>"

class UserAssistantCollection(Base):
    __tablename__ = "user_assistant_collections"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assistant_id = Column(Integer, ForeignKey("assistants.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Aseguramos que un usuario solo pueda añadir una vez cada asistente a su colección
    __table_args__ = (
        UniqueConstraint('user_id', 'assistant_id', name='unique_user_assistant_collection'),
    )