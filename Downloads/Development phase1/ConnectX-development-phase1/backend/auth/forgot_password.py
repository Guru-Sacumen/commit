# auth/forgot_password.py - Forgot password service
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from passlib.context import CryptContext
from models import User, PasswordReset
from auth.email_service import get_email_service

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)


def generate_six_digit_code() -> str:
    """Generate a secure 6-digit verification code"""
    return ''.join(secrets.choice(string.digits) for _ in range(6))


class ForgotPasswordService:
    """Service for handling forgot password functionality"""
    
    @staticmethod
    def initiate_password_reset(db: Session, email: str) -> dict:
        """
        Initiate password reset process by generating verification code
        
        Args:
            db: Database session
            email: User's email address
            
        Returns:
            Dict with success status and message
            
        Raises:
            HTTPException: If email not found or other error
        """
        # Check if email exists
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email not found"
            )
        
        # Clean up any existing reset requests for this user
        db.query(PasswordReset).filter(PasswordReset.user_id == user.id).delete()
        
        # Generate verification code and token
        verification_code = generate_six_digit_code()
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        
        # Create password reset record
        password_reset = PasswordReset(
            token=token,
            user_id=user.id,
            verification_code=verification_code,
            expires_at=expires_at,
            attempts=0,
            is_verified=False
        )
        
        db.add(password_reset)
        db.commit()
        
        # Send verification code via email
        email_service = get_email_service()
        email_sent = email_service.send_verification_email(email, verification_code)
        
        if not email_sent:
            # If email fails, still return success for security (don't reveal if email exists)
            print(f"Warning: Failed to send verification email to {email}")
        
        return {
            "success": True,
            "message": "Verification code sent to your email"
        }
    
    @staticmethod
    def verify_code(db: Session, email: str, code: str) -> dict:
        """
        Verify the 6-digit code
        
        Args:
            db: Database session
            email: User's email address
            code: 6-digit verification code
            
        Returns:
            Dict with success status and reset token
            
        Raises:
            HTTPException: If code is invalid, expired, or max attempts reached
        """
        # Find user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email not found"
            )
        
        # Find password reset record
        password_reset = db.query(PasswordReset).filter(
            PasswordReset.user_id == user.id,
            PasswordReset.is_verified == False
        ).first()
        
        if not password_reset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active password reset request found"
            )
        
        # Check if expired
        if password_reset.expires_at < datetime.utcnow():
            db.delete(password_reset)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code expired. Please request a new one."
            )
        
        # Check attempts
        if password_reset.attempts >= 5:
            db.delete(password_reset)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum verification attempts reached. Please request a new code."
            )
        
        # Verify code
        if password_reset.verification_code != code:
            password_reset.attempts += 1
            db.commit()
            
            remaining_attempts = 5 - password_reset.attempts
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid verification code. {remaining_attempts} attempts remaining."
            )
        
        # Mark as verified
        password_reset.is_verified = True
        db.commit()
        
        return {
            "success": True,
            "message": "Code verified successfully",
            "reset_token": password_reset.token
        }
    
    @staticmethod
    def reset_password(db: Session, token: str, new_password: str) -> dict:
        """
        Reset password using verified token
        
        Args:
            db: Database session
            token: Reset token from verification step
            new_password: New password
            
        Returns:
            Dict with success status
            
        Raises:
            HTTPException: If token is invalid or other error
        """
        # Find password reset record
        password_reset = db.query(PasswordReset).filter(
            PasswordReset.token == token,
            PasswordReset.is_verified == True
        ).first()
        
        if not password_reset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired reset token"
            )
        
        # Check if expired (verification codes expire after 10 minutes, but reset tokens should be valid for 30 minutes)
        if password_reset.expires_at < datetime.utcnow() - timedelta(minutes=20):
            db.delete(password_reset)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token expired. Please start over."
            )
        
        # Get user and update password
        user = db.query(User).filter(User.id == password_reset.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Validate password
        if len(new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long"
            )
        
        # Update password
        user.password_hash = hash_password(new_password)
        
        # Clean up reset record
        db.delete(password_reset)
        db.commit()
        
        return {
            "success": True,
            "message": "Password reset successfully"
        }
