from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import re

from app.core.database import get_db
from app.models.models import Category, Product
from app.schemas.schemas import CategoryCreate, CategoryUpdate, CategoryOut
from app.permissions.deps import require_permission
from app.utils.audit import log_audit_event

router = APIRouter(prefix="/admin/categories", tags=["Admin Categories"])

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text.strip('-')

@router.get("", response_model=List[CategoryOut])
def list_admin_categories(
    user = Depends(require_permission("categories.read")),
    db: Session = Depends(get_db)
):
    parents = db.query(Category).filter(Category.parent_id == None).order_by(Category.display_order.asc()).all()
    return parents

@router.post("", response_model=CategoryOut)
def create_category(
    cat_in: CategoryCreate,
    user = Depends(require_permission("categories.create")),
    db: Session = Depends(get_db)
):
    slug = cat_in.slug or slugify(cat_in.name)
    existing_slug = db.query(Category).filter(Category.slug == slug).first()
    if existing_slug:
        slug = f"{slug}-{db.query(Category).count() + 1}"

    if cat_in.parent_id:
        parent = db.query(Category).filter(Category.id == cat_in.parent_id).first()
        if not parent:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parent category not found.")

    category = Category(
        name=cat_in.name,
        slug=slug,
        description=cat_in.description,
        image_url=cat_in.image_url,
        parent_id=cat_in.parent_id,
        is_published=cat_in.is_published,
        is_nav_visible=cat_in.is_nav_visible,
        is_home_visible=cat_in.is_home_visible,
        display_order=cat_in.display_order,
        seo_title=cat_in.seo_title,
        seo_description=cat_in.seo_description
    )
    db.add(category)
    db.commit()
    db.refresh(category)

    log_audit_event(db, "CREATE", "Category", category.id, user.id, {"name": category.name})
    return category

@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: str,
    cat_in: CategoryUpdate,
    user = Depends(require_permission("categories.update")),
    db: Session = Depends(get_db)
):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    # Prevent circular reference
    if cat_in.parent_id and cat_in.parent_id == category_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A category cannot be its own parent.")

    update_data = cat_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cat, field, value)

    db.commit()
    db.refresh(cat)
    log_audit_event(db, "UPDATE", "Category", cat.id, user.id, update_data)
    return cat

@router.delete("/{category_id}")
def delete_category(
    category_id: str,
    user = Depends(require_permission("categories.update")),
    db: Session = Depends(get_db)
):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    # Check child categories or attached products
    has_children = db.query(Category).filter(Category.parent_id == category_id).count() > 0
    if has_children:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with subcategories. Reassign or delete subcategories first."
        )

    has_products = db.query(Product).filter(
        (Product.category_id == category_id) | (Product.subcategory_id == category_id)
    ).count() > 0
    if has_products:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category that has products attached. Deactivate the category or reassign its products."
        )

    db.delete(cat)
    db.commit()
    log_audit_event(db, "DELETE", "Category", category_id, user.id, {"name": cat.name})
    return {"message": "Category deleted successfully."}
