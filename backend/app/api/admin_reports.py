from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
import io
import csv

from app.core.database import get_db
from app.models.models import Order, OrderItem, Refund, ProductVariant, Inventory, Product
from app.permissions.deps import require_permission

router = APIRouter(prefix="/admin/reports", tags=["Admin Reports"])

@router.get("/summary")
def get_reports_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    user = Depends(require_permission("reports.read")),
    db: Session = Depends(get_db)
):
    query = db.query(Order).filter(Order.payment_status == "Paid")
    if start_date:
        query = query.filter(func.date(Order.created_at) >= start_date)
    if end_date:
        query = query.filter(func.date(Order.created_at) <= end_date)

    paid_orders = query.all()
    gross_sales = sum([o.total_amount for o in paid_orders], Decimal("0.00"))
    total_completed_orders = len([o for o in paid_orders if o.status in ["Delivered", "Shipped", "Confirmed", "Processing", "Packed"]])

    # Refunds in range
    ref_query = db.query(Refund).filter(Refund.status == "Completed")
    if start_date:
        ref_query = ref_query.filter(func.date(Refund.created_at) >= start_date)
    if end_date:
        ref_query = ref_query.filter(func.date(Refund.created_at) <= end_date)
    refunds = ref_query.all()
    total_refunds = sum([r.amount for r in refunds], Decimal("0.00"))
    net_sales = max(Decimal("0.00"), gross_sales - total_refunds)

    # Units sold
    units_sold = 0
    for o in paid_orders:
        for it in o.items:
            units_sold += it.quantity

    return {
        "gross_sales": float(gross_sales),
        "total_refunds": float(total_refunds),
        "net_sales": float(net_sales),
        "orders_count": len(paid_orders),
        "completed_orders": total_completed_orders,
        "units_sold": units_sold
    }

@router.get("/export-orders-csv")
def export_orders_csv(
    user = Depends(require_permission("reports.read")),
    db: Session = Depends(get_db)
):
    orders = db.query(Order).order_by(Order.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Order Number", "Date", "Customer ID", "Status", "Payment Status", "Subtotal", "Discount", "Shipping", "Tax", "Total Amount"])

    for o in orders:
        writer.writerow([
            o.order_number,
            o.created_at.isoformat(),
            o.user_id,
            o.status,
            o.payment_status,
            float(o.subtotal_amount),
            float(o.discount_amount),
            float(o.shipping_amount),
            float(o.tax_amount),
            float(o.total_amount)
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=orders_report.csv"}
    )
