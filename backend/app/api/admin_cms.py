from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import HomepageSection, Banner, WebsiteSetting
from app.schemas.schemas import (
    HomepageSectionCreate, HomepageSectionOut,
    BannerCreate, BannerOut,
    WebsiteSettingUpdate
)
from app.permissions.deps import require_permission
from app.utils.audit import log_audit_event

router = APIRouter(prefix="/admin/cms", tags=["Admin Content Management"])

# Sections
@router.get("/sections", response_model=List[HomepageSectionOut])
def list_admin_sections(
    user = Depends(require_permission("promotions.manage")),
    db: Session = Depends(get_db)
):
    return db.query(HomepageSection).order_by(HomepageSection.display_order.asc()).all()

@router.post("/sections", response_model=HomepageSectionOut)
def create_section(
    sec_in: HomepageSectionCreate,
    user = Depends(require_permission("promotions.manage")),
    db: Session = Depends(get_db)
):
    section = HomepageSection(
        section_type=sec_in.section_type,
        title=sec_in.title,
        subtitle=sec_in.subtitle,
        content=sec_in.content,
        display_order=sec_in.display_order,
        is_active=sec_in.is_active
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    log_audit_event(db, "CREATE_CMS_SECTION", "HomepageSection", section.id, user.id)
    return section

@router.delete("/sections/{sec_id}")
def delete_section(
    sec_id: str,
    user = Depends(require_permission("promotions.manage")),
    db: Session = Depends(get_db)
):
    sec = db.query(HomepageSection).filter(HomepageSection.id == sec_id).first()
    if sec:
        db.delete(sec)
        db.commit()
    return {"message": "Section deleted."}

# Banners
@router.get("/banners", response_model=List[BannerOut])
def list_admin_banners(
    user = Depends(require_permission("promotions.manage")),
    db: Session = Depends(get_db)
):
    return db.query(Banner).order_by(Banner.display_order.asc()).all()

@router.post("/banners", response_model=BannerOut)
def create_banner(
    ban_in: BannerCreate,
    user = Depends(require_permission("promotions.manage")),
    db: Session = Depends(get_db)
):
    banner = Banner(
        title=ban_in.title,
        image_url=ban_in.image_url,
        destination_url=ban_in.destination_url,
        button_text=ban_in.button_text,
        display_order=ban_in.display_order,
        is_active=ban_in.is_active
    )
    db.add(banner)
    db.commit()
    db.refresh(banner)
    log_audit_event(db, "CREATE_BANNER", "Banner", banner.id, user.id)
    return banner

@router.delete("/banners/{banner_id}")
def delete_banner(
    banner_id: str,
    user = Depends(require_permission("promotions.manage")),
    db: Session = Depends(get_db)
):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if banner:
        db.delete(banner)
        db.commit()
    return {"message": "Banner deleted."}
