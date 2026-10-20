# JWAS Platform Architecture

## 1. System Overview
JWAS is an enterprise, production-oriented dynamic e-commerce platform built for high-end clothing and lifestyle brands. It adheres strictly to the **Zero Static Business Data** principle: every product, price, inventory unit, category, order, coupon, and revenue statistic is deterministically retrieved and committed to a persistent PostgreSQL ledger.

```
                    ┌───────────────────────────────┐
                    │     Client Web Applications   │
                    │   - Customer Online Store     │
                    │   - Admin & Staff Dashboard   │
                    └──────────────┬────────────────┘
                                   │ HTTPS / REST JSON
                                   ▼
                    ┌───────────────────────────────┐
                    │      FastAPI Backend API      │
                    │   - JWT Auth & RBAC Guard     │
                    │   - Order State-Machine       │
                    │   - Row-Locking Concurrency   │
                    │   - Payment Verification      │
                    └──────────────┬────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   ┌──────────────────────┐                  ┌──────────────────────┐
   │ PostgreSQL Database  │                  │  External Services   │
   │  - 36 Normalized     │                  │   - Razorpay API     │
   │    Tables            │                  │   - SMTP Relays      │
   │  - Atomic Locks      │                  │   - Object Storage   │
   └──────────────────────┘                  └──────────────────────┘
```

## 2. Core Architectural Principles
1. **Zero Hardcoded Business Content**: No placeholder products, fabricated sales numbers, or synthetic customer testimonials exist. Clean empty states render dynamically when entities have not been published.
2. **Server-Authoritative Validation**: Browser totals, prices, and discounts are never trusted. All calculations occur server-side with strict row locks (`SELECT FOR UPDATE`) on product variant inventory during order processing.
3. **Decoupled Customer & Admin Portals**: The customer storefront and admin dashboard operate independently. Administrative endpoints verify RBAC permissions at the API layer.
4. **Idempotent Financial Transactions**: Payment signatures are validated using HMAC-SHA256, and webhook delivery is deduplicated via unique event logging.
