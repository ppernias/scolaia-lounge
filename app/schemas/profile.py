from pydantic import BaseModel, EmailStr, constr
from typing import Optional

class UserProfileUpdate(BaseModel):
    email: EmailStr
    full_name: constr(min_length=2, max_length=100)
    role: Optional[str] = None
    organization: Optional[str] = None

class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: constr(min_length=8)
    password_confirm: str 