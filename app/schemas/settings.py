from pydantic import BaseModel, EmailStr, constr, Field
from typing import Optional

class SettingUpdate(BaseModel):
    value: str
    is_encrypted: bool = False

class SettingResponse(BaseModel):
    id: int
    category: str
    key: str
    value: str
    is_encrypted: bool
    
    class Config:
        from_attributes = True 

class DefaultsUpdate(BaseModel):
    key: str
    value: str

class DefaultsResponse(BaseModel):
    key: str
    value: str