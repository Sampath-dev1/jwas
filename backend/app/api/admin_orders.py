from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.models import Order, OrderItem, Return, Refund, Payment, Inventory, InventoryMovement
from app.schemas.schemas import OrderOut, OrderStatusUpdate, RefundCreate
from app.permissions.deps import require_permission
from app.utils.audit import log_audit_event

router = APIRouter(prefix="/admin/orders", tags=["Admin Orders"])

VALID_TRANSITIONS = {
    "Pending Payment": ["Confirmed", "Cancelled"],
    "Confirmed": ["Processing", "Cancelled"],
    "Processing": ["Packed", "Cancelled"],
    "Packed": ["Shipped", "Cancelled"],
    "Shipped": ["Out for Delivery", "Delivered"],
    "Out for Delivery": ["Delivered"],
    "Delivered": ["Return Requested"],
    "Return Requested": ["Returned", "Delivered"],
    "Returned": ["Refunded"],
    "Cancelled": [],
    "Refunded": []
}

@router.get("", response_model=List[OrderOut])
def list_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user = Depends(require_permission("orders.read")),
    db: Session = Depends(get_db)
):
    query = db.query(Order)
    if status_filter:
        query = query.filter(Order.status == status_filter)
    if search:
        query = query.filter(Order.order_number.ilike(f"%{search}%"))

    offset = (page - 1) * limit
    orders = query.order_by(Order.created_at.desc()).offset(offset).limit(limit).all()
    return orders

@router.get("/{order_id}", response_model=OrderOut)
def get_order_detail(
    order_id: str,
    user = Depends(require_permission("orders.read")),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return order

@router.put("/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: str,
    req: OrderStatusUpdate,
    user = Depends(require_permission("orders.update")),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    if req.status and req.status != order.status:
        allowed = VALID_TRANSITIONS.get(order.status, [])
        if req.status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from '{order.status}' to '{req.status}'. Allowed: {allowed}"
            )
        
        # If moving to Cancelled, release stock
        if req.status == "Cancelled":
            for item in order.items:
                inv = db.query(Inventory).filter(Inventory.variant_id == item.variant_id).first()
                if inv:
                    prev_qty = inv.current_stock
                    inv.current_stock += item.quantity
                    db.add(InventoryMovement(
                        variant_id=item.variant_id,
                        previous_quantity=prev_qty,
                        quantity_change=item.quantity,
                        new_quantity=inv.current_stock,
                        reason="ORDER_CANCELLED_BY_STAFF",
                        staff_id=user.id,
                        order_id=order.id
                    ))

        order.status = req.status

    if req.tracking_number:
        order.tracking_number = req.tracking_number
    if req.courier_name:
        order.courier_name = req.courier_name
    if req.internal_notes:
        order.internal_notes = req.internal_notes

    db.commit()
    db.refresh(order)
    log_audit_event(db, "STATUS_CHANGE", "Order", order.id, user.id, {"new_status": order.status})
    return order

@router.post("/refunds", response_model=dict)
def process_refund(
    refund_in: RefundCreate,
    user = Depends(require_permission("refunds.approve")),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == refund_in.order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    if order.payment_status != "Paid":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot refund an unpaid order.")

    refund = Refund(
        order_id=order.id,
        return_id=refund_in.return_id,
        amount=refund_in.amount,
        reason=refund_in.reason,
        status="Completed"
    )
    db.add(refund)
    order.payment_status = "Refunded"
    order.status = "Refunded"
    db.commit()

    log_audit_event(db, "REFUND_ISSUED", "Order", order.id, user.id, {"amount": str(refund_in.amount)})
    return {"message": "Refund processed successfully.", "refund_id": refund.id}
