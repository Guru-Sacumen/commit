# tasks.py - Celery background tasks
import os
import smtplib
import uuid
from email.message import EmailMessage
from datetime import datetime

from celery import current_app
from sqlalchemy.orm import Session

from celery_app import celery_app
from database import SessionLocal
from models import User, PasswordReset

# Email configuration
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
FROM_ADDR = os.getenv("FROM_ADDR", "no-reply@connectx.local")


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        return db
    finally:
        db.close()


@celery_app.task
def send_password_reset_email(email: str, token: str):
    """Send password reset email asynchronously"""
    try:
        link = f"http://localhost:3000/reset-password?token={token}"
        subject = "ConnectX password reset"
        body = f"Reset your password: {link}"
        
        if not SMTP_HOST:
            print(f"[email disabled] to={email} subject={subject}\n{body}")
            return {"status": "disabled", "email": email}
        
        msg = EmailMessage()
        msg["From"] = FROM_ADDR
        msg["To"] = email
        msg["Subject"] = subject
        msg.set_content(body)
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            if SMTP_USER and SMTP_PASS:
                server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        
        return {"status": "sent", "email": email}
    except Exception as e:
        return {"status": "error", "email": email, "error": str(e)}


@celery_app.task
def cleanup_expired_tokens():
    """Clean up expired password reset tokens"""
    db = get_db()
    try:
        # Delete tokens older than 24 hours
        from datetime import timedelta
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        
        expired_tokens = db.query(PasswordReset).filter(
            PasswordReset.created_at < cutoff_time
        ).delete()
        
        db.commit()
        return {"status": "success", "deleted_tokens": expired_tokens}
    except Exception as e:
        db.rollback()
        return {"status": "error", "error": str(e)}
    finally:
        db.close()


@celery_app.task
def send_welcome_email(user_id: str):
    """Send welcome email to new users"""
    db = get_db()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"status": "error", "error": "User not found"}
        
        subject = "Welcome to ConnectX!"
        body = f"Hello {user.full_name or user.email},\n\nWelcome to ConnectX! Your account has been created successfully.\n\nBest regards,\nConnectX Team"
        
        if not SMTP_HOST:
            print(f"[email disabled] to={user.email} subject={subject}\n{body}")
            return {"status": "disabled", "email": user.email}
        
        msg = EmailMessage()
        msg["From"] = FROM_ADDR
        msg["To"] = user.email
        msg["Subject"] = subject
        msg.set_content(body)
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            if SMTP_USER and SMTP_PASS:
                server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        
        return {"status": "sent", "email": user.email}
    except Exception as e:
        return {"status": "error", "email": user.email if user else "unknown", "error": str(e)}
    finally:
        db.close()
