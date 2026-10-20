from fastapi import APIRouter, Request, Header, HTTPException, Depends, status
from sqlalchemy.orm import Session
import hmac
import hashlib
from datetime import datetime, timezone
import json

from app.core.database import get_db
from app.core.config import settings
from app.models.models import PaymentWebhookEvent, Payment, Order

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

@router.post("/payments")
async def payment_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None, alias="X-Razorpay-Signature"),
    db: Session = Depends(get_db)
):
    body = await request.body()
    
    # Signature verification
    if settings.PAYMENT_WEBHOOK_SECRET:
        if not x_razorpay_signature:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing webhook signature.")
        expected_sig = hmac.new(
            settings.PAYMENT_WEBHOOK_SECRET.encode("utf-8"),
            body,
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected_sig, x_razorpay_signature):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature.")

    try:
        payload = json.loads(body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload.")

    event_id = payload.get("event_id") or payload.get("id") or str(hash(body))
    event_type = payload.get("event", "unknown")

    # Idempotency check: Has this event already been processed?
    existing_event = db.query(PaymentWebhookEvent).filter(PaymentWebhookEvent.event_id == event_id).first()
    if existing_event and existing_event.processed:
        return {"status": "ignored", "message": "Event already processed"}

    webhook_record = existing_event or PaymentWebhookEvent(
        event_id=event_id,
        event_type=event_type,
        payload=payload,
        processed=False
    )
    if not existing_event:
        db.add(webhook_record)
        db.flush()

    # Process event
    if event_type == "payment.captured":
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_provider_id = entity.get("order_id")
        payment_id = entity.get("id")

        if order_provider_id:
            payment = db.query(Payment).filter(Payment.provider_order_id == order_provider_id).first()
            if payment:
                payment.status = "Success"
                payment.transaction_id = payment_id
                payment.order.payment_status = "Paid"
                payment.order.status = "Confirmed"

    webhook_record.processed = True
    webhook_record.processed_at = datetime.now(timezone.utc)
    db.commit()

    return {"status": "processed"}
