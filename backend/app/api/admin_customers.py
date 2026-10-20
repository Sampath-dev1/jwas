from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.models import User, CustomerProfile, Order
from app.permissions.deps import require_permission

router = APIRouter(prefix="/admin/customers", tags=["Admin Customers"])

@router.get("")
def list_customers(
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user = Depends(require_permission("customers.read")),
    db: Session = Depends(get_db)
):
    query = db.query(User).join(CustomerProfile)
    if search:
        p = f"%{search}%"
        query = query.filter((User.email.ilike(p)) | (User.full_name.ilike(p)) | (User.phone.ilike(p)))

    offset = (page - 1) * limit
    customers = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    return [
        {
            "id": c.id,
            "email": c.email,
            "full_name": c.full_name,
            "phone": c.phone,
            "is_active": c.is_active,
            "is_verified": c.is_verified,
            "total_orders": len(c.orders),
            "created_at": c.created_at
        }
        for c in customers
    ]

@router.get("/{customer_id}")
def get_customer_details(
    customer_id: str,
    user = Depends(require_permission("customers.read")),
    db: Session = Depends(get_db)
):
    customer = db.query(User).filter(User.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")

    return {
        "id": customer.id,
        "email": customer.email,
        "full_name": customer.full_name,
        "phone": customer.phone,
        "is_active": customer.is_active,
        "orders": [
            {
                "id": o.id,
                "order_number": o.order_number,
                "status": o.status,
                "payment_status": o.payment_status,
                "total_amount": float(o.total_amount),
                "created_at": o.created_at
            }
            for o in customer.orders
        ]
    }
