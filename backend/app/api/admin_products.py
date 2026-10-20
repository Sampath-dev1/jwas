from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
import re
import uuid

from app.core.database import get_db
from app.models.models import Product, ProductVariant, Inventory, ProductImage, InventoryMovement, OrderItem, CartItem, WishlistItem
from app.schemas.schemas import ProductCreate, ProductUpdate, ProductOut, ProductVariantCreate, ProductVariantOut, ProductImageOut
from app.permissions.deps import require_permission
from app.utils.audit import log_audit_event
from app.api.products import serialize_product

router = APIRouter(prefix="/admin/products", tags=["Admin Products"])

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text.strip('-')

@router.get("", response_model=List[ProductOut])
def list_admin_products(
    category_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user = Depends(require_permission("products.read")),
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    if status_filter:
        query = query.filter(Product.status == status_filter)
    if category_id:
        query = query.filter((Product.category_id == category_id) | (Product.subcategory_id == category_id))
    if search:
        pattern = f"%{search}%"
        query = query.filter((Product.name.ilike(pattern)) | (Product.sku.ilike(pattern)))

    offset = (page - 1) * limit
    products = query.order_by(Product.created_at.desc()).offset(offset).limit(limit).all()
    return [serialize_product(p) for p in products]

@router.post("", response_model=ProductOut)
def create_product(
    prod_in: ProductCreate,
    user = Depends(require_permission("products.create")),
    db: Session = Depends(get_db)
):
    # Check duplicate SKU
    existing_sku = db.query(Product).filter(Product.sku == prod_in.sku).first()
    if existing_sku:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"A product with SKU '{prod_in.sku}' already exists.")

    slug = prod_in.slug or slugify(prod_in.name)
    existing_slug = db.query(Product).filter(Product.slug == slug).first()
    if existing_slug:
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    product = Product(
        name=prod_in.name,
        slug=slug,
        sku=prod_in.sku,
        description=prod_in.description,
        specifications=prod_in.specifications,
        selling_price=prod_in.selling_price,
        original_price=prod_in.original_price,
        status=prod_in.status,
        is_featured=prod_in.is_featured,
        is_new_arrival=prod_in.is_new_arrival,
        is_best_seller=prod_in.is_best_seller,
        seo_title=prod_in.seo_title,
        seo_description=prod_in.seo_description,
        category_id=prod_in.category_id,
        subcategory_id=prod_in.subcategory_id
    )
    db.add(product)
    db.flush()

    # Create images
    for img in prod_in.images:
        db.add(ProductImage(
            product_id=product.id,
            image_url=img.image_url,
            alt_text=img.alt_text,
            display_order=img.display_order,
            is_main=img.is_main
        ))

    # Create variants and inventory
    if not prod_in.variants:
        # Create default variant
        default_variant = ProductVariant(
            product_id=product.id,
            sku=product.sku,
            attributes={"standard": "Standard"},
            selling_price=product.selling_price,
            original_price=product.original_price,
            is_active=True
        )
        db.add(default_variant)
        db.flush()
        inv = Inventory(
            variant_id=default_variant.id,
            current_stock=0,
            reserved_stock=0,
            low_stock_threshold=5
        )
        db.add(inv)
    else:
        for v in prod_in.variants:
            variant = ProductVariant(
                product_id=product.id,
                sku=v.sku,
                attributes=v.attributes,
                selling_price=v.selling_price or product.selling_price,
                original_price=v.original_price or product.original_price,
                is_active=v.is_active
            )
            db.add(variant)
            db.flush()

            initial_stock = v.initial_stock or 0
            inv = Inventory(
                variant_id=variant.id,
                current_stock=initial_stock,
                reserved_stock=0,
                low_stock_threshold=5
            )
            db.add(inv)

            if initial_stock > 0:
                movement = InventoryMovement(
                    variant_id=variant.id,
                    previous_quantity=0,
                    quantity_change=initial_stock,
                    new_quantity=initial_stock,
                    reason="INITIAL_STOCK",
                    staff_id=user.id
                )
                db.add(movement)

    db.commit()
    db.refresh(product)
    log_audit_event(db, "CREATE", "Product", product.id, user.id, {"sku": product.sku, "name": product.name})
    return serialize_product(product)

@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: str,
    prod_in: ProductUpdate,
    user = Depends(require_permission("products.update")),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    update_data = prod_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    log_audit_event(db, "UPDATE", "Product", product.id, user.id, update_data)
    return serialize_product(product)

@router.post("/{product_id}/archive")
def archive_product(
    product_id: str,
    user = Depends(require_permission("products.archive")),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    product.status = "archived"
    db.commit()
    log_audit_event(db, "ARCHIVE", "Product", product.id, user.id, {"status": "archived"})
    return {"message": "Product archived successfully."}

@router.delete("/{product_id}")
def delete_product(
    product_id: str,
    user = Depends(require_permission("products.update")),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    variant_ids = [v.id for v in product.variants]
    if variant_ids:
        # Null out variant_id in OrderItem so historical order receipts remain intact with snapshots
        db.query(OrderItem).filter(OrderItem.variant_id.in_(variant_ids)).update(
            {OrderItem.variant_id: None}, synchronize_session=False
        )
        # Clear any active cart items referencing these variants
        db.query(CartItem).filter(CartItem.variant_id.in_(variant_ids)).delete(synchronize_session=False)

    # Clear any wishlist items referencing this product
    db.query(WishlistItem).filter(WishlistItem.product_id == product.id).delete(synchronize_session=False)

    prod_name = product.name
    prod_sku = product.sku
    db.delete(product)
    db.commit()
    log_audit_event(db, "DELETE", "Product", product_id, user.id, {"name": prod_name, "sku": prod_sku})
    return {"message": "Product removed completely from catalogue.", "deleted": True}

