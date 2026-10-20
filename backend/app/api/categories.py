from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import Category
from app.schemas.schemas import CategoryOut

router = APIRouter(prefix="/categories", tags=["Public Categories"])

@router.get("", response_model=List[CategoryOut])
def list_published_categories(db: Session = Depends(get_db)):
    """
    Returns only active, published parent categories with their active, published subcategories.
    No hardcoded categories or fake mock data.
    """
    categories = db.query(Category).filter(
        Category.is_published == True,
        Category.parent_id == None
    ).order_by(Category.display_order.asc(), Category.name.asc()).all()
    
    result = []
    for cat in categories:
        subcats = [s for s in cat.subcategories if s.is_published]
        cat_data = CategoryOut(
            id=cat.id,
            name=cat.name,
            slug=cat.slug,
            description=cat.description,
            image_url=cat.image_url,
            parent_id=cat.parent_id,
            is_published=cat.is_published,
            is_nav_visible=cat.is_nav_visible,
            is_home_visible=cat.is_home_visible,
            display_order=cat.display_order,
            seo_title=cat.seo_title,
            seo_description=cat.seo_description,
            created_at=cat.created_at,
            updated_at=cat.updated_at,
            subcategories=[
                CategoryOut(
                    id=s.id,
                    name=s.name,
                    slug=s.slug,
                    description=s.description,
                    image_url=s.image_url,
                    parent_id=s.parent_id,
                    is_published=s.is_published,
                    is_nav_visible=s.is_nav_visible,
                    is_home_visible=s.is_home_visible,
                    display_order=s.display_order,
                    seo_title=s.seo_title,
                    seo_description=s.seo_description,
                    created_at=s.created_at,
                    updated_at=s.updated_at,
                    subcategories=[]
                ) for s in subcats
            ]
        )
        result.append(cat_data)
    return result

@router.get("/{slug}", response_model=CategoryOut)
def get_category_by_slug(slug: str, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.slug == slug, Category.is_published == True).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
    
    subcats = [s for s in category.subcategories if s.is_published]
    return CategoryOut(
        id=category.id,
        name=category.name,
        slug=category.slug,
        description=category.description,
        image_url=category.image_url,
        parent_id=category.parent_id,
        is_published=category.is_published,
        is_nav_visible=category.is_nav_visible,
        is_home_visible=category.is_home_visible,
        display_order=category.display_order,
        seo_title=category.seo_title,
        seo_description=category.seo_description,
        created_at=category.created_at,
        updated_at=category.updated_at,
        subcategories=[
            CategoryOut(
                id=s.id,
                name=s.name,
                slug=s.slug,
                description=s.description,
                image_url=s.image_url,
                parent_id=s.parent_id,
                is_published=s.is_published,
                is_nav_visible=s.is_nav_visible,
                is_home_visible=s.is_home_visible,
                display_order=s.display_order,
                seo_title=s.seo_title,
                seo_description=s.seo_description,
                created_at=s.created_at,
                updated_at=s.updated_at,
                subcategories=[]
            ) for s in subcats
        ]
    )
