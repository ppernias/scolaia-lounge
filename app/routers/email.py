from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from ..database.database import get_db
from ..schemas.email import EmailSchema
from ..utils.email_sender import send_email
from .auth import get_current_user
from ..database.models import User, Setting

router = APIRouter(
    prefix="/api/email",
    tags=["email"]
)

class UserEmailRequest(BaseModel):
    user_id: int

@router.post("/send")
async def send_email_endpoint(
    email_data: UserEmailRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Envía un email con los datos del usuario.
    Requiere estar autenticado y ser administrador.
    """
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Obtener el usuario
    user = db.query(User).filter(User.id == email_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Obtener la configuración del sistema
    settings = db.query(Setting).filter(Setting.category == "mail").all()
    settings_dict = {s.key: s.get_value() for s in settings}
    
    # Construir el email
    email = EmailSchema(
        to_email=user.email,
        subject="Your Account Information",
        body_text=f"""Hello {user.full_name or user.username},

Here is your account information for ScolaIA Lounge:

Username: {user.username}
Email: {user.email}
Full Name: {user.full_name or 'Not set'}
Role: {user.role or 'Not set'}
Organization: {user.organization or 'Not set'}
Administrator: {'Yes' if user.is_admin else 'No'}

{f'A temporary password has been generated for your account: {user.temp_password}' if hasattr(user, 'temp_password') and user.temp_password else 'Your password remains unchanged.'}

Please keep this information secure.
""",
        sender=settings_dict.get('smtp_fullname', 'System Administrator')
    )
    
    success, message = await send_email(db, email)
    if not success:
        raise HTTPException(
            status_code=500,
            detail=message
        )
    
    return {"message": "Email sent successfully"}
