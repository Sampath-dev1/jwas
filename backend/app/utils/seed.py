import os
import uuid
import mimetypes
import logging
from sqlalchemy.orm import Session
import httpx
from PIL import Image
import io

from app.core.config import settings
from app.models.models import (
    Category,
    Product,
    ProductVariant,
    Inventory,
    ProductImage,
    UploadedAsset,
    Banner,
    InventoryMovement,
    User
)

logger = logging.getLogger("jwas.seed")

# High-resolution, royalty-free luxury saree & ethnic fashion photography
CURATED_IMAGES = [
    {
        "name": "kanchipuram_crimson",
        "url": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&auto=format&fit=crop&q=85",
        "alt": "Kanchipuram Pure Zari Silk Saree in Crimson Red"
    },
    {
        "name": "banarasi_emerald",
        "url": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000&auto=format&fit=crop&q=85",
        "alt": "Banarasi Handloom Brocade Silk Saree in Emerald Green"
    },
    {
        "name": "chanderi_rose",
        "url": "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=1000&auto=format&fit=crop&q=85",
        "alt": "Chanderi Tissue Floral Organza Saree in Pastel Rose"
    },
    {
        "name": "mysore_royal_blue",
        "url": "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=1000&auto=format&fit=crop&q=85",
        "alt": "Mysore Crepe Silk Embroidered Saree in Royal Blue"
    },
    {
        "name": "tussar_kalamkari",
        "url": "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1000&auto=format&fit=crop&q=85",
        "alt": "Tussar Silk Hand-Painted Kalamkari Saree in Mustard"
    },
    {
        "name": "paithani_magenta",
        "url": "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=1000&auto=format&fit=crop&q=85",
        "alt": "Paithani Handwoven Peacock Motif Saree in Radiant Magenta"
    },
    {
        "name": "hero_heritage_silk",
        "url": "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=1600&auto=format&fit=crop&q=85",
        "alt": "The Heritage Silk Saree Collection 2026"
    }
]

def download_and_persist_asset(db: Session, image_meta: dict) -> str:
    """
    Downloads image once and permanently saves to PostgreSQL (UploadedAsset)
    and to disk (backend/uploads). Returns the relative upload URL (/uploads/xyz.jpg).
    """
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    slug_name = image_meta["name"]
    unique_filename = f"seed_{slug_name}.jpg"
    filepath = os.path.join(settings.UPLOAD_DIR, unique_filename)

    # Check if already in database
    existing_asset = db.query(UploadedAsset).filter(UploadedAsset.filename == unique_filename).first()
    if existing_asset and os.path.exists(filepath):
        return f"/uploads/{unique_filename}"

    # If already in DB but not on disk, write it
    if existing_asset and existing_asset.file_data:
        with open(filepath, "wb") as f:
            f.write(existing_asset.file_data)
        return f"/uploads/{unique_filename}"

    # Download from CDN
    try:
        resp = httpx.get(image_meta["url"], timeout=15.0, follow_redirects=True)
        resp.raise_for_status()
        raw_bytes = resp.content

        # Optimize image with PIL
        img = Image.open(io.BytesIO(raw_bytes))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        
        # Max dimensions for high quality display
        if max(img.width, img.height) > 1800:
            img.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
        
        out_buf = io.BytesIO()
        img.save(out_buf, format="JPEG", quality=88, optimize=True)
        optimized_bytes = out_buf.getvalue()

        # Save to disk
        with open(filepath, "wb") as f:
            f.write(optimized_bytes)

        # Save to DB
        asset = UploadedAsset(
            filename=unique_filename,
            content_type="image/jpeg",
            file_data=optimized_bytes
        )
        db.add(asset)
        db.commit()
        logger.info(f"Successfully persisted permanent asset: {unique_filename}")
        return f"/uploads/{unique_filename}"
    except Exception as e:
        logger.warning(f"Failed to fetch seed image {image_meta['url']}: {e}")
        # Create a clean fallback image if download fails
        img = Image.new("RGB", (800, 1000), color=(140, 30, 45))
        out_buf = io.BytesIO()
        img.save(out_buf, format="JPEG")
        data = out_buf.getvalue()
        with open(filepath, "wb") as f:
            f.write(data)
        asset = UploadedAsset(
            filename=unique_filename,
            content_type="image/jpeg",
            file_data=data
        )
        db.add(asset)
        db.commit()
        return f"/uploads/{unique_filename}"

def seed_sarees_catalogue(db: Session):
    """
    Populates the SAREES category and catalog with permanent products and images
    if no products currently exist.
    """
    product_count = db.query(Product).count()
    if product_count > 0:
        logger.info(f"Catalog already contains {product_count} product(s). Skipping seed.")
        return

    # Ensure SAREES category exists
    sarees_cat = db.query(Category).filter(Category.slug == "sarees").first()
    if not sarees_cat:
        sarees_cat = Category(
            name="SAREES",
            slug="sarees",
            description="Pure Silk, Banarasi, Kanchipuram and Handloom Sarees with authentic zari craft.",
            is_published=True,
            is_nav_visible=True,
            display_order=1
        )
        db.add(sarees_cat)
        db.flush()

    # Assign category banner image
    cat_img_url = download_and_persist_asset(db, CURATED_IMAGES[0])
    sarees_cat.image_url = cat_img_url

    # Ensure Hero Banner exists
    hero_count = db.query(Banner).count()
    if hero_count == 0:
        hero_img_url = download_and_persist_asset(db, CURATED_IMAGES[6])
        banner = Banner(
            title="The Heritage Silk Saree Collection 2026",
            image_url=hero_img_url,
            destination_url="/shop?category=sarees",
            button_text="Explore Collection",
            display_order=0,
            is_active=True
        )
        db.add(banner)
        db.commit()

    admin_user = db.query(User).filter(User.email == "admin@jwas.com").first()
    admin_id = admin_user.id if admin_user else None

    # Products definitions
    PRODUCTS = [
        {
            "name": "Kanchipuram Pure Zari Silk Saree",
            "sku": "SAR-KANCHI-01",
            "slug": "kanchipuram-pure-zari-silk-saree",
            "description": "Authentic Kanchipuram pure mulberry silk saree featuring intricate Korvai weave and pure gold-dipped zari borders.",
            "selling_price": 18500.00,
            "original_price": 24000.00,
            "stock": 15,
            "image": CURATED_IMAGES[0],
            "is_featured": True,
            "is_best_seller": True,
            "is_new_arrival": False
        },
        {
            "name": "Banarasi Handloom Brocade Silk Saree",
            "sku": "SAR-BANARAS-02",
            "slug": "banarasi-handloom-brocade-silk-saree",
            "description": "Rich emerald green Banarasi Katan silk saree handwoven with opulent floral brocade motifs and heritage royal pallu.",
            "selling_price": 14200.00,
            "original_price": 19500.00,
            "stock": 12,
            "image": CURATED_IMAGES[1],
            "is_featured": True,
            "is_best_seller": False,
            "is_new_arrival": True
        },
        {
            "name": "Chanderi Tissue Floral Organza Saree",
            "sku": "SAR-CHAND-03",
            "slug": "chanderi-tissue-floral-organza-saree",
            "description": "Lightweight pastel rose Chanderi organza saree woven with shimmering metallic tissue and subtle gold border accents.",
            "selling_price": 9800.00,
            "original_price": 13000.00,
            "stock": 20,
            "image": CURATED_IMAGES[2],
            "is_featured": False,
            "is_best_seller": False,
            "is_new_arrival": True
        },
        {
            "name": "Mysore Crepe Silk Embroidered Saree",
            "sku": "SAR-MYSORE-04",
            "slug": "mysore-crepe-silk-embroidered-saree",
            "description": "Luxurious royal blue Mysore crepe silk with solid metallic silver zari borders, providing graceful drapes and luster.",
            "selling_price": 11500.00,
            "original_price": 15500.00,
            "stock": 18,
            "image": CURATED_IMAGES[3],
            "is_featured": False,
            "is_best_seller": True,
            "is_new_arrival": False
        },
        {
            "name": "Tussar Silk Hand-Painted Kalamkari Saree",
            "sku": "SAR-KALAM-05",
            "slug": "tussar-silk-hand-painted-kalamkari-saree",
            "description": "Handcrafted mustard Tussar silk adorned with authentic natural vegetable dye Kalamkari storytelling art along the pallu.",
            "selling_price": 16800.00,
            "original_price": 21000.00,
            "stock": 8,
            "image": CURATED_IMAGES[4],
            "is_featured": True,
            "is_best_seller": False,
            "is_new_arrival": False
        },
        {
            "name": "Paithani Handwoven Peacock Motif Saree",
            "sku": "SAR-PAITH-06",
            "slug": "paithani-handwoven-peacock-motif-saree",
            "description": "Radiant magenta pure silk Paithani saree with traditional kaleidoscopic peacock motifs and oblique square border design.",
            "selling_price": 22000.00,
            "original_price": 28000.00,
            "stock": 10,
            "image": CURATED_IMAGES[5],
            "is_featured": True,
            "is_best_seller": True,
            "is_new_arrival": True
        }
    ]

    for p_info in PRODUCTS:
        img_url = download_and_persist_asset(db, p_info["image"])
        
        prod = Product(
            name=p_info["name"],
            sku=p_info["sku"],
            slug=p_info["slug"],
            description=p_info["description"],
            selling_price=p_info["selling_price"],
            original_price=p_info["original_price"],
            status="published",
            is_featured=p_info["is_featured"],
            is_new_arrival=p_info["is_new_arrival"],
            is_best_seller=p_info["is_best_seller"],
            category_id=sarees_cat.id
        )
        db.add(prod)
        db.flush()

        # Product Image
        img_rec = ProductImage(
            product_id=prod.id,
            image_url=img_url,
            alt_text=p_info["image"]["alt"],
            display_order=0,
            is_main=True
        )
        db.add(img_rec)

        # Variant & Inventory
        variant = ProductVariant(
            product_id=prod.id,
            sku=f"{prod.sku}-01",
            attributes={"standard": "Free Size (6.3m with Blouse)"},
            selling_price=prod.selling_price,
            original_price=prod.original_price,
            is_active=True
        )
        db.add(variant)
        db.flush()

        inv = Inventory(
            variant_id=variant.id,
            current_stock=p_info["stock"],
            reserved_stock=0,
            low_stock_threshold=3
        )
        db.add(inv)

        if admin_id:
            db.add(InventoryMovement(
                variant_id=variant.id,
                previous_quantity=0,
                quantity_change=p_info["stock"],
                new_quantity=p_info["stock"],
                reason="INITIAL_CATALOG_SEED",
                staff_id=admin_id
            ))

    db.commit()
    logger.info("Successfully seeded SAREES catalog with permanent high-resolution images!")
