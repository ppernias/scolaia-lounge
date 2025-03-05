from pydantic import BaseModel, EmailStr, constr
from typing import Optional
from datetime import datetime

class UserList(BaseModel):
    id: int
    username: str
    email: EmailStr
    full_name: str
    is_admin: bool
    role: Optional[str] = None
    organization: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class UserAdminUpdate(BaseModel):
    email: EmailStr
    full_name: constr(min_length=2, max_length=100)
    is_admin: bool = False
    role: Optional[str] = None
    organization: Optional[str] = None
    password: Optional[str] = None 