# Production Deployment Guide

## 1. Prerequisites
- Linux / Ubuntu 22.04+ or Windows Server
- PostgreSQL 15+
- Python 3.11+ with `pip` and `venv`
- Node.js 18+ and `npm`
- Reverse proxy (Nginx or Caddy) with SSL certificate

## 2. Backend Setup
1. Clone repository to server:
   ```bash
   git clone <repo_url> /opt/jwas
   cd /opt/jwas/backend
   ```
2. Create and activate virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate # or .\venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```
3. Configure environment variables in `.env`:
   ```bash
   cp .env.example .env
   # Update DATABASE_URL, SECRET_KEY, and provider keys
   ```
4. Run database migrations:
   ```bash
   alembic upgrade head
   ```
5. Initialize permissions and create initial Super Admin:
   ```bash
   python cli.py init-roles
   python cli.py create-superadmin --email "admin@jwas.com" --password "SecureAdminSecret123!" --name "System Administrator"
   ```
6. Run Uvicorn production server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

## 3. Frontend Setup
1. Navigate to frontend directory:
   ```bash
   cd /opt/jwas/frontend
   npm install
   ```
2. Build optimized Next.js production bundle:
   ```bash
   npm run build
   ```
3. Start Next.js service:
   ```bash
   npm run start -- -p 3000
   ```
