from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.core.database import get_db
from app.models.models import WebsiteSetting, ShippingMethod, TaxRule
from app.schemas.schemas import ShippingMethodCreate, TaxRuleCreate
from app.permissions.deps import require_permission
from app.utils.audit import log_audit_event

router = APIRouter(prefix="/admin/settings", tags=["Admin Settings"])

# Website Settings
@router.get("/business")
def get_business_settings(
    user = Depends(require_permission("settings.manage")),
    db: Session = Depends(get_db)
):
    settings = db.query(WebsiteSetting).all()
    return {s.key: s.value for s in settings}

@router.put("/business")
def update_business_settings(
    settings_dict: Dict[str, Any],
    user = Depends(require_permission("settings.manage")),
    db: Session = Depends(get_db)
):
    for k, v in settings_dict.items():
        existing = db.query(WebsiteSetting).filter(WebsiteSetting.key == k).first()
        if existing:
            existing.value = v
        else:
            db.add(WebsiteSetting(key=k, value=v))
    db.commit()
    log_audit_event(db, "UPDATE_SETTINGS", "WebsiteSetting", None, user.id, settings_dict)
    return {"message": "Settings updated successfully."}

# Shipping Methods
@router.get("/shipping", response_model=List[dict])
def list_shipping_methods(
    user = Depends(require_permission("settings.manage")),
    db: Session = Depends(get_db)
):
    methods = db.query(ShippingMethod).all()
    return [
        {
            "id": m.id,
            "name": m.name,
            "description": m.description,
            "rate": float(m.rate),
            "free_above": float(m.free_above) if m.free_above else None,
            "is_active": m.is_active
        }
        for m in methods
    ]

@router.post("/shipping")
def create_shipping_method(
    req: ShippingMethodCreate,
    user = Depends(require_permission("settings.manage")),
    db: Session = Depends(get_db)
):
    method = ShippingMethod(
        name=req.name,
        description=req.description,
        rate=req.rate,
        free_above=req.free_above,
        is_active=req.is_active
    )
    db.add(method)
    db.commit()
    log_audit_event(db, "CREATE_SHIPPING_METHOD", "ShippingMethod", method.id, user.id, {"name": method.name})
    return {"message": "Shipping method created.", "id": method.id}

# Tax Rules
@router.get("/taxes")
def list_tax_rules(
    user = Depends(require_permission("settings.manage")),
    db: Session = Depends(get_db)
):
    rules = db.query(TaxRule).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "tax_percentage": float(r.tax_percentage),
            "is_active": r.is_active
        }
        for r in rules
    ]

@router.post("/taxes")
def create_tax_rule(
    req: TaxRuleCreate,
    user = Depends(require_permission("settings.manage")),
    db: Session = Depends(get_db)
):
    rule = TaxRule(
        name=req.name,
        tax_percentage=req.tax_percentage,
        is_active=req.is_active
    )
    db.add(rule)
    db.commit()
    log_audit_event(db, "CREATE_TAX_RULE", "TaxRule", rule.id, user.id, {"name": rule.name, "rate": float(rule.tax_percentage)})
    return {"message": "Tax rule created.", "id": rule.id}
