from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal

from app.core.database import get_db
from app.models.models import Product, Category, Order, User, Inventory, Refund, ProductVariant, OrderItem
from app.permissions.deps import require_permission

router = APIRouter(prefix="/admin/dashboard", tags=["Admin Dashboard"])

@router.get("")
def get_dashboard_metrics(
    user = Depends(require_permission("reports.read")),
    db: Session = Depends(get_db)
):
    total_products = db.query(Product).count()
    published_products = db.query(Product).filter(Product.status == "published").count()
    draft_products = db.query(Product).filter(Product.status == "draft").count()
    total_categories = db.query(Category).count()

    # Inventory metrics
    low_stock_count = db.query(Inventory).filter(
        Inventory.current_stock <= Inventory.low_stock_threshold,
        Inventory.current_stock > 0
    ).count()
    out_of_stock_count = db.query(Inventory).filter(Inventory.current_stock <= 0).count()

    # Orders metrics
    total_orders = db.query(Order).count()
    new_orders_count = db.query(Order).filter(Order.status.in_(["Confirmed", "Pending Payment"])).count()
    awaiting_processing = db.query(Order).filter(Order.status == "Confirmed").count()
    awaiting_shipment = db.query(Order).filter(Order.status.in_(["Processing", "Packed"])).count()

    # Customer count
    total_customers = db.query(User).count()

    # Sales calculations: ONLY from actual database records where payment was completed/confirmed!
    # No fabricated revenue
    paid_orders = db.query(Order).filter(Order.payment_status == "Paid").all()
    gross_sales = sum([o.total_amount for o in paid_orders], Decimal("0.00"))

    # Refunds
    completed_refunds = db.query(Refund).filter(Refund.status == "Completed").all()
    refund_total = sum([r.amount for r in completed_refunds], Decimal("0.00"))
    net_sales = max(Decimal("0.00"), gross_sales - refund_total)

    # Recent orders
    recent_orders = db.query(Order).order_by(Order.created_at.desc()).limit(5).all()

    return {
        "total_products": total_products,
        "published_products": published_products,
        "draft_products": draft_products,
        "total_categories": total_categories,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "total_orders": total_orders,
        "new_orders": new_orders_count,
        "awaiting_processing": awaiting_processing,
        "awaiting_shipment": awaiting_shipment,
        "total_customers": total_customers,
        "gross_sales": float(gross_sales),
        "refund_total": float(refund_total),
        "net_sales": float(net_sales),
        "recent_orders": [
            {
                "id": o.id,
                "order_number": o.order_number,
                "status": o.status,
                "payment_status": o.payment_status,
                "total_amount": float(o.total_amount),
                "created_at": o.created_at
            }
            for o in recent_orders
        ]
    }
