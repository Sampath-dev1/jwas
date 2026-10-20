from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.models import Inventory, InventoryMovement, ProductVariant, Product
from app.schemas.schemas import InventoryOut, StockAdjustmentRequest
from app.permissions.deps import require_permission
from app.utils.audit import log_audit_event

router = APIRouter(prefix="/admin/inventory", tags=["Admin Inventory"])

@router.get("", response_model=List[InventoryOut])
def list_inventory(
    low_stock_only: bool = False,
    search: Optional[str] = None,
    user = Depends(require_permission("inventory.read")),
    db: Session = Depends(get_db)
):
    query = db.query(Inventory).join(ProductVariant).join(Product)
    
    if low_stock_only:
        query = query.filter(Inventory.current_stock <= Inventory.low_stock_threshold)

    if search:
        pattern = f"%{search}%"
        query = query.filter((ProductVariant.sku.ilike(pattern)) | (Product.name.ilike(pattern)))

    items = query.all()
    result = []
    for inv in items:
        result.append(InventoryOut(
            id=inv.id,
            variant_id=inv.variant_id,
            sku=inv.variant.sku,
            product_name=inv.variant.product.name,
            current_stock=inv.current_stock,
            reserved_stock=inv.reserved_stock,
            available_stock=inv.available_stock,
            low_stock_threshold=inv.low_stock_threshold,
            updated_at=inv.updated_at
        ))
    return result

@router.post("/adjust")
def adjust_stock(
    req: StockAdjustmentRequest,
    user = Depends(require_permission("inventory.adjust")),
    db: Session = Depends(get_db)
):
    inv = db.query(Inventory).filter(Inventory.variant_id == req.variant_id).with_for_update().first()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory record not found.")

    prev_qty = inv.current_stock
    new_qty = prev_qty + req.quantity_change

    if new_qty < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Adjustment would result in negative stock ({new_qty}). Operation rejected."
        )

    inv.current_stock = new_qty
    movement = InventoryMovement(
        variant_id=inv.variant_id,
        previous_quantity=prev_qty,
        quantity_change=req.quantity_change,
        new_quantity=new_qty,
        reason=req.reason,
        staff_id=user.id
    )
    db.add(movement)
    db.commit()

    log_audit_event(
        db, "STOCK_ADJUSTMENT", "Inventory", inv.id, user.id,
        {"variant_id": inv.variant_id, "prev": prev_qty, "change": req.quantity_change, "new": new_qty, "reason": req.reason}
    )

    return {
        "message": "Stock adjusted successfully.",
        "previous_quantity": prev_qty,
        "quantity_change": req.quantity_change,
        "new_quantity": new_qty
    }

@router.get("/movements/{variant_id}")
def get_movement_history(
    variant_id: str,
    user = Depends(require_permission("inventory.read")),
    db: Session = Depends(get_db)
):
    movements = db.query(InventoryMovement).filter(
        InventoryMovement.variant_id == variant_id
    ).order_by(InventoryMovement.created_at.desc()).all()

    return [
        {
            "id": m.id,
            "previous_quantity": m.previous_quantity,
            "quantity_change": m.quantity_change,
            "new_quantity": m.new_quantity,
            "reason": m.reason,
            "staff_id": m.staff_id,
            "created_at": m.created_at
        }
        for m in movements
    ]
