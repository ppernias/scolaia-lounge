from pydantic import BaseModel, constr, EmailStr

class UserCreate(BaseModel):
    username: constr(min_length=3, max_length=50)
    email: EmailStr
    full_name: constr(min_length=2, max_length=100)
    password: constr(min_length=8)
    password_confirm: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    is_admin: bool

    class Config:
        from_attributes = True 