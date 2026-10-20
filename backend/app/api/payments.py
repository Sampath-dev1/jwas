from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import hmac
import hashlib
from app.core.database import get_db
from app.core.config import settings
from app.models.models import Order, Payment, User
from app.schemas.schemas import PaymentInitiateResponse, PaymentVerifyRequest
from app.permissions.deps import get_current_user

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/initiate/{order_id}", response_model=PaymentInitiateResponse)
def initiate_payment(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    payment = db.query(Payment).filter(Payment.order_id == order.id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No payment record found for order.")

    if payment.provider == "cod":
        return PaymentInitiateResponse(
            order_id=order.id,
            order_number=order.order_number,
            amount=order.total_amount,
            currency=order.currency,
            payment_provider="cod"
        )

    # Razorpay online payment
    if not settings.PAYMENT_GATEWAY_KEY_ID or not settings.PAYMENT_GATEWAY_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment gateway is not configured. Please configure PAYMENT_GATEWAY_KEY_ID and PAYMENT_GATEWAY_KEY_SECRET."
        )

    import razorpay
    client = razorpay.Client(auth=(settings.PAYMENT_GATEWAY_KEY_ID, settings.PAYMENT_GATEWAY_KEY_SECRET))

    # Amount in paise (integer minor units)
    amount_in_paise = int(order.total_amount * 100)
    data = {
        "amount": amount_in_paise,
        "currency": "INR",
        "receipt": order.order_number,
        "payment_capture": 1
    }

    try:
        razorpay_order = client.order.create(data=data)
        payment.provider_order_id = razorpay_order["id"]
        db.commit()

        return PaymentInitiateResponse(
            order_id=order.id,
            order_number=order.order_number,
            amount=order.total_amount,
            currency="INR",
            payment_provider="razorpay",
            razorpay_order_id=razorpay_order["id"],
            razorpay_key_id=settings.PAYMENT_GATEWAY_KEY_ID
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate payment with provider: {str(e)}"
        )

@router.post("/verify")
def verify_payment(
    req: PaymentVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == req.order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    payment = db.query(Payment).filter(Payment.order_id == order.id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment record not found.")

    if not settings.PAYMENT_GATEWAY_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment secret configuration is missing on server."
        )

    # Server-side cryptographic signature verification
    msg = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
    generated_signature = hmac.new(
        settings.PAYMENT_GATEWAY_KEY_SECRET.encode("utf-8"),
        msg.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(generated_signature, req.razorpay_signature):
        payment.status = "Failed"
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payment signature.")

    # Successful verification
    payment.status = "Success"
    payment.transaction_id = req.razorpay_payment_id
    payment.provider_signature = req.razorpay_signature
    order.payment_status = "Paid"
    order.status = "Confirmed"

    db.commit()
    return {"message": "Payment verified and order confirmed successfully.", "order_number": order.order_number}
