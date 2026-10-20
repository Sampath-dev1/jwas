from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import HomepageSection, Banner, WebsiteSetting

router = APIRouter(prefix="/cms", tags=["Public CMS"])

@router.get("/homepage")
def get_public_homepage(db: Session = Depends(get_db)):
    sections = db.query(HomepageSection).filter(
        HomepageSection.is_active == True
    ).order_by(HomepageSection.display_order.asc()).all()

    banners = db.query(Banner).filter(
        Banner.is_active == True
    ).order_by(Banner.display_order.asc()).all()

    return {
        "sections": [
            {
                "id": s.id,
                "type": s.section_type,
                "title": s.title,
                "subtitle": s.subtitle,
                "content": s.content
            }
            for s in sections
        ],
        "banners": [
            {
                "id": b.id,
                "title": b.title,
                "image_url": b.image_url,
                "destination_url": b.destination_url,
                "button_text": b.button_text
            }
            for b in banners
        ]
    }

@router.get("/settings")
def get_public_settings(db: Session = Depends(get_db)):
    settings_records = db.query(WebsiteSetting).all()
    result = {}
    for s in settings_records:
        result[s.key] = s.value
    return result
