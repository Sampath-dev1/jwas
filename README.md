# JWAS — Complete Dynamic E-Commerce Platform

A production-grade, database-driven e-commerce platform for high-end clothing and lifestyle brands. Built with **Next.js (React 19)**, **Tailwind CSS**, **FastAPI (Python 3.12)**, **PostgreSQL 16**, and **Alembic**.

JWAS is engineered around the core requirement of **Zero Static Business Data**:
- Every product, category, stock count, price, coupon, review, and sales metric originates from persistent database records or verified external APIs.
- When no data exists, the application presents polished, context-specific empty states rather than placeholder mock content.

---

## Architecture Overview

```
jwas/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/              # Public & Admin API Routers
│   │   ├── core/             # Configuration, Database, Security
│   │   ├── models/           # 36 Normalized SQLAlchemy Models
│   │   ├── schemas/          # Pydantic Request/Response Models
│   │   ├── permissions/      # Granular RBAC System
│   │   ├── utils/            # Audit Trail Logging & Helpers
│   │   └── tests/            # Automated Pytest Suite
│   ├── migrations/           # Alembic Transactional Migrations
│   ├── cli.py                # Admin Setup & Role Initialization CLI
│   └── requirements.txt      # Python Dependencies
├── frontend/                 # Next.js 16 (App Router + Turbopack)
│   ├── app/
│   │   ├── shop/             # Dynamic Catalogue with Filters & Sorting
│   │   ├── categories/       # Category Hierarchy & Dynamic Pages
│   │   ├── products/         # Product Detail with Variant Stock & Gallery
│   │   ├── cart/             # Persistent Cart with Promo Coupon Engine
│   │   ├── checkout/         # Server-Recalculated Checkout & Address Book
│   │   ├── account/          # Customer Portal (Orders, Tracking, Returns)
│   │   └── admin/            # Complete Control Center Suite
│   │       ├── products/     # Product Catalog CRUD
│   │       ├── categories/   # Category Hierarchy Management
│   │       ├── inventory/    # Stock Levels, Alerts & Adjustment Audits
│   │       ├── orders/       # Order State Machine & Refund Issuance
│   │       ├── customers/    # Customer Registry & Lifetime History
│   │       ├── promotions/   # Coupons & Promotion Rules
│   │       ├── cms/          # Homepage Hero Banners & Sections
│   │       ├── staff/        # Staff Accounts & Role Assignment
│   │       ├── reports/      # Real Sales Analytics & CSV Export
│   │       └── settings/     # Shipping Methods & GST Tax Rules
│   ├── components/           # Reusable UI Design System
│   └── lib/                  # Authoritative API Client
├── docs/                     # Full Documentation Suite
│   ├── architecture.md
│   ├── database.md
│   ├── api.md
│   ├── deployment.md
│   ├── backup-recovery.md
│   └── security.md
└── README.md
```

---

## Quick Start & Local Setup

### 1. Prerequisites
- **PostgreSQL 15+** running locally (e.g., `postgresql://postgres:postgres@localhost:5432/jwas_db`)
- **Python 3.11+**
- **Node.js 18+** and **npm**

### 2. Database Creation
In PostgreSQL:
```sql
CREATE DATABASE jwas_db;
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Run database migrations
alembic upgrade head

# Initialize RBAC permissions & roles
python cli.py init-roles

# Provision the first Super Admin account
python cli.py create-superadmin --email "admin@jwas.com" --password "AdminSecret123!" --name "System Superadmin"

# Start the API server
uvicorn app.main:app --port 8000 --reload
```
The interactive API docs will be accessible at: `http://localhost:8000/docs`

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The storefront will be live at: `http://localhost:3000`  
The administrative dashboard is accessible at: `http://localhost:3000/admin`

---

## Automated Test Suite

The test suite validates empty-state integrity, authentication, role-based access control, inventory locking, checkout recalculation, and payment verification:

```bash
cd backend
.\venv\Scripts\pytest.exe app/tests/test_e2e_suite.py -v
```

---

## Role-Based Access Control (RBAC)

The system ships with 7 predefined operational roles:
1. **Super Admin**: Unrestricted administrative access across business records, staff accounts, and security settings.
2. **Catalogue Manager**: Manages products, categories, images, and descriptions.
3. **Inventory Manager**: Audits variant stock, executes manual adjustments, and sets low-stock thresholds.
4. **Order Manager**: Processes fulfillment states (`Pending Payment` -> `Confirmed` -> `Processing` -> `Packed` -> `Shipped` -> `Out for Delivery` -> `Delivered`).
5. **Marketing Manager**: Configures promotional coupons and homepage hero banners.
6. **Customer Support**: Inspects order issues, customer addresses, and initiates returns.
7. **Reports Viewer**: Reviews computed financial reports and downloads CSV exports.

---

## Payment Gateway Integration

JWAS natively supports **Razorpay** and **Cash on Delivery (COD)**:
- Set `PAYMENT_GATEWAY_KEY_ID` and `PAYMENT_GATEWAY_KEY_SECRET` in `backend/.env`.
- Payments are cryptographically verified on the server using HMAC-SHA256 signatures before orders transition to `Paid` status.
- Webhook notifications are processed idempotently through the `payment_webhook_events` table to prevent duplicate order confirmations.

---

## Production Build

To verify and build the Next.js production bundle:
```bash
cd frontend
npm run build
npm run start
```

---

## Documentation

Comprehensive architecture, database, API, deployment, backup, and security specifications are located in the `docs/` folder:
- [Architecture](file:///C:/Users/sampa/jwas/docs/architecture.md)
- [Database Specification](file:///C:/Users/sampa/jwas/docs/database.md)
- [API Reference](file:///C:/Users/sampa/jwas/docs/api.md)
- [Production Deployment](file:///C:/Users/sampa/jwas/docs/deployment.md)
- [Backup & Recovery](file:///C:/Users/sampa/jwas/docs/backup-recovery.md)
- [Security Model](file:///C:/Users/sampa/jwas/docs/security.md)
