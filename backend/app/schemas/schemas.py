from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal

# Authentication schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    phone: Optional[str]
    is_active: bool
    is_verified: bool
    roles: List[str]
    permissions: List[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Category schemas
class CategoryBase(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[str] = None
    is_published: bool = False
    is_nav_visible: bool = True
    is_home_visible: bool = False
    display_order: int = 0
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None

class CategoryCreate(CategoryBase):
    name: str

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[str] = None
    is_published: Optional[bool] = None
    is_nav_visible: Optional[bool] = None
    is_home_visible: Optional[bool] = None
    display_order: Optional[int] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None

class CategoryOut(CategoryBase):
    id: str
    slug: str
    created_at: datetime
    updated_at: datetime
    subcategories: List["CategoryOut"] = []

    class Config:
        from_attributes = True

# Product variant schemas
class ProductVariantBase(BaseModel):
    sku: str
    attributes: Dict[str, Any] = {}
    selling_price: Optional[Decimal] = None
    original_price: Optional[Decimal] = None
    is_active: bool = True
    initial_stock: Optional[int] = 0

class ProductVariantCreate(ProductVariantBase):
    pass

class ProductVariantUpdate(BaseModel):
    sku: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    selling_price: Optional[Decimal] = None
    original_price: Optional[Decimal] = None
    is_active: Optional[bool] = None

class ProductVariantOut(BaseModel):
    id: str
    product_id: str
    sku: str
    attributes: Dict[str, Any]
    selling_price: Optional[Decimal]
    original_price: Optional[Decimal]
    is_active: bool
    current_stock: int = 0
    available_stock: int = 0

    class Config:
        from_attributes = True

# Product Image schemas
class ProductImageCreate(BaseModel):
    image_url: str
    alt_text: Optional[str] = None
    display_order: int = 0
    is_main: bool = False
    variant_id: Optional[str] = None

class ProductImageOut(ProductImageCreate):
    id: str
    product_id: str

    class Config:
        from_attributes = True

# Product schemas
class ProductCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    sku: str
    description: Optional[str] = None
    specifications: Dict[str, Any] = {}
    selling_price: Decimal = Field(..., gt=0)
    original_price: Optional[Decimal] = None
    status: str = "draft"  # draft, published, archived
    is_featured: bool = False
    is_new_arrival: bool = False
    is_best_seller: bool = False
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    category_id: str
    subcategory_id: Optional[str] = None
    variants: List[ProductVariantCreate] = []
    images: List[ProductImageCreate] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None
    selling_price: Optional[Decimal] = None
    original_price: Optional[Decimal] = None
    status: Optional[str] = None
    is_featured: Optional[bool] = None
    is_new_arrival: Optional[bool] = None
    is_best_seller: Optional[bool] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None

class ProductOut(BaseModel):
    id: str
    name: str
    slug: str
    sku: str
    description: Optional[str]
    specifications: Dict[str, Any]
    selling_price: Decimal
    original_price: Optional[Decimal]
    status: str
    is_featured: bool
    is_new_arrival: bool
    is_best_seller: bool
    category_id: str
    subcategory_id: Optional[str]
    created_at: datetime
    images: List[ProductImageOut] = []
    variants: List[ProductVariantOut] = []

    class Config:
        from_attributes = True

# Inventory schemas
class StockAdjustmentRequest(BaseModel):
    variant_id: str
    quantity_change: int
    reason: str

class InventoryOut(BaseModel):
    id: str
    variant_id: str
    sku: str
    product_name: str
    current_stock: int
    reserved_stock: int
    available_stock: int
    low_stock_threshold: int
    updated_at: datetime

# Cart schemas
class CartItemAdd(BaseModel):
    variant_id: str
    quantity: int = Field(1, ge=1)

class CartItemUpdate(BaseModel):
    quantity: int = Field(..., ge=1)

class CartItemOut(BaseModel):
    id: str
    variant_id: str
    product_id: str
    product_name: str
    product_slug: str
    variant_sku: str
    variant_attributes: Dict[str, Any]
    image_url: Optional[str]
    unit_price: Decimal
    quantity: int
    total_price: Decimal
    available_stock: int

class CartOut(BaseModel):
    id: str
    items: List[CartItemOut]
    subtotal: Decimal
    item_count: int

# Address schemas
class AddressCreate(BaseModel):
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "India"
    is_default: bool = False

class AddressOut(AddressCreate):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Checkout & Order schemas
class CheckoutRequest(BaseModel):
    shipping_address_id: Optional[str] = None
    new_shipping_address: Optional[AddressCreate] = None
    payment_method: str = "cod" # "cod" or "razorpay"
    coupon_code: Optional[str] = None

class OrderItemOut(BaseModel):
    id: str
    variant_id: str
    product_name_snapshot: str
    sku_snapshot: str
    variant_attributes_snapshot: Dict[str, Any]
    price_snapshot: Decimal
    quantity: int
    total_item_amount: Decimal

class OrderOut(BaseModel):
    id: str
    order_number: str
    status: str
    payment_status: str
    subtotal_amount: Decimal
    discount_amount: Decimal
    shipping_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    currency: str
    shipping_address_snapshot: Dict[str, Any]
    tracking_number: Optional[str]
    courier_name: Optional[str]
    created_at: datetime
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: Optional[str] = None
    tracking_number: Optional[str] = None
    courier_name: Optional[str] = None
    internal_notes: Optional[str] = None

# Payment schemas
class PaymentInitiateResponse(BaseModel):
    order_id: str
    order_number: str
    amount: Decimal
    currency: str
    payment_provider: str
    razorpay_order_id: Optional[str] = None
    razorpay_key_id: Optional[str] = None

class PaymentVerifyRequest(BaseModel):
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

# Promotion schemas
class CouponCreate(BaseModel):
    code: str
    discount_type: str # PERCENTAGE, FIXED
    discount_value: Decimal = Field(..., gt=0)
    min_order_value: Decimal = Decimal("0.00")
    max_discount: Optional[Decimal] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    usage_limit: Optional[int] = None
    per_customer_limit: int = 1
    is_active: bool = True
    applicable_categories: List[str] = []

class CouponOut(CouponCreate):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# CMS schemas
class HomepageSectionCreate(BaseModel):
    section_type: str
    title: Optional[str] = None
    subtitle: Optional[str] = None
    content: Dict[str, Any] = {}
    display_order: int = 0
    is_active: bool = True

class HomepageSectionOut(HomepageSectionCreate):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BannerCreate(BaseModel):
    title: str
    image_url: str
    destination_url: Optional[str] = None
    button_text: Optional[str] = None
    display_order: int = 0
    is_active: bool = True

class BannerOut(BannerCreate):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class WebsiteSettingUpdate(BaseModel):
    key: str
    value: Any
    description: Optional[str] = None

# Return & Refund schemas
class ReturnRequestCreate(BaseModel):
    order_id: str
    reason: str
    items: List[Dict[str, Any]] # order_item_id, quantity, reason

class RefundCreate(BaseModel):
    order_id: str
    return_id: Optional[str] = None
    amount: Decimal
    reason: str

# Shipping & Tax schemas
class ShippingMethodCreate(BaseModel):
    name: str
    description: Optional[str] = None
    rate: Decimal
    free_above: Optional[Decimal] = None
    is_active: bool = True

class TaxRuleCreate(BaseModel):
    name: str
    tax_percentage: Decimal
    is_active: bool = True
