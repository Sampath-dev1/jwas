import os
import json
import urllib.request
from decimal import Decimal
import uuid

from app.core.database import SessionLocal
from app.models import Category, Product, ProductImage, ProductVariant, Inventory

RENDER_API = "https://jwas.onrender.com/api"
RENDER_BASE = "https://jwas.onrender.com"
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.loads(res.read().decode('utf-8'))

def download_image(rel_url):
    if not rel_url or not rel_url.startswith('/uploads/'):
        return
    filename = os.path.basename(rel_url)
    local_path = os.path.join(UPLOADS_DIR, filename)
    if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
        return
    full_url = f"{RENDER_BASE}{rel_url}"
    try:
        req = urllib.request.Request(full_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as res:
            with open(local_path, 'wb') as f:
                f.write(res.read())
        print(f"Downloaded: {filename}")
    except Exception as e:
        print(f"Failed to download {full_url}: {e}")

def sync():
    db = SessionLocal()
    try:
        print("Fetching categories from Render...")
        categories_data = fetch_json(f"{RENDER_API}/categories")
        print(f"Got {len(categories_data)} categories.")

        # Sync categories
        for cat_d in categories_data:
            cat_id = cat_d['id']
            existing = db.query(Category).filter(Category.id == cat_id).first()
            if not existing:
                existing = Category(
                    id=cat_id,
                    name=cat_d['name'],
                    slug=cat_d['slug'],
                    description=cat_d.get('description', ''),
                    image_url=cat_d.get('image_url'),
                    parent_id=cat_d.get('parent_id'),
                    is_published=cat_d.get('is_published', True),
                    is_nav_visible=cat_d.get('is_nav_visible', True),
                    is_home_visible=cat_d.get('is_home_visible', True),
                    display_order=cat_d.get('display_order', 0),
                    seo_title=cat_d.get('seo_title'),
                    seo_description=cat_d.get('seo_description')
                )
                db.add(existing)
            else:
                existing.name = cat_d['name']
                existing.slug = cat_d['slug']
                existing.is_published = cat_d.get('is_published', True)
            
            if cat_d.get('image_url'):
                download_image(cat_d['image_url'])

        db.commit()

        print("Fetching products from Render...")
        products_data = fetch_json(f"{RENDER_API}/products")
        print(f"Got {len(products_data)} products.")

        for prod_d in products_data:
            prod_id = prod_d['id']
            existing_p = db.query(Product).filter(Product.id == prod_id).first()
            if not existing_p:
                existing_p = Product(
                    id=prod_id,
                    name=prod_d['name'],
                    slug=prod_d['slug'],
                    sku=prod_d['sku'],
                    description=prod_d.get('description', ''),
                    specifications=prod_d.get('specifications', {}),
                    selling_price=Decimal(str(prod_d['selling_price'])),
                    original_price=Decimal(str(prod_d['original_price'])) if prod_d.get('original_price') else None,
                    status=prod_d.get('status', 'published'),
                    is_featured=prod_d.get('is_featured', False),
                    is_new_arrival=prod_d.get('is_new_arrival', False),
                    is_best_seller=prod_d.get('is_best_seller', False),
                    category_id=prod_d['category_id'],
                    subcategory_id=prod_d.get('subcategory_id'),
                )
                db.add(existing_p)
                db.flush()
            else:
                existing_p.name = prod_d['name']
                existing_p.selling_price = Decimal(str(prod_d['selling_price']))
                existing_p.category_id = prod_d['category_id']

            # Sync images
            for img_d in prod_d.get('images', []):
                download_image(img_d.get('image_url'))
                img_id = img_d['id']
                existing_img = db.query(ProductImage).filter(ProductImage.id == img_id).first()
                if not existing_img:
                    existing_img = ProductImage(
                        id=img_id,
                        product_id=prod_id,
                        image_url=img_d['image_url'],
                        alt_text=img_d.get('alt_text'),
                        display_order=img_d.get('display_order', 0),
                        is_main=img_d.get('is_main', False),
                    )
                    db.add(existing_img)

            # Sync variants
            for var_d in prod_d.get('variants', []):
                var_id = var_d['id']
                existing_var = db.query(ProductVariant).filter(ProductVariant.id == var_id).first()
                if not existing_var:
                    existing_var = ProductVariant(
                        id=var_id,
                        product_id=prod_id,
                        sku=var_d['sku'],
                        attributes=var_d.get('attributes', {}),
                        selling_price=Decimal(str(var_d['selling_price'])),
                        original_price=Decimal(str(var_d['original_price'])) if var_d.get('original_price') else None,
                        is_active=True,
                    )
                    db.add(existing_var)
                    db.flush()

                # Ensure inventory record
                inv = db.query(Inventory).filter(Inventory.variant_id == var_id).first()
                if not inv:
                    inv = Inventory(
                        variant_id=var_id,
                        current_stock=var_d.get('available_stock', 15),
                        reserved_stock=0,
                        low_stock_threshold=3,
                    )
                    db.add(inv)

        db.commit()
        print("Sync completed successfully!")
    finally:
        db.close()

if __name__ == '__main__':
    sync()
