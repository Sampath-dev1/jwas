from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import Role, Permission
from app.permissions.deps import require_permission, get_current_user
from app.permissions.constants import PERMISSIONS
from app.utils.audit import log_audit_event

router = APIRouter(prefix="/admin/roles", tags=["Admin Roles"])

class RolePermissionUpdate(BaseModel):
    permission_codes: List[str]

@router.get("")
def list_roles(
    user = Depends(require_permission("roles.manage")),
    db: Session = Depends(get_db)
):
    roles = db.query(Role).all()
    all_perms = db.query(Permission).all()
    return {
        "roles": [
            {
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "permissions": [p.code for p in r.permissions]
            }
            for r in roles
        ],
        "available_permissions": [
            {"code": p.code, "description": p.description}
            for p in all_perms
        ]
    }

@router.put("/{role_id}/permissions")
def update_role_permissions(
    role_id: str,
    req: RolePermissionUpdate,
    user = Depends(require_permission("roles.manage")),
    db: Session = Depends(get_db)
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found.")

    if role.name == "Super Admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Super Admin role permissions cannot be altered.")

    perms = db.query(Permission).filter(Permission.code.in_(req.permission_codes)).all()
    role.permissions = perms
    db.commit()

    log_audit_event(db, "UPDATE_ROLE_PERMS", "Role", role.id, user.id, {"perms": req.permission_codes})
    return {"message": "Role permissions updated successfully."}
