import argparse
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.models import User, Role, Permission, StaffProfile
from app.permissions.constants import PERMISSIONS, ROLE_DEFINITIONS
from app.core.security import get_password_hash

def init_roles(db):
    print("Initializing system permissions and roles...")
    perm_map = {}
    for code, desc in PERMISSIONS:
        perm = db.query(Permission).filter(Permission.code == code).first()
        if not perm:
            perm = Permission(code=code, description=desc)
            db.add(perm)
            db.flush()
        perm_map[code] = perm

    for role_name, perm_codes in ROLE_DEFINITIONS.items():
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            role = Role(name=role_name, description=f"System role: {role_name}")
            db.add(role)
            db.flush()
        
        # Link permissions
        role.permissions = [perm_map[p] for p in perm_codes if p in perm_map]
    
    db.commit()
    print("Permissions and system roles initialized successfully.")

def create_superadmin(email, password, name, phone=None):
    db = SessionLocal()
    try:
        init_roles(db)
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            existing.hashed_password = get_password_hash(password)
            existing.is_active = True
            existing.is_verified = True
            super_role = db.query(Role).filter(Role.name == "Super Admin").first()
            if super_role and super_role not in existing.roles:
                existing.roles.append(super_role)
            db.commit()
            print(f"Super Admin user '{email}' password updated successfully to: {password}")
            return

        super_role = db.query(Role).filter(Role.name == "Super Admin").first()
        if not super_role:
            print("Error: Super Admin role could not be resolved.")
            return

        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name=name,
            phone=phone,
            is_active=True,
            is_verified=True
        )
        user.roles.append(super_role)
        db.add(user)
        db.flush()

        staff_profile = StaffProfile(
            user_id=user.id,
            department="Executive",
            employee_id="ADMIN001",
            is_active=True
        )
        db.add(staff_profile)
        db.commit()
        print(f"Super Admin user '{email}' created successfully with full administrative permissions.")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="JWAS CLI Management Tool")
    subparsers = parser.add_subparsers(dest="command")

    init_roles_parser = subparsers.add_parser("init-roles", help="Initialize system permissions and roles")
    seed_parser = subparsers.add_parser("seed-catalog", help="Seed default products with permanent high-res images")

    admin_parser = subparsers.add_parser("create-superadmin", help="Create the initial Super Admin account")
    admin_parser.add_argument("--email", required=True, help="Super admin email")
    admin_parser.add_argument("--password", required=True, help="Super admin password")
    admin_parser.add_argument("--name", required=True, help="Super admin full name")
    admin_parser.add_argument("--phone", required=False, default=None, help="Super admin phone")

    args = parser.parse_args()

    if args.command == "init-roles":
        db = SessionLocal()
        try:
            init_roles(db)
        finally:
            db.close()
    elif args.command == "seed-catalog":
        from app.utils.seed import seed_sarees_catalogue
        db = SessionLocal()
        try:
            seed_sarees_catalogue(db)
            print("Catalog seeded successfully with permanent images.")
        finally:
            db.close()
    elif args.command == "create-superadmin":
        create_superadmin(args.email, args.password, args.name, args.phone)
    else:
        parser.print_help()
