from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi.templating import Jinja2Templates
from ..database.database import get_db
from ..database.models import User
from ..schemas.auth import UserCreate, UserLogin, UserResponse
import logging

# Configuración
SECRET_KEY = "your-secret-key-keep-it-secret"  # En producción usar variables de entorno
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

router = APIRouter(prefix="/auth", tags=["auth"])
templates = Jinja2Templates(directory="app/templates")
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12  # Número de rondas de hashing
)

logger = logging.getLogger(__name__)

# Funciones de utilidad
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(db: Session, session: Optional[str] = None) -> Optional[User]:
    if not session:
        return None
    try:
        payload = jwt.decode(session, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            return None
        user = db.query(User).filter(User.username == username).first()
        return user
    except JWTError:
        return None

def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    session = request.cookies.get("session")
    return get_current_user(db, session)

# Rutas
@router.get("/login")
async def login_page(request: Request):
    return templates.TemplateResponse(
        "pages/auth/login.html",
        {"request": request}
    )

@router.get("/register")
async def register_page(request: Request):
    return templates.TemplateResponse(
        "pages/auth/register.html",
        {"request": request}
    )

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    if user.password != user.password_confirm:
        raise HTTPException(status_code=400, detail="Passwords don't match")
    
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    is_first_user = db.query(User).first() is None
    
    db_user = User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        password_hash=get_password_hash(user.password),
        is_admin=is_first_user
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@router.post("/login")
async def login(user_data: UserLogin, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.password_hash):
        logger.info(f"Failed login attempt for username: {user_data.username}")
        # Usamos 200 para indicar que la petición se procesó correctamente,
        # aunque las credenciales sean inválidas
        return {
            "success": False,
            "detail": "Invalid username or password"
        }
    
    logger.info(f"Successful login for user: {user_data.username}")
    token = create_access_token({"sub": user.username})
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,
        samesite="lax"
    )
    
    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("session")
    return {"message": "Logged out successfully"} 