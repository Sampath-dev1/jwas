from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.models import Order, OrderItem, Address, Wishlist, WishlistItem, Product, Return, ReturnItem, Inventory, InventoryMovement, User
from app.schemas.schemas import OrderOut, AddressCreate, AddressOut, ReturnRequestCreate
from app.permissions.deps import get_current_user

router = APIRouter(prefix="/account", tags=["Customer Account"])

@router.get("/orders", response_model=List[OrderOut])
def get_customer_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    orders = db.query(Order).filter(Order.user_id == current_user.id).order_by(Order.created_at.desc()).all()
    return orders

@router.get("/orders/{order_id}", response_model=OrderOut)
def get_customer_order_detail(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Strict broken object-level authorization protection
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return order

@router.post("/orders/{order_id}/cancel")
def cancel_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    if order.status not in ["Pending Payment", "Confirmed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Orders in state '{order.status}' cannot be cancelled directly. Please request a return if received."
        )

    # Release stock back to inventory
    for item in order.items:
        inv = db.query(Inventory).filter(Inventory.variant_id == item.variant_id).first()
        if inv:
            prev_qty = inv.current_stock
            inv.current_stock += item.quantity
            movement = InventoryMovement(
                variant_id=item.variant_id,
                previous_quantity=prev_qty,
                quantity_change=item.quantity,
                new_quantity=inv.current_stock,
                reason="CANCELLATION_RELEASE",
                order_id=order.id
            )
            db.add(movement)

    order.status = "Cancelled"
    db.commit()
    return {"message": "Order cancelled successfully."}

@router.post("/orders/{order_id}/return")
def request_return(
    order_id: str,
    req: ReturnRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    if order.status != "Delivered":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only delivered orders can be requested for return."
        )

    ret = Return(
        order_id=order.id,
        user_id=current_user.id,
        reason=req.reason,
        status="Requested"
    )
    db.add(ret)
    db.flush()

    for item in req.items:
        ret_item = ReturnItem(
            return_id=ret.id,
            order_item_id=item["order_item_id"],
            quantity=item.get("quantity", 1),
            reason=item.get("reason", req.reason)
        )
        db.add(ret_item)

    order.status = "Return Requested"
    db.commit()
    return {"message": "Return request submitted successfully.", "return_id": ret.id}

@router.get("/addresses", response_model=List[AddressOut])
def get_addresses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Address).filter(Address.user_id == current_user.id).order_by(Address.created_at.desc()).all()

@router.post("/addresses", response_model=AddressOut)
def add_address(
    addr_in: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if addr_in.is_default:
        db.query(Address).filter(Address.user_id == current_user.id).update({"is_default": False})

    addr = Address(
        user_id=current_user.id,
        full_name=addr_in.full_name,
        phone=addr_in.phone,
        address_line1=addr_in.address_line1,
        address_line2=addr_in.address_line2,
        city=addr_in.city,
        state=addr_in.state,
        postal_code=addr_in.postal_code,
        country=addr_in.country,
        is_default=addr_in.is_default
    )
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return addr

@router.delete("/addresses/{address_id}")
def delete_address(
    address_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    addr = db.query(Address).filter(Address.id == address_id, Address.user_id == current_user.id).first()
    if addr:
        db.delete(addr)
        db.commit()
    return {"message": "Address deleted."}

@router.get("/wishlist")
def get_wishlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    wishlist = db.query(Wishlist).filter(Wishlist.user_id == current_user.id).first()
    if not wishlist:
        return []
    
    result = []
    for item in wishlist.items:
        p = item.product
        if p and p.status == "published":
            main_img = next((img.image_url for img in p.images if img.is_main), None)
            if not main_img and p.images:
                main_img = p.images[0].image_url
            result.append({
                "product_id": p.id,
                "name": p.name,
                "slug": p.slug,
                "price": p.selling_price,
                "image_url": main_img
            })
    return result

@router.post("/wishlist/{product_id}")
def toggle_wishlist(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id, Product.status == "published").first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    wishlist = db.query(Wishlist).filter(Wishlist.user_id == current_user.id).first()
    if not wishlist:
        wishlist = Wishlist(user_id=current_user.id)
        db.add(wishlist)
        db.flush()

    existing = db.query(WishlistItem).filter(
        WishlistItem.wishlist_id == wishlist.id,
        WishlistItem.product_id == product.id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"in_wishlist": False, "message": "Removed from wishlist."}
    else:
        new_item = WishlistItem(wishlist_id=wishlist.id, product_id=product.id)
        db.add(new_item)
        db.commit()
        return {"in_wishlist": True, "message": "Added to wishlist."}
