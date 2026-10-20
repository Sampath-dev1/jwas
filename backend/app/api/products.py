from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from decimal import Decimal
from app.core.database import get_db
from app.models.models import Product, ProductVariant, Inventory, ProductImage, Category, Review, User
from app.schemas.schemas import ProductOut, ProductVariantOut, ProductImageOut
from app.permissions.deps import get_current_user

router = APIRouter(prefix="/products", tags=["Public Products"])

def serialize_product(product: Product) -> ProductOut:
    variant_outs = []
    for v in product.variants:
        if not v.is_active:
            continue
        curr_stock = v.inventory.current_stock if v.inventory else 0
        res_stock = v.inventory.reserved_stock if v.inventory else 0
        avail = max(0, curr_stock - res_stock)
        variant_outs.append(ProductVariantOut(
            id=v.id,
            product_id=v.product_id,
            sku=v.sku,
            attributes=v.attributes or {},
            selling_price=v.selling_price if v.selling_price is not None else product.selling_price,
            original_price=v.original_price if v.original_price is not None else product.original_price,
            is_active=v.is_active,
            current_stock=curr_stock,
            available_stock=avail
        ))
    
    image_outs = [
        ProductImageOut(
            id=img.id,
            product_id=img.product_id,
            image_url=img.image_url,
            alt_text=img.alt_text,
            display_order=img.display_order,
            is_main=img.is_main,
            variant_id=img.variant_id
        ) for img in product.images
    ]

    return ProductOut(
        id=product.id,
        name=product.name,
        slug=product.slug,
        sku=product.sku,
        description=product.description,
        specifications=product.specifications or {},
        selling_price=product.selling_price,
        original_price=product.original_price,
        status=product.status,
        is_featured=product.is_featured,
        is_new_arrival=product.is_new_arrival,
        is_best_seller=product.is_best_seller,
        category_id=product.category_id,
        subcategory_id=product.subcategory_id,
        created_at=product.created_at,
        images=image_outs,
        variants=variant_outs
    )

@router.get("", response_model=List[ProductOut])
def list_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[Decimal] = None,
    max_price: Optional[Decimal] = None,
    sort: Optional[str] = Query("newest", pattern="^(newest|price_asc|price_desc|name)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    featured: Optional[bool] = None,
    new_arrival: Optional[bool] = None,
    best_seller: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Product).filter(Product.status == "published")

    if category:
        cat_obj = db.query(Category).filter(Category.slug == category).first()
        if cat_obj:
            query = query.filter((Product.category_id == cat_obj.id) | (Product.subcategory_id == cat_obj.id))
        else:
            return []

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(search_pattern)) | 
            (Product.description.ilike(search_pattern)) |
            (Product.sku.ilike(search_pattern))
        )

    if min_price is not None:
        query = query.filter(Product.selling_price >= min_price)
    if max_price is not None:
        query = query.filter(Product.selling_price <= max_price)

    if featured is not None:
        query = query.filter(Product.is_featured == featured)
    if new_arrival is not None:
        query = query.filter(Product.is_new_arrival == new_arrival)
    if best_seller is not None:
        query = query.filter(Product.is_best_seller == best_seller)

    if sort == "price_asc":
        query = query.order_by(Product.selling_price.asc())
    elif sort == "price_desc":
        query = query.order_by(Product.selling_price.desc())
    elif sort == "name":
        query = query.order_by(Product.name.asc())
    else: # newest
        query = query.order_by(Product.created_at.desc())

    offset = (page - 1) * limit
    products = query.offset(offset).limit(limit).all()

    return [serialize_product(p) for p in products]

@router.get("/{slug}", response_model=ProductOut)
def get_product_by_slug(slug: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.slug == slug, Product.status == "published").first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return serialize_product(product)

@router.get("/{product_id}/reviews")
def get_product_reviews(product_id: str, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(
        Review.product_id == product_id,
        Review.is_approved == True
    ).order_by(Review.created_at.desc()).all()
    
    return [
        {
            "id": r.id,
            "rating": r.rating,
            "comment": r.comment,
            "customer_name": r.user.full_name if r.user else "Verified Customer",
            "created_at": r.created_at
        }
        for r in reviews
    ]

@router.post("/{product_id}/reviews")
def submit_product_review(
    product_id: str,
    rating: int = Query(..., ge=1, le=5),
    comment: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id, Product.status == "published").first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    review = Review(
        product_id=product.id,
        user_id=current_user.id,
        rating=rating,
        comment=comment,
        is_approved=True # Genuine user review
    )
    db.add(review)
    db.commit()
    return {"message": "Review submitted successfully."}
