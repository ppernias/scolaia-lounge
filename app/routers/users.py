from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.templating import Jinja2Templates
from typing import Optional
from sqlalchemy.orm import Session
from ..database.database import get_db
from ..database.models import User, Setting
from ..schemas.users import UserList, UserAdminUpdate
from ..schemas.email import EmailSchema
from .auth import get_current_user, get_password_hash, verify_password
from ..utils.email_sender import send_email
from secrets import token_urlsafe

router = APIRouter(prefix="/users", tags=["users"])
templates = Jinja2Templates(directory="app/templates")

@router.get("")
async def users_page(
    request: Request,
    page: int = 1,
    limit: int = 10,
    sort: str = "username",
    order: str = "asc",
    search: str = None,
    filter_by: str = None,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Validar campos de ordenación permitidos
    allowed_sort_fields = ["id", "username", "email", "full_name", "role", 
                          "organization", "is_admin", "created_at"]
    if sort not in allowed_sort_fields:
        sort = "username"
    
    # Construir orden
    sort_column = getattr(User, sort)
    if order == "desc":
        sort_column = sort_column.desc()
    
    # Iniciar la consulta base
    query = db.query(User)
    
    # Aplicar filtros de búsqueda si se especifican
    if search and filter_by:
        if filter_by == "username":
            query = query.filter(User.username.ilike(f"%{search}%"))
        elif filter_by == "role":
            query = query.filter(User.role.ilike(f"%{search}%"))
        elif filter_by == "organization":
            query = query.filter(User.organization.ilike(f"%{search}%"))
    
    # Primero ordenar por is_admin (descendente) y luego por el campo seleccionado
    query = query.order_by(User.is_admin.desc(), sort_column)
    
    # Paginación
    total = query.count()
    total_pages = (total + limit - 1) // limit
    if page < 1:
        page = 1
    elif page > total_pages and total_pages > 0:
        page = total_pages
    
    users = query.offset((page - 1) * limit).limit(limit).all()
    
    return templates.TemplateResponse(
        "pages/users/users_list.html",
        {
            "request": request,
            "users": users,
            "page": page,
            "total_pages": total_pages,
            "sort": sort,
            "order": order,
            "current_user": current_user,
            "search": search,
            "filter_by": filter_by
        }
    )

@router.get("/{user_id}")
async def get_user(user_id: int, request: Request, db: Session = Depends(get_db)):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Solo generamos una contraseña temporal si el usuario no tiene una establecida
    temp_password = None
    if not user.password_hash:
        temp_password = token_urlsafe(12)  # 12 caracteres para mayor seguridad
        user.password_hash = get_password_hash(temp_password)
        db.commit()
    
    user_data = UserList.from_orm(user)
    user_data_dict = user_data.dict()
    if temp_password:
        user_data_dict["temp_password"] = temp_password
    
    return user_data_dict

@router.put("/{user_id}")
async def update_user(
    user_id: int,
    user_data: UserAdminUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent changing own admin status
    if current_user.id == user_id and current_user.is_admin != user_data.is_admin:
        raise HTTPException(status_code=400, detail="Cannot change your own admin status")
    
    # Update password if provided
    if user_data.password:
        user.password_hash = get_password_hash(user_data.password)
    
    # Update other fields
    update_data = user_data.dict(exclude={'password'}, exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    return UserList.from_orm(user)

@router.post("/{user_id}/generate-password")
async def generate_new_password(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Genera una nueva contraseña para el usuario y la envía por email.
    Requiere ser administrador.
    """
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Obtener el usuario
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generar nueva contraseña
    new_password = token_urlsafe(12)
    user.password_hash = get_password_hash(new_password)
    db.commit()
    
    # Enviar email con la nueva contraseña
    settings = db.query(Setting).filter(Setting.category == "mail").all()
    settings_dict = {s.key: s.get_value() for s in settings}
    
    email = EmailSchema(
        to_email=user.email,
        subject="Your New Account Password",
        body_text=f"""Hello {user.full_name or user.username},

A new password has been generated for your ScolaIA Lounge account.

Here is your updated account information:

Username: {user.username}
Email: {user.email}
Full Name: {user.full_name or 'Not set'}
Role: {user.role or 'Not set'}
Organization: {user.organization or 'Not set'}
Administrator: {'Yes' if user.is_admin else 'No'}

Your new password is: {new_password}

Please change this password the next time you log in.

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
    
    return {"message": "New password generated and sent successfully"}

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user(db, request.cookies.get("session"))
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own user")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}
