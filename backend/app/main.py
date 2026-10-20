from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os
import logging

from app.core.config import settings
from app.api import (
    auth,
    categories,
    products,
    cart,
    checkout,
    payments,
    webhooks,
    account,
    admin_dashboard,
    admin_categories,
    admin_products,
    admin_inventory,
    admin_orders,
    admin_promotions,
    admin_cms,
    admin_staff,
    admin_roles,
    admin_reports,
    admin_settings,
    admin_customers,
    uploads,
    cms
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("jwas")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="JWAS Dynamic E-Commerce Backend API",
    version="1.0.0"
)

# CORS
origins = [
    settings.FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # allow all during dev for flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Automatic Database Bootstrap on Startup
@app.on_event("startup")
def bootstrap_database():
    try:
        from app.core.database import SessionLocal
        from cli import init_roles, create_superadmin
        db = SessionLocal()
        init_roles(db)
        db.close()
        create_superadmin("admin@jwas.com", "Admin@123", "System Superadmin")
        logger.info("Automatic database bootstrap successful: Superadmin ready.")
    except Exception as e:
        logger.warning(f"Startup bootstrap warning (will retry on next request): {e}")

# Root & Health Check
@app.get("/", tags=["Root"])
def root():
    return {
        "service": settings.PROJECT_NAME,
        "status": "online",
        "description": "JWAS Dynamic E-Commerce Backend API",
        "docs_url": "/docs",
        "health_url": "/health"
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT
    }

# Register Routers
app.include_router(auth.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(cart.router, prefix="/api")
app.include_router(checkout.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(webhooks.router, prefix="/api")
app.include_router(account.router, prefix="/api")
app.include_router(cms.router, prefix="/api")

# Admin Routers
app.include_router(admin_dashboard.router, prefix="/api")
app.include_router(admin_categories.router, prefix="/api")
app.include_router(admin_products.router, prefix="/api")
app.include_router(admin_inventory.router, prefix="/api")
app.include_router(admin_orders.router, prefix="/api")
app.include_router(admin_promotions.router, prefix="/api")
app.include_router(admin_cms.router, prefix="/api")
app.include_router(admin_staff.router, prefix="/api")
app.include_router(admin_roles.router, prefix="/api")
app.include_router(admin_reports.router, prefix="/api")
app.include_router(admin_settings.router, prefix="/api")
app.include_router(admin_customers.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")

# Global safe exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."}
    )
