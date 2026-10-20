from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import Optional
from decimal import Decimal
import uuid

from app.core.database import get_db
from app.models.models import Cart, CartItem, ProductVariant, Product, User
from app.schemas.schemas import CartOut, CartItemOut, CartItemAdd, CartItemUpdate
from app.permissions.deps import get_current_user_optional

router = APIRouter(prefix="/cart", tags=["Cart"])

def get_or_create_cart(db: Session, user: Optional[User], session_id: Optional[str]) -> Cart:
    if user:
        cart = db.query(Cart).filter(Cart.user_id == user.id).first()
        if not cart:
            cart = Cart(user_id=user.id)
            db.add(cart)
            db.commit()
            db.refresh(cart)
        # If guest session exists, merge it into user's cart
        if session_id:
            guest_cart = db.query(Cart).filter(Cart.session_id == session_id).first()
            if guest_cart and guest_cart.id != cart.id:
                for g_item in guest_cart.items:
                    existing_user_item = db.query(CartItem).filter(
                        CartItem.cart_id == cart.id,
                        CartItem.variant_id == g_item.variant_id
                    ).first()
                    if existing_user_item:
                        existing_user_item.quantity += g_item.quantity
                    else:
                        db.add(CartItem(
                            cart_id=cart.id,
                            variant_id=g_item.variant_id,
                            quantity=g_item.quantity
                        ))
                db.delete(guest_cart)
                db.commit()
                db.refresh(cart)
        return cart
    else:
        if not session_id:
            session_id = str(uuid.uuid4())
        cart = db.query(Cart).filter(Cart.session_id == session_id).first()
        if not cart:
            cart = Cart(session_id=session_id)
            db.add(cart)
            db.commit()
            db.refresh(cart)
        return cart

def serialize_cart(cart: Cart) -> CartOut:
    items_out = []
    subtotal = Decimal("0.00")
    total_qty = 0

    for item in cart.items:
        variant = item.variant
        if not variant or not variant.is_active:
            continue
        product = variant.product
        if not product or product.status != "published":
            continue

        unit_price = variant.selling_price if variant.selling_price is not None else product.selling_price
        curr_stock = variant.inventory.current_stock if variant.inventory else 0
        res_stock = variant.inventory.reserved_stock if variant.inventory else 0
        avail = max(0, curr_stock - res_stock)

        item_total = unit_price * item.quantity
        subtotal += item_total
        total_qty += item.quantity

        main_img = next((img.image_url for img in product.images if img.is_main), None)
        if not main_img and product.images:
            main_img = product.images[0].image_url

        items_out.append(CartItemOut(
            id=item.id,
            variant_id=variant.id,
            product_id=product.id,
            product_name=product.name,
            product_slug=product.slug,
            variant_sku=variant.sku,
            variant_attributes=variant.attributes or {},
            image_url=main_img,
            unit_price=unit_price,
            quantity=item.quantity,
            total_price=item_total,
            available_stock=avail
        ))

    return CartOut(
        id=cart.id,
        items=items_out,
        subtotal=subtotal,
        item_count=total_qty
    )

@router.get("", response_model=CartOut)
def get_cart(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cart = get_or_create_cart(db, current_user, x_session_id)
    return serialize_cart(cart)

@router.post("/items", response_model=CartOut)
def add_cart_item(
    item_in: CartItemAdd,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    variant = db.query(ProductVariant).filter(
        ProductVariant.id == item_in.variant_id,
        ProductVariant.is_active == True
    ).first()
    if not variant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product variant not found or inactive.")

    if not variant.product or variant.product.status != "published":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product is not available for purchase.")

    # Check available stock
    curr_stock = variant.inventory.current_stock if variant.inventory else 0
    res_stock = variant.inventory.reserved_stock if variant.inventory else 0
    avail = max(0, curr_stock - res_stock)

    if avail < item_in.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {avail} unit(s) available in stock."
        )

    cart = get_or_create_cart(db, current_user, x_session_id)
    existing_item = db.query(CartItem).filter(
        CartItem.cart_id == cart.id,
        CartItem.variant_id == variant.id
    ).first()

    if existing_item:
        if avail < existing_item.quantity + item_in.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot add more than {avail} units to cart."
            )
        existing_item.quantity += item_in.quantity
    else:
        new_item = CartItem(cart_id=cart.id, variant_id=variant.id, quantity=item_in.quantity)
        db.add(new_item)

    db.commit()
    db.refresh(cart)
    return serialize_cart(cart)

@router.put("/items/{item_id}", response_model=CartOut)
def update_cart_item(
    item_id: str,
    item_in: CartItemUpdate,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cart = get_or_create_cart(db, current_user, x_session_id)
    cart_item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
    if not cart_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found.")

    curr_stock = cart_item.variant.inventory.current_stock if cart_item.variant.inventory else 0
    res_stock = cart_item.variant.inventory.reserved_stock if cart_item.variant.inventory else 0
    avail = max(0, curr_stock - res_stock)

    if item_in.quantity > avail:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot set quantity higher than available stock ({avail})."
        )

    cart_item.quantity = item_in.quantity
    db.commit()
    db.refresh(cart)
    return serialize_cart(cart)

@router.delete("/items/{item_id}", response_model=CartOut)
def remove_cart_item(
    item_id: str,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cart = get_or_create_cart(db, current_user, x_session_id)
    cart_item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
    if cart_item:
        db.delete(cart_item)
        db.commit()
        db.refresh(cart)
    return serialize_cart(cart)
