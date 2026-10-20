from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    Column, String, Integer, Numeric, Boolean, DateTime, ForeignKey, 
    Text, JSON, Table, Enum, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def utcnow():
    return datetime.now(timezone.utc)

# Association table for User <-> Role
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", String(36), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)

# Association table for Role <-> Permission
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", String(36), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", String(36), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    roles = relationship("Role", secondary=user_roles, back_populates="users", lazy="joined")
    customer_profile = relationship("CustomerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    staff_profile = relationship("StaffProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    wishlist = relationship("Wishlist", back_populates="user", uselist=False, cascade="all, delete-orphan")
    cart = relationship("Cart", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="customer_profile")

class StaffProfile(Base):
    __tablename__ = "staff_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    department = Column(String(100), nullable=True)
    employee_id = Column(String(100), unique=True, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="staff_profile")

class Role(Base):
    __tablename__ = "roles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles", lazy="joined")

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)

    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")

class Category(Base):
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(1024), nullable=True)
    parent_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    is_published = Column(Boolean, default=False, nullable=False)
    is_nav_visible = Column(Boolean, default=True, nullable=False)
    is_home_visible = Column(Boolean, default=False, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    seo_title = Column(String(255), nullable=True)
    seo_description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    parent = relationship("Category", remote_side=[id], backref="subcategories")
    products = relationship("Product", back_populates="category", foreign_keys="Product.category_id")

class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    sku = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    specifications = Column(JSON, default=dict, nullable=False)
    selling_price = Column(Numeric(12, 2), nullable=False)
    original_price = Column(Numeric(12, 2), nullable=True)
    status = Column(String(50), default="draft", nullable=False) # draft, published, archived
    is_featured = Column(Boolean, default=False, nullable=False)
    is_new_arrival = Column(Boolean, default=False, nullable=False)
    is_best_seller = Column(Boolean, default=False, nullable=False)
    seo_title = Column(String(255), nullable=True)
    seo_description = Column(Text, nullable=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False)
    subcategory_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    category = relationship("Category", foreign_keys=[category_id], back_populates="products")
    subcategory = relationship("Category", foreign_keys=[subcategory_id])
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.display_order")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")

class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    variant_id = Column(String(36), ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    image_url = Column(String(1024), nullable=False)
    alt_text = Column(String(255), nullable=True)
    display_order = Column(Integer, default=0, nullable=False)
    is_main = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    product = relationship("Product", back_populates="images")

class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    sku = Column(String(100), unique=True, index=True, nullable=False)
    attributes = Column(JSON, default=dict, nullable=False) # e.g. {"size": "M", "color": "Blue"}
    selling_price = Column(Numeric(12, 2), nullable=True) # if null, uses product.selling_price
    original_price = Column(Numeric(12, 2), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    product = relationship("Product", back_populates="variants")
    inventory = relationship("Inventory", back_populates="variant", uselist=False, cascade="all, delete-orphan")
    inventory_movements = relationship("InventoryMovement", back_populates="variant", cascade="all, delete-orphan")

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    variant_id = Column(String(36), ForeignKey("product_variants.id", ondelete="CASCADE"), unique=True, nullable=False)
    current_stock = Column(Integer, default=0, nullable=False)
    reserved_stock = Column(Integer, default=0, nullable=False)
    low_stock_threshold = Column(Integer, default=5, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    variant = relationship("ProductVariant", back_populates="inventory")

    @property
    def available_stock(self) -> int:
        return max(0, self.current_stock - self.reserved_stock)

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    variant_id = Column(String(36), ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False)
    previous_quantity = Column(Integer, nullable=False)
    quantity_change = Column(Integer, nullable=False)
    new_quantity = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=False) # e.g., "INITIAL_STOCK", "RESTOCK", "ORDER_RESERVATION", "ORDER_COMMIT", "CANCELLATION_RELEASE", "MANUAL_ADJUSTMENT"
    staff_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    order_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    variant = relationship("ProductVariant", back_populates="inventory_movements")

class Cart(Base):
    __tablename__ = "carts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=True)
    session_id = Column(String(100), unique=True, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="cart")
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")

class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cart_id = Column(String(36), ForeignKey("carts.id", ondelete="CASCADE"), nullable=False)
    variant_id = Column(String(36), ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    cart = relationship("Cart", back_populates="items")
    variant = relationship("ProductVariant")

class Address(Base):
    __tablename__ = "addresses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    address_line1 = Column(String(255), nullable=False)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    postal_code = Column(String(20), nullable=False)
    country = Column(String(100), default="India", nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="addresses")

class Order(Base):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_number = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    status = Column(String(50), default="Pending Payment", nullable=False) 
    # Pending Payment, Confirmed, Processing, Packed, Shipped, Out for Delivery, Delivered, Cancelled, Return Requested, Returned, Refunded
    payment_status = Column(String(50), default="Unpaid", nullable=False) # Unpaid, Paid, Failed, Refunded
    subtotal_amount = Column(Numeric(12, 2), nullable=False)
    discount_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    shipping_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    shipping_address_snapshot = Column(JSON, nullable=False)
    internal_notes = Column(Text, nullable=True)
    tracking_number = Column(String(100), nullable=True)
    courier_name = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    shipments = relationship("Shipment", back_populates="order", cascade="all, delete-orphan")
    returns = relationship("Return", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    variant_id = Column(String(36), ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    product_name_snapshot = Column(String(255), nullable=False)
    sku_snapshot = Column(String(100), nullable=False)
    variant_attributes_snapshot = Column(JSON, default=dict, nullable=False)
    price_snapshot = Column(Numeric(12, 2), nullable=False)
    quantity = Column(Integer, nullable=False)
    total_item_amount = Column(Numeric(12, 2), nullable=False)

    order = relationship("Order", back_populates="items")
    variant = relationship("ProductVariant")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False) # e.g. "razorpay", "cod"
    transaction_id = Column(String(255), unique=True, nullable=True)
    provider_order_id = Column(String(255), nullable=True)
    provider_signature = Column(String(512), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    status = Column(String(50), default="Pending", nullable=False) # Pending, Success, Failed, Cancelled, Refunded
    payment_method = Column(String(50), nullable=True) # card, upi, netbanking, cod
    raw_response = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    order = relationship("Order", back_populates="payments")

class PaymentWebhookEvent(Base):
    __tablename__ = "payment_webhook_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(255), unique=True, index=True, nullable=False)
    event_type = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False)
    processed = Column(Boolean, default=False, nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    carrier = Column(String(100), nullable=False)
    tracking_number = Column(String(100), nullable=False)
    status = Column(String(50), default="Manifested", nullable=False)
    shipped_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    order = relationship("Order", back_populates="shipments")

class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(50), unique=True, index=True, nullable=False)
    discount_type = Column(String(20), nullable=False) # PERCENTAGE, FIXED
    discount_value = Column(Numeric(12, 2), nullable=False)
    min_order_value = Column(Numeric(12, 2), default=0.00, nullable=False)
    max_discount = Column(Numeric(12, 2), nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    usage_limit = Column(Integer, nullable=True) # total redemptions allowed
    per_customer_limit = Column(Integer, default=1, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    applicable_categories = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

class CouponRedemption(Base):
    __tablename__ = "coupon_redemptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    coupon_id = Column(String(36), ForeignKey("coupons.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    discount_applied = Column(Numeric(12, 2), nullable=False)
    redeemed_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

class Return(Base):
    __tablename__ = "returns"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="Requested", nullable=False) # Requested, Approved, Rejected, Received, Refunded
    reason = Column(Text, nullable=False)
    staff_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    order = relationship("Order", back_populates="returns")
    items = relationship("ReturnItem", back_populates="return_req", cascade="all, delete-orphan")
    refunds = relationship("Refund", back_populates="return_req", cascade="all, delete-orphan")

class ReturnItem(Base):
    __tablename__ = "return_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    return_id = Column(String(36), ForeignKey("returns.id", ondelete="CASCADE"), nullable=False)
    order_item_id = Column(String(36), ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=True)

    return_req = relationship("Return", back_populates="items")
    order_item = relationship("OrderItem")

class Refund(Base):
    __tablename__ = "refunds"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    return_id = Column(String(36), ForeignKey("returns.id", ondelete="SET NULL"), nullable=True)
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(50), default="Pending", nullable=False) # Pending, Completed, Failed
    provider_refund_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    return_req = relationship("Return", back_populates="refunds")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False) # 1-5
    comment = Column(Text, nullable=True)
    is_approved = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews")

class Wishlist(Base):
    __tablename__ = "wishlists"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="wishlist")
    items = relationship("WishlistItem", back_populates="wishlist", cascade="all, delete-orphan")

class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    wishlist_id = Column(String(36), ForeignKey("wishlists.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    wishlist = relationship("Wishlist", back_populates="items")
    product = relationship("Product")

class HomepageSection(Base):
    __tablename__ = "homepage_sections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    section_type = Column(String(50), nullable=False) # HERO, CATEGORIES, FEATURED_PRODUCTS, BEST_SELLERS, NEW_ARRIVALS, BANNER, TEXT_BLOCK
    title = Column(String(255), nullable=True)
    subtitle = Column(String(255), nullable=True)
    content = Column(JSON, default=dict, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

class Banner(Base):
    __tablename__ = "banners"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    image_url = Column(String(1024), nullable=False)
    destination_url = Column(String(512), nullable=True)
    button_text = Column(String(100), nullable=True)
    display_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

class WebsiteSetting(Base):
    __tablename__ = "website_settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(JSON, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

class ShippingMethod(Base):
    __tablename__ = "shipping_methods"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    rate = Column(Numeric(12, 2), default=0.00, nullable=False)
    free_above = Column(Numeric(12, 2), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

class ShippingRule(Base):
    __tablename__ = "shipping_rules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    region = Column(String(100), nullable=False)
    min_weight_grams = Column(Integer, default=0, nullable=False)
    max_weight_grams = Column(Integer, nullable=True)
    charge = Column(Numeric(12, 2), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

class TaxRule(Base):
    __tablename__ = "tax_rules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    tax_percentage = Column(Numeric(5, 2), default=0.00, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    staff_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    entity = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    details = Column(JSON, default=dict, nullable=False)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="notifications")
