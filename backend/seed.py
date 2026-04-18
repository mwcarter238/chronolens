"""Run at startup to ensure the admin user always exists."""
import os

from app.auth import hash_password
from app.database import SessionLocal, create_tables
from app.models import User

email = os.getenv("ADMIN_EMAIL", "").lower().strip()
password = os.getenv("ADMIN_PASSWORD", "")
name = os.getenv("ADMIN_NAME", "Admin")

if not email or not password:
    print("[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping.")
else:
    create_tables()
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == email).first():
            db.add(User(email=email, password_hash=hash_password(password), full_name=name, role="admin"))
            db.commit()
            print(f"[seed] Admin user created: {email}")
        else:
            print(f"[seed] Admin user already exists: {email}")
    finally:
        db.close()
