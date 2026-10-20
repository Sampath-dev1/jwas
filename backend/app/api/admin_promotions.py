from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import Coupon, CouponRedemption
from app.schemas.schemas import CouponCreate, CouponOut
from app.permissions.deps import require_permission
from app.utils.audit import log_audit_event

router = APIRouter(prefix="/admin/promotions", tags=["Admin Promotions"])

@router.get("/coupons", response_model=List[CouponOut])
def list_coupons(
    user = Depends(require_permission("promotions.manage")),
    db: Session = Depends(get_db)
):
    return db.query(Coupon).order_by(Coupon.created_at.desc()).all()

@router.post("/coupons", response_model=CouponOut)
def create_coupon(
    coupon_in: CouponCreate,
    user = Depends(require_permission("promotions.manage")),
    db: Session = Depends(get_db)
):
    code = coupon_in.code.strip().upper()
    existing = db.query(Coupon).filter(Coupon.code == code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Coupon code '{code}' already exists.")

    coupon = Coupon(
        code=code,
        discount_type=coupon_in.discount_type,
        discount_value=coupon_in.discount_value,
        min_order_value=coupon_in.min_order_value,
        max_discount=coupon_in.max_discount,
        start_date=coupon_in.start_date,
        end_date=coupon_in.end_date,
        usage_limit=coupon_in.usage_limit,
        per_customer_limit=coupon_in.per_customer_limit,
        is_active=coupon_in.is_active,
        applicable_categories=coupon_in.applicable_categories
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)

    log_audit_event(db, "CREATE_COUPON", "Coupon", coupon.id, user.id, {"code": coupon.code})
    return coupon

@router.delete("/coupons/{coupon_id}")
def delete_coupon(
    coupon_id: str,
    user = Depends(require_permission("promotions.manage")),
    db: Session = Depends(get_db)
):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found.")

    db.delete(coupon)
    db.commit()
    return {"message": "Coupon deleted."}
