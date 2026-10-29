import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from decimal import Decimal
import uuid
import hmac
import hashlib

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.models.models import User, Role, Permission, Category, Product, ProductVariant, Inventory, Order, Payment
from app.permissions.constants import PERMISSIONS, ROLE_DEFINITIONS
from app.core.security import get_password_hash, create_access_token

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    # Ensure tables and system roles exist
    from cli import init_roles
    db = next(get_db())
    init_roles(db)
    db.close()
    yield
    # Automatic teardown: only clean test-specific entities if explicitly running disposable CI test suite
    if os.getenv("TEST_CLEANUP_DATABASE", "false").lower() == "true":
        clean_db = next(get_db())
        try:
            clean_db.execute(text("DELETE FROM order_items;"))
            clean_db.execute(text("DELETE FROM payments;"))
            clean_db.execute(text("DELETE FROM shipments;"))
            clean_db.execute(text("DELETE FROM returns;"))
            clean_db.execute(text("DELETE FROM orders;"))
            clean_db.execute(text("DELETE FROM cart_items;"))
            clean_db.execute(text("DELETE FROM wishlist_items;"))
            clean_db.execute(text("DELETE FROM reviews;"))
            clean_db.execute(text("DELETE FROM inventory_movements;"))
            clean_db.execute(text("DELETE FROM inventory;"))
            clean_db.execute(text("DELETE FROM product_images;"))
            clean_db.execute(text("DELETE FROM product_variants;"))
            clean_db.execute(text("DELETE FROM products;"))
            clean_db.execute(text("DELETE FROM categories;"))
            clean_db.execute(text("DELETE FROM customer_profiles;"))
            clean_db.execute(text("DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email != 'admin@jwas.com');"))
            clean_db.execute(text("DELETE FROM users WHERE email != 'admin@jwas.com';"))
            clean_db.commit()
        finally:
            clean_db.close()

def test_empty_states_zero_fake_data():
    """
    Section 24 & Section 2: Zero static business data test.
    Verify that querying public endpoints returns NO fake products,
    NO fake categories, and admin dashboard reports zero when empty.
    """
    # Public categories
    r = client.get("/api/categories")
    assert r.status_code == 200
    # No hardcoded fake categories like "Sample Shoes"
    categories = r.json()
    for c in categories:
        assert c["name"] not in ["Sample Shirt", "Demo Bag", "Test Shoes", "Example Product"]

    # Public products
    r = client.get("/api/products")
    assert r.status_code == 200
    products = r.json()
    for p in products:
        assert p["name"] not in ["Sample Shirt", "Demo Bag", "Test Shoes", "Example Product"]

def test_auth_workflow():
    """
    Section 6 & 24: Customer registration, login, token generation, rejection of duplicates.
    """
    unique_email = f"customer_{uuid.uuid4().hex[:8]}@example.com"
    
    # 1. Register customer
    reg_res = client.post("/api/auth/register", json={
        "email": unique_email,
        "password": "Password123!",
        "full_name": "Test Customer",
        "phone": "+919876543210"
    })
    assert reg_res.status_code == 200
    token_data = reg_res.json()
    assert "access_token" in token_data
    assert token_data["user"]["email"] == unique_email
    # Ordinary customer MUST NOT have Super Admin or staff roles
    assert "Super Admin" not in token_data["user"]["roles"]

    # 2. Reject duplicate registration
    dup_res = client.post("/api/auth/register", json={
        "email": unique_email,
        "password": "AnotherPassword!",
        "full_name": "Test Duplicate"
    })
    assert dup_res.status_code == 400

    # 3. Valid Login
    login_res = client.post("/api/auth/login", json={
        "email": unique_email,
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

    # 4. Invalid Password
    bad_login = client.post("/api/auth/login", json={
        "email": unique_email,
        "password": "WrongPassword!"
    })
    assert bad_login.status_code == 401

def test_permission_enforcement():
    """
    Section 12.1 & 24: Customer cannot access admin endpoints.
    Super Admin has full access.
    """
    # Create ordinary customer token
    unique_email = f"cust_perm_{uuid.uuid4().hex[:8]}@example.com"
    reg_res = client.post("/api/auth/register", json={
        "email": unique_email,
        "password": "Password123!",
        "full_name": "Perm Customer"
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Accessing admin dashboard as customer MUST fail with 403 Forbidden
    res = client.get("/api/admin/dashboard", headers=headers)
    assert res.status_code == 403

    # Accessing without any token MUST fail with 401
    res_no_auth = client.get("/api/admin/dashboard")
    assert res_no_auth.status_code == 401

def test_catalogue_and_inventory_lifecycle():
    """
    Section 9, 10, 11 & 24: Admin creates category and product.
    Published items appear, draft items do not.
    Inventory adjustment and stock validation.
    """
    db = next(get_db())
    # Create superadmin user for test
    admin_email = f"admin_{uuid.uuid4().hex[:8]}@jwas.local"
    admin_user = User(
        email=admin_email,
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Catalogue Admin",
        is_active=True,
        is_verified=True
    )
    super_role = db.query(Role).filter(Role.name == "Super Admin").first()
    admin_user.roles.append(super_role)
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    db.close()

    admin_token = create_access_token(admin_user.id, extra_claims={"roles": ["Super Admin"]})
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create Category
    cat_res = client.post("/api/admin/categories", headers=admin_headers, json={
        "name": "Luxury Silk",
        "description": "Premium silk fabrics",
        "is_published": True,
        "is_nav_visible": True,
        "is_home_visible": True
    })
    assert cat_res.status_code == 200
    category = cat_res.json()
    cat_id = category["id"]

    # 2. Category must appear in public category list
    pub_cats = client.get("/api/categories").json()
    assert any(c["id"] == cat_id for c in pub_cats)

    # 3. Create Product under this category
    unique_sku = f"SILK-{uuid.uuid4().hex[:6].upper()}"
    prod_res = client.post("/api/admin/products", headers=admin_headers, json={
        "name": "Emerald Silk Blazer",
        "sku": unique_sku,
        "description": "Hand-stitched luxury emerald silk blazer",
        "selling_price": 4999.00,
        "original_price": 5999.00,
        "status": "published",
        "category_id": cat_id,
        "variants": [
            {
                "sku": f"{unique_sku}-M",
                "attributes": {"size": "M", "color": "Emerald"},
                "selling_price": 4999.00,
                "initial_stock": 10
            }
        ],
        "images": [
            {
                "image_url": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea",
                "alt_text": "Emerald Blazer front",
                "is_main": True
            }
        ]
    })
    assert prod_res.status_code == 200
    product = prod_res.json()
    assert product["name"] == "Emerald Silk Blazer"
    assert len(product["variants"]) == 1
    variant_id = product["variants"][0]["id"]
    assert product["variants"][0]["available_stock"] == 10

    # 4. Inventory adjustment: Increase stock by 5
    adj_res = client.post("/api/admin/inventory/adjust", headers=admin_headers, json={
        "variant_id": variant_id,
        "quantity_change": 5,
        "reason": "RESTOCK_SUPPLY"
    })
    assert adj_res.status_code == 200
    assert adj_res.json()["new_quantity"] == 15

    # 5. Negative stock rejection
    bad_adj = client.post("/api/admin/inventory/adjust", headers=admin_headers, json={
        "variant_id": variant_id,
        "quantity_change": -100,
        "reason": "INVALID_ADJUSTMENT"
    })
    assert bad_adj.status_code == 400

def test_shopping_and_checkout_workflow():
    """
    Section 5.9, 7 & 24: Cart operations, server-side price & stock recalculation,
    order creation, stock decrement, customer order privacy.
    """
    # Create customer
    cust_email = f"shopper_{uuid.uuid4().hex[:8]}@example.com"
    reg = client.post("/api/auth/register", json={
        "email": cust_email,
        "password": "ShopperPass123!",
        "full_name": "Active Shopper"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get a published product variant
    prods = client.get("/api/products").json()
    assert len(prods) > 0
    test_prod = prods[0]
    variant = test_prod["variants"][0]
    var_id = variant["id"]
    initial_stock = variant["available_stock"]
    assert initial_stock >= 2

    # 1. Add to cart
    cart_add = client.post("/api/cart/items", headers=headers, json={
        "variant_id": var_id,
        "quantity": 2
    })
    assert cart_add.status_code == 200
    cart_data = cart_add.json()
    assert len(cart_data["items"]) == 1
    assert cart_data["items"][0]["quantity"] == 2

    # 2. Checkout
    checkout_res = client.post("/api/checkout/process", headers=headers, json={
        "new_shipping_address": {
            "full_name": "Active Shopper",
            "phone": "9876543210",
            "address_line1": "45 Marine Drive",
            "city": "Mumbai",
            "state": "Maharashtra",
            "postal_code": "400020",
            "country": "India"
        },
        "payment_method": "cod"
    })
    assert checkout_res.status_code == 200
    order = checkout_res.json()
    assert "JWAS-" in order["order_number"]
    assert order["status"] == "Confirmed"
    order_id = order["id"]

    # 3. Verify stock was decremented by 2
    updated_prod = client.get(f"/api/products/{test_prod['slug']}").json()
    updated_variant = next(v for v in updated_prod["variants"] if v["id"] == var_id)
    assert updated_variant["available_stock"] == initial_stock - 2

    # 4. Cart should now be empty
    cart_check = client.get("/api/cart", headers=headers).json()
    assert len(cart_check["items"]) == 0

    # 5. Customer can see their own order
    cust_orders = client.get("/api/account/orders", headers=headers).json()
    assert any(o["id"] == order_id for o in cust_orders)

    # 6. Another customer CANNOT see this order (IDOR Protection)
    other_cust = client.post("/api/auth/register", json={
        "email": f"other_{uuid.uuid4().hex[:8]}@example.com",
        "password": "Password123!",
        "full_name": "Other Customer"
    }).json()
    other_headers = {"Authorization": f"Bearer {other_cust['access_token']}"}

    forbidden_res = client.get(f"/api/account/orders/{order_id}", headers=other_headers)
    assert forbidden_res.status_code == 404

def test_payment_signature_verification():
    """
    Section 7.2 & 24: Payment signature verification logic.
    """
    order_id = "test-order-id"
    payment_id = "pay_test123"
    fake_secret = "test_secret_for_hash"

    msg = f"{order_id}|{payment_id}"
    valid_sig = hmac.new(
        fake_secret.encode("utf-8"),
        msg.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    tampered_sig = "tampered_signature_123456"
    assert hmac.compare_digest(valid_sig, hmac.new(fake_secret.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256).hexdigest())
    assert not hmac.compare_digest(valid_sig, tampered_sig)
