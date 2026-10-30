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
    Address, Coupon, CouponRedemption, ShippingMethod, TaxRule, Payment, User,
    Product, ProductVariant, Category
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

    # Discount & Free Gift calculation
    discount_amount = Decimal("0.00")
    coupon_valid = False
    coupon_message = None
    is_free_gift = False
    free_category_id = None
    free_category_name = None
    free_gift_options = []
    selected_free_gift = None

    if req.coupon_code:
        code_clean = req.coupon_code.strip().upper()
        coupon = db.query(Coupon).filter(
            Coupon.code == code_clean,
            Coupon.is_active == True
        ).first()

        if not coupon:
            coupon_message = f"Coupon code '{code_clean}' is invalid or inactive."
        else:
            now = datetime.now(timezone.utc)
            if coupon.start_date and coupon.start_date > now:
                coupon_message = "This coupon is not yet active."
            elif coupon.end_date and coupon.end_date < now:
                coupon_message = "This coupon has expired."
            elif subtotal < coupon.min_order_value:
                coupon_message = f"Minimum order amount of ₹{coupon.min_order_value:,.2f} required for this coupon."
            else:
                total_used = db.query(CouponRedemption).filter(CouponRedemption.coupon_id == coupon.id).count()
                user_used = db.query(CouponRedemption).filter(
                    CouponRedemption.coupon_id == coupon.id,
                    CouponRedemption.user_id == current_user.id
                ).count()

                if coupon.usage_limit and total_used >= coupon.usage_limit:
                    coupon_message = "This coupon has reached its total usage limit."
                elif coupon.per_customer_limit and user_used >= coupon.per_customer_limit:
                    coupon_message = "You have already redeemed this coupon."
                else:
                    coupon_valid = True
                    if coupon.discount_type == "PERCENTAGE":
                        discount_amount = (subtotal * coupon.discount_value) / Decimal("100.0")
                        if coupon.max_discount and discount_amount > coupon.max_discount:
                            discount_amount = coupon.max_discount
                        coupon_message = f"Coupon '{coupon.code}' applied: {coupon.discount_value}% off (-₹{discount_amount:,.2f})"
                    elif coupon.discount_type == "FIXED":
                        discount_amount = min(subtotal, coupon.discount_value)
                        coupon_message = f"Coupon '{coupon.code}' applied: Flat ₹{discount_amount:,.2f} off"
                    elif coupon.discount_type == "FREE_GIFT":
                        is_free_gift = True
                        free_category_id = coupon.free_category_id
                        if coupon.free_category:
                            free_category_name = coupon.free_category.name

                        if free_category_id:
                            free_products = db.query(Product).filter(
                                Product.category_id == free_category_id,
                                Product.status == "published"
                            ).all()
                            for p in free_products:
                                active_vars = [v for v in p.variants if v.is_active and v.stock_quantity > 0]
                                if active_vars:
                                    img = p.thumbnail_url or (p.images[0].url if p.images else None)
                                    free_gift_options.append({
                                        "product_id": p.id,
                                        "product_name": p.name,
                                        "image_url": img,
                                        "variants": [
                                            {
                                                "id": v.id,
                                                "sku": v.sku,
                                                "title": v.title,
                                                "price": float(v.selling_price if v.selling_price is not None else p.selling_price),
                                                "stock": v.stock_quantity,
                                                "attributes": v.attributes or {}
                                            }
                                            for v in active_vars
                                        ]
                                    })

                        if req.free_gift_variant_id:
                            gift_var = db.query(ProductVariant).filter(
                                ProductVariant.id == req.free_gift_variant_id,
                                ProductVariant.is_active == True,
                                ProductVariant.stock_quantity > 0
                            ).first()
                            if gift_var and gift_var.product and gift_var.product.category_id == free_category_id:
                                gift_val = gift_var.selling_price if gift_var.selling_price is not None else gift_var.product.selling_price
                                selected_free_gift = {
                                    "variant_id": gift_var.id,
                                    "product_name": gift_var.product.name,
                                    "variant_title": gift_var.title,
                                    "original_price": float(gift_val),
                                    "price": 0.00,
                                    "image_url": gift_var.product.thumbnail_url or (gift_var.product.images[0].url if gift_var.product.images else None)
                                }
                                coupon_message = f"Free gift selected: {gift_var.product.name} (FREE)"
                            else:
                                coupon_message = f"Coupon '{coupon.code}' applied! Please select your free gift from {free_category_name or 'the free category'}."
                        else:
                            coupon_message = f"Coupon '{coupon.code}' applied! Please select your free gift from {free_category_name or 'the free category'}."

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
        "discount_amount": discount_amount,
        "shipping": shipping_charge,
        "shipping_amount": shipping_charge,
        "tax": tax_amount,
        "total": total_amount,
        "final_total": total_amount,
        "currency": "INR",
        "coupon_valid": coupon_valid,
        "coupon_code": req.coupon_code if coupon_valid else None,
        "coupon_message": coupon_message,
        "is_free_gift": is_free_gift,
        "free_category_id": free_category_id,
        "free_category_name": free_category_name,
        "free_gift_options": free_gift_options,
        "selected_free_gift": selected_free_gift
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

    # Coupon & Free Gift calculation
    discount_amount = Decimal("0.00")
    coupon_obj = None
    free_gift_variant = None

    if req.coupon_code:
        code_clean = req.coupon_code.strip().upper()
        coupon_obj = db.query(Coupon).filter(
            Coupon.code == code_clean,
            Coupon.is_active == True
        ).first()
        if coupon_obj:
            now = datetime.now(timezone.utc)
            if (not coupon_obj.start_date or coupon_obj.start_date <= now) and (not coupon_obj.end_date or coupon_obj.end_date >= now):
                if subtotal >= coupon_obj.min_order_value:
                    tot = db.query(CouponRedemption).filter(CouponRedemption.coupon_id == coupon_obj.id).count()
                    usr = db.query(CouponRedemption).filter(
                        CouponRedemption.coupon_id == coupon_obj.id,
                        CouponRedemption.user_id == current_user.id
                    ).count()
                    if (not coupon_obj.usage_limit or tot < coupon_obj.usage_limit) and (not coupon_obj.per_customer_limit or usr < coupon_obj.per_customer_limit):
                        if coupon_obj.discount_type == "PERCENTAGE":
                            discount_amount = (subtotal * coupon_obj.discount_value) / Decimal("100.0")
                            if coupon_obj.max_discount and discount_amount > coupon_obj.max_discount:
                                discount_amount = coupon_obj.max_discount
                        elif coupon_obj.discount_type == "FIXED":
                            discount_amount = min(subtotal, coupon_obj.discount_value)
                        elif coupon_obj.discount_type == "FREE_GIFT":
                            if req.free_gift_variant_id:
                                gift_var = db.query(ProductVariant).filter(
                                    ProductVariant.id == req.free_gift_variant_id,
                                    ProductVariant.is_active == True,
                                    ProductVariant.stock_quantity > 0
                                ).first()
                                if gift_var and gift_var.product and gift_var.product.category_id == coupon_obj.free_category_id:
                                    free_gift_variant = gift_var

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

    # If customer claimed a free gift under this promotional coupon, append it to the order as ₹0 item!
    if free_gift_variant and coupon_obj:
        gift_order_item = OrderItem(
            order_id=order.id,
            variant_id=free_gift_variant.id,
            product_name_snapshot=f"{free_gift_variant.product.name} (FREE GIFT - {coupon_obj.code})",
            sku_snapshot=free_gift_variant.sku,
            variant_attributes_snapshot=free_gift_variant.attributes or {},
            price_snapshot=Decimal("0.00"),
            quantity=1,
            total_item_amount=Decimal("0.00")
        )
        db.add(gift_order_item)

        # Deduct 1 unit from stock for the claimed free gift
        free_gift_variant.stock_quantity = max(0, free_gift_variant.stock_quantity - 1)

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
    if coupon_obj and (discount_amount > 0 or free_gift_variant is not None):
        gift_val = Decimal("0.00")
        if free_gift_variant:
            gift_val = free_gift_variant.selling_price if free_gift_variant.selling_price is not None else free_gift_variant.product.selling_price
        redemption = CouponRedemption(
            coupon_id=coupon_obj.id,
            user_id=current_user.id,
            order_id=order.id,
            discount_applied=discount_amount if discount_amount > 0 else gift_val
        )
        db.add(redemption)

    # Empty user cart
    for item in cart.items:
        db.delete(item)

    db.commit()
    db.refresh(order)
    return order
