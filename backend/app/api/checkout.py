from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime, timezone
import uuid
import random
import string

from app.core.database import get_db
from app.models.models import (
    Order, OrderItem, Cart, CartItem, Inventory, InventoryMovement, 
    Address, Coupon, CouponRedemption, ShippingMethod, TaxRule, Payment, User
)
from app.schemas.schemas import CheckoutRequest, OrderOut, PaymentInitiateResponse
from app.permissions.deps import get_current_user

router = APIRouter(prefix="/checkout", tags=["Checkout & Orders"])

def generate_order_number() -> str:
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"JWAS-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{random_str}"

@router.post("/preview")
def preview_checkout(
    req: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart or not cart.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Your cart is empty.")

    subtotal = Decimal("0.00")
    for item in cart.items:
        variant = item.variant
        if not variant or not variant.is_active or not variant.product or variant.product.status != "published":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item {variant.sku if variant else ''} is no longer available."
            )
        unit_price = variant.selling_price if variant.selling_price is not None else variant.product.selling_price
        subtotal += unit_price * item.quantity

    # Shipping calculation from database rules
    shipping_method = db.query(ShippingMethod).filter(ShippingMethod.is_active == True).first()
    shipping_charge = Decimal("0.00")
    if shipping_method:
        if shipping_method.free_above and subtotal >= shipping_method.free_above:
            shipping_charge = Decimal("0.00")
        else:
            shipping_charge = shipping_method.rate

    # Discount calculation
    discount_amount = Decimal("0.00")
    if req.coupon_code:
        coupon = db.query(Coupon).filter(
            Coupon.code == req.coupon_code.strip().upper(),
            Coupon.is_active == True
        ).first()
        if coupon:
            now = datetime.now(timezone.utc)
            if (not coupon.start_date or coupon.start_date <= now) and (not coupon.end_date or coupon.end_date >= now):
                if subtotal >= coupon.min_order_value:
                    if coupon.discount_type == "PERCENTAGE":
                        discount_amount = (subtotal * coupon.discount_value) / Decimal("100.0")
                        if coupon.max_discount and discount_amount > coupon.max_discount:
                            discount_amount = coupon.max_discount
                    else: # FIXED
                        discount_amount = coupon.discount_value
                        if discount_amount > subtotal:
                            discount_amount = subtotal

    taxable_amount = max(Decimal("0.00"), subtotal - discount_amount)
    
    # Tax calculation from database rules
    tax_rule = db.query(TaxRule).filter(TaxRule.is_active == True).first()
    tax_amount = Decimal("0.00")
    if tax_rule and tax_rule.tax_percentage > 0:
        tax_amount = (taxable_amount * tax_rule.tax_percentage) / Decimal("100.0")

    total_amount = taxable_amount + shipping_charge + tax_amount

    return {
        "subtotal": subtotal,
        "discount": discount_amount,
        "shipping": shipping_charge,
        "tax": tax_amount,
        "total": total_amount,
        "currency": "INR"
    }

@router.post("/process", response_model=OrderOut)
def process_checkout(
    req: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart or not cart.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Your cart is empty.")

    # Address resolution
    shipping_address_data = None
    if req.shipping_address_id:
        addr = db.query(Address).filter(Address.id == req.shipping_address_id, Address.user_id == current_user.id).first()
        if not addr:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specified shipping address not found.")
        shipping_address_data = {
            "full_name": addr.full_name,
            "phone": addr.phone,
            "address_line1": addr.address_line1,
            "address_line2": addr.address_line2,
            "city": addr.city,
            "state": addr.state,
            "postal_code": addr.postal_code,
            "country": addr.country
        }
    elif req.new_shipping_address:
        new_addr = Address(
            user_id=current_user.id,
            full_name=req.new_shipping_address.full_name,
            phone=req.new_shipping_address.phone,
            address_line1=req.new_shipping_address.address_line1,
            address_line2=req.new_shipping_address.address_line2,
            city=req.new_shipping_address.city,
            state=req.new_shipping_address.state,
            postal_code=req.new_shipping_address.postal_code,
            country=req.new_shipping_address.country,
            is_default=req.new_shipping_address.is_default
        )
        db.add(new_addr)
        db.flush()
        shipping_address_data = {
            "full_name": new_addr.full_name,
            "phone": new_addr.phone,
            "address_line1": new_addr.address_line1,
            "address_line2": new_addr.address_line2,
            "city": new_addr.city,
            "state": new_addr.state,
            "postal_code": new_addr.postal_code,
            "country": new_addr.country
        }
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A valid delivery address is required.")

    # Concurrency control: Atomic verification and stock deduction with row locking
    subtotal = Decimal("0.00")
    order_items_to_create = []

    for item in cart.items:
        # SELECT FOR UPDATE on inventory row to prevent concurrent overselling
        inv = db.query(Inventory).filter(Inventory.variant_id == item.variant_id).with_for_update().first()
        if not inv:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Inventory record missing for variant {item.variant.sku}."
            )

        variant = item.variant
        if not variant.is_active or variant.product.status != "published":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product {variant.sku} is not available."
            )

        avail = inv.current_stock - inv.reserved_stock
        if avail < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stock insufficient for {variant.product.name} ({variant.sku}). Available: {avail}, Requested: {item.quantity}"
            )

        unit_price = variant.selling_price if variant.selling_price is not None else variant.product.selling_price
        item_total = unit_price * item.quantity
        subtotal += item_total

        # Deduct stock atomically and log movement
        prev_qty = inv.current_stock
        inv.current_stock -= item.quantity
        
        movement = InventoryMovement(
            variant_id=variant.id,
            previous_quantity=prev_qty,
            quantity_change=-item.quantity,
            new_quantity=inv.current_stock,
            reason="ORDER_COMMIT",
            staff_id=None
        )
        db.add(movement)

        order_items_to_create.append({
            "variant_id": variant.id,
            "product_name_snapshot": variant.product.name,
            "sku_snapshot": variant.sku,
            "variant_attributes_snapshot": variant.attributes or {},
            "price_snapshot": unit_price,
            "quantity": item.quantity,
            "total_item_amount": item_total
        })

    # Shipping calculation
    shipping_method = db.query(ShippingMethod).filter(ShippingMethod.is_active == True).first()
    shipping_charge = Decimal("0.00")
    if shipping_method:
        if shipping_method.free_above and subtotal >= shipping_method.free_above:
            shipping_charge = Decimal("0.00")
        else:
            shipping_charge = shipping_method.rate

    # Coupon calculation
    discount_amount = Decimal("0.00")
    coupon_obj = None
    if req.coupon_code:
        coupon_obj = db.query(Coupon).filter(
            Coupon.code == req.coupon_code.strip().upper(),
            Coupon.is_active == True
        ).first()
        if coupon_obj:
            now = datetime.now(timezone.utc)
            if (not coupon_obj.start_date or coupon_obj.start_date <= now) and (not coupon_obj.end_date or coupon_obj.end_date >= now):
                if subtotal >= coupon_obj.min_order_value:
                    if coupon_obj.discount_type == "PERCENTAGE":
                        discount_amount = (subtotal * coupon_obj.discount_value) / Decimal("100.0")
                        if coupon_obj.max_discount and discount_amount > coupon_obj.max_discount:
                            discount_amount = coupon_obj.max_discount
                    else:
                        discount_amount = coupon_obj.discount_value
                        if discount_amount > subtotal:
                            discount_amount = subtotal

    taxable_amount = max(Decimal("0.00"), subtotal - discount_amount)
    tax_rule = db.query(TaxRule).filter(TaxRule.is_active == True).first()
    tax_amount = Decimal("0.00")
    if tax_rule and tax_rule.tax_percentage > 0:
        tax_amount = (taxable_amount * tax_rule.tax_percentage) / Decimal("100.0")

    total_amount = taxable_amount + shipping_charge + tax_amount

    # Create Order
    order_num = generate_order_number()
    is_cod = (req.payment_method.lower() == "cod")
    
    order = Order(
        order_number=order_num,
        user_id=current_user.id,
        status="Confirmed" if is_cod else "Pending Payment",
        payment_status="Unpaid",
        subtotal_amount=subtotal,
        discount_amount=discount_amount,
        shipping_amount=shipping_charge,
        tax_amount=tax_amount,
        total_amount=total_amount,
        currency="INR",
        shipping_address_snapshot=shipping_address_data
    )
    db.add(order)
    db.flush()

    for item_data in order_items_to_create:
        order_item = OrderItem(
            order_id=order.id,
            variant_id=item_data["variant_id"],
            product_name_snapshot=item_data["product_name_snapshot"],
            sku_snapshot=item_data["sku_snapshot"],
            variant_attributes_snapshot=item_data["variant_attributes_snapshot"],
            price_snapshot=item_data["price_snapshot"],
            quantity=item_data["quantity"],
            total_item_amount=item_data["total_item_amount"]
        )
        db.add(order_item)

    # Record Payment entity
    payment = Payment(
        order_id=order.id,
        provider="cod" if is_cod else "razorpay",
        amount=total_amount,
        currency="INR",
        status="Pending",
        payment_method="cod" if is_cod else "online"
    )
    db.add(payment)

    # Record coupon redemption if applicable
    if coupon_obj and discount_amount > 0:
        redemption = CouponRedemption(
            coupon_id=coupon_obj.id,
            user_id=current_user.id,
            order_id=order.id,
            discount_applied=discount_amount
        )
        db.add(redemption)

    # Empty user cart
    for item in cart.items:
        db.delete(item)

    db.commit()
    db.refresh(order)
    return order
