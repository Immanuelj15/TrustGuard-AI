from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import create_access_token
from app.schemas import UserCreate, UserLogin, UserOut, Token
from app.services.auth_service import authenticate_user, create_user, get_current_user
from app.services.audit_service import log_audit_event
from app.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    user = create_user(db, user_in)
    log_audit_event(
        db,
        action="USER_REGISTERED",
        user_id=user.id,
        metadata={"email": user.email, "role": user.role}
    )
    return user

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        log_audit_event(
            db,
            action="LOGIN_FAILED",
            metadata={"email": login_data.email},
            outcome="failure"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(subject=user.id, role=user.role)
    log_audit_event(
        db,
        action="USER_LOGIN",
        user_id=user.id,
        metadata={"email": user.email, "role": user.role}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user
