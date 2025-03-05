from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.templating import Jinja2Templates
from ..database.database import get_db
from ..database.models import User, Assistant
from ..schemas.profile import UserProfileUpdate, UserPasswordUpdate
from .auth import get_current_user, verify_password, get_password_hash

router = APIRouter(prefix="/profile", tags=["profile"])
templates = Jinja2Templates(directory="app/templates")

def get_current_user_or_401(
    db: Session,
    request: Request
) -> User:
    user = get_current_user(db, request.cookies.get("session"))
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@router.get("")
async def profile_page(
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user_or_401(db, request)
    return templates.TemplateResponse(
        "pages/profile/index.html",
        {"request": request, "current_user": current_user}
    )

@router.get("/current")
async def get_current_user_data(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get current user profile data"""
    current_user = get_current_user_or_401(db, request)
    return {
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "organization": current_user.organization
    }

@router.put("/update")
async def update_profile(
    profile_data: UserProfileUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user_or_401(db, request)
    
    existing_user = db.query(User).filter(
        User.email == profile_data.email,
        User.id != current_user.id
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    for field, value in profile_data.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    
    db.commit()
    return {"message": "Profile updated successfully"}

@router.put("/update-password")
async def update_password(
    password_data: UserPasswordUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user_or_401(db, request)
    
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid current password")
    
    if password_data.new_password != password_data.password_confirm:
        raise HTTPException(status_code=400, detail="Passwords don't match")
    
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}

@router.delete("/delete")
async def delete_own_account(
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = get_current_user_or_401(db, request)
    
    try:
        # Delete user's assistants that haven't been forked
        assistants_deleted = db.query(Assistant).filter(
            Assistant.user_id == current_user.id,
            Assistant.forked_from.is_(None)
        ).delete(synchronize_session=False)
        
        # Delete user's collections (entries in user_assistant_collections)
        result = db.execute(
            text("DELETE FROM user_assistant_collections WHERE user_id = :user_id"),
            {"user_id": current_user.id}
        )
        collections_deleted = result.rowcount
        
        # Delete the user
        db.delete(current_user)
        db.commit()
        
        return {
            "message": "Account deleted successfully",
            "details": {
                "assistants_deleted": assistants_deleted,
                "collections_deleted": collections_deleted
            }
        }
    except Exception as e:
        db.rollback()
        error_msg = f"Error deleting account: {str(e.__class__.__name__)}: {str(e)}"
        print(error_msg)  # Log the error for debugging
        raise HTTPException(status_code=500, detail=error_msg)