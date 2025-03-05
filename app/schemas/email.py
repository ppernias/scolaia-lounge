from pydantic import BaseModel, EmailStr
from typing import Optional

class EmailSchema(BaseModel):
    to_email: EmailStr
    subject: str
    body_text: str
    sender: Optional[str] = None
    signature: Optional[str] = None 