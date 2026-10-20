from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.models import User, CustomerProfile
from app.schemas.schemas import UserRegister, UserLogin, Token, UserOut
from app.permissions.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address is already registered."
        )

    # Customers never receive admin roles on registration
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        phone=user_in.phone,
        is_active=True,
        is_verified=False
    )
    db.add(user)
    db.flush()

    profile = CustomerProfile(user_id=user.id)
    db.add(profile)
    db.commit()
    db.refresh(user)

    user_roles = [r.name for r in user.roles]
    token = create_access_token(user.id, extra_claims={"email": user.email, "roles": user_roles})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "roles": user_roles,
            "permissions": []
        }
    }

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support."
        )

    user_roles = [r.name for r in user.roles]
    permissions = set()
    for r in user.roles:
        for p in r.permissions:
            permissions.add(p.code)

    token = create_access_token(user.id, extra_claims={"email": user.email, "roles": user_roles})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "roles": user_roles,
            "permissions": list(permissions)
        }
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    user_roles = [r.name for r in current_user.roles]
    permissions = set()
    for r in current_user.roles:
        for p in r.permissions:
            permissions.add(p.code)
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "roles": user_roles,
        "permissions": list(permissions),
        "created_at": current_user.created_at
    }

@router.post("/logout")
def logout():
    return {"message": "Logged out successfully."}
