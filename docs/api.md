# JWAS REST API Reference

All endpoints are served under `/api` and return standardized JSON responses.

## 1. Authentication (`/api/auth`)
- `POST /api/auth/register`: Register new customer profile (role selection strictly disallowed).
- `POST /api/auth/login`: Authenticate and receive JWT Bearer token, permissions, and roles.
- `GET /api/auth/me`: Retrieve current authenticated user profile.
- `POST /api/auth/logout`: Invalidate client session.

## 2. Public Catalogue (`/api/categories`, `/api/products`)
- `GET /api/categories`: Returns published categories and active subcategories.
- `GET /api/categories/{slug}`: Category metadata by slug.
- `GET /api/products`: Filterable by category, price range, search term, sort order. Only published products returned.
- `GET /api/products/{slug}`: Complete product detail with variants and image gallery.
- `GET /api/products/{id}/reviews`: Verified customer reviews.

## 3. Persistent Cart & Checkout (`/api/cart`, `/api/checkout`)
- `GET /api/cart`: Current session or customer cart with verified stock calculations.
- `POST /api/cart/items`: Add variant with server-side stock limit checks.
- `PUT /api/cart/items/{id}`: Update quantity.
- `DELETE /api/cart/items/{id}`: Remove item.
- `POST /api/checkout/preview`: Recalculates subtotal, shipping, discounts, and taxes.
- `POST /api/checkout/process`: Atomically locks inventory rows, commits order, deducts stock, records payment entity.

## 4. Payments (`/api/payments`, `/api/webhooks`)
- `POST /api/payments/initiate/{order_id}`: Initiates Razorpay or COD payment order.
- `POST /api/payments/verify`: Verifies Razorpay HMAC-SHA256 signature and confirms order.
- `POST /api/webhooks/payments`: Idempotently processes payment events.

## 5. Administrative Control (`/api/admin/*`)
- Protected by discrete permissions:
  - `/api/admin/dashboard`: Real-time computed revenue, low stock counts, order metrics.
  - `/api/admin/products`: Product CRUD and variant inventory provisioning.
  - `/api/admin/categories`: Category tree management.
  - `/api/admin/inventory`: Variant stock adjustments and movement audit logs.
  - `/api/admin/orders`: State machine transitions, tracking updates, and refunds.
  - `/api/admin/promotions`: Coupon generation and usage limits.
  - `/api/admin/cms`: Hero banners and section controls.
  - `/api/admin/staff`: Provisioning staff accounts and assigning roles.
  - `/api/admin/reports`: Realized gross/net revenue reports and CSV exports.
  - `/api/admin/settings`: Business settings, shipping rates, and tax percentages.
