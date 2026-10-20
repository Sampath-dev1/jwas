# Security Architecture & Best Practices

The JWAS platform implements defense-in-depth across the API, database, and presentation layers.

## 1. Authentication & Session Security
- **Bcrypt Hashing**: Passwords are saved exclusively as salted bcrypt hashes (work factor 12).
- **JWT Cryptography**: Authentication tokens are signed using HMAC-SHA256 with server-held secrets.
- **Client Privilege Isolation**: Customer registration routes do not accept role parameters; privileges cannot be self-assigned.

## 2. Granular Role-Based Access Control (RBAC)
- All privileged endpoints check specific permission codes (e.g. `products.create`, `orders.update`, `refunds.approve`).
- The backend independently evaluates role membership for every request, regardless of client UI state.

## 3. Broken Object-Level Authorization (BOLA / IDOR) Safeguards
- Order and address queries strictly filter by `user_id == current_user.id`.
- Modifying order IDs in requests cannot reveal other customers' names, addresses, or purchase history.

## 4. Payment & Concurrency Security
- **Server Verification**: Orders are never confirmed until the Razorpay signature `order_id|payment_id` is matched against the SHA256 HMAC of the secret key.
- **Webhook Idempotency**: Payment webhook events log unique event IDs to prevent duplicate fulfillment or double-charging.
- **Row-Locking Concurrency**: Inventory updates use `with_for_update()` inside database transactions, preventing race conditions.
