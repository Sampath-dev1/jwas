from sqlalchemy.orm import Session
from app.models.models import AuditLog
from typing import Optional, Dict, Any

def log_audit_event(
    db: Session,
    action: str,
    entity: str,
    entity_id: Optional[str] = None,
    staff_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
):
    try:
        log = AuditLog(
            action=action,
            entity=entity,
            entity_id=entity_id,
            staff_id=staff_id,
            details=details or {},
            ip_address=ip_address
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Failed to record audit log: {e}")
        db.rollback()
