from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.models import User, StaffProfile, Role
from app.permissions.deps import require_permission, get_current_user
from app.utils.audit import log_audit_event

router = APIRouter(prefix="/admin/staff", tags=["Admin Staff Management"])

class StaffCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    department: Optional[str] = None
    employee_id: Optional[str] = None
    role_names: List[str]

class StaffRoleUpdate(BaseModel):
    role_names: List[str]

@router.get("")
def list_staff(
    user = Depends(require_permission("staff.manage")),
    db: Session = Depends(get_db)
):
    staff_users = db.query(User).join(StaffProfile).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "phone": u.phone,
            "department": u.staff_profile.department if u.staff_profile else None,
            "employee_id": u.staff_profile.employee_id if u.staff_profile else None,
            "is_active": u.is_active,
            "roles": [r.name for r in u.roles],
            "created_at": u.created_at
        }
        for u in staff_users
    ]

@router.post("")
def create_staff(
    req: StaffCreate,
    current_user: User = Depends(require_permission("staff.manage")),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered.")

    is_curr_super = any(r.name == "Super Admin" for r in current_user.roles)
    if "Super Admin" in req.role_names and not is_curr_super:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only a Super Admin can grant Super Admin privileges.")

    new_user = User(
        email=req.email,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        phone=req.phone,
        is_active=True,
        is_verified=True
    )

    for r_name in req.role_names:
        role_obj = db.query(Role).filter(Role.name == r_name).first()
        if role_obj:
            new_user.roles.append(role_obj)

    db.add(new_user)
    db.flush()

    staff_prof = StaffProfile(
        user_id=new_user.id,
        department=req.department,
        employee_id=req.employee_id,
        is_active=True
    )
    db.add(staff_prof)
    db.commit()

    log_audit_event(
        db, "CREATE_STAFF", "User", new_user.id, current_user.id,
        {"email": new_user.email, "roles": req.role_names}
    )

    return {"message": "Staff member created successfully.", "user_id": new_user.id}

@router.put("/{staff_id}/roles")
def update_staff_roles(
    staff_id: str,
    req: StaffRoleUpdate,
    current_user: User = Depends(require_permission("roles.manage")),
    db: Session = Depends(get_db)
):
    target_user = db.query(User).filter(User.id == staff_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff user not found.")

    is_curr_super = any(r.name == "Super Admin" for r in current_user.roles)
    if ("Super Admin" in req.role_names or any(r.name == "Super Admin" for r in target_user.roles)) and not is_curr_super:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Super Admins can modify Super Admin assignments.")

    target_user.roles = []
    for r_name in req.role_names:
        role_obj = db.query(Role).filter(Role.name == r_name).first()
        if role_obj:
            target_user.roles.append(role_obj)

    db.commit()
    log_audit_event(
        db, "UPDATE_STAFF_ROLES", "User", target_user.id, current_user.id,
        {"roles": req.role_names}
    )
    return {"message": "Staff roles updated successfully."}
