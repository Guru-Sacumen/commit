# google_authenticator/totp_service.py - Google Authenticator TOTP service
import pyotp
import qrcode
import io
import base64
from typing import Tuple, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import User


class TOTPService:
    """Service for managing TOTP (Time-based One-Time Password) functionality"""
    
    @staticmethod
    def generate_secret() -> str:
        """Generate a new TOTP secret"""
        return pyotp.random_base32()
    
    @staticmethod
    def generate_qr_code(secret: str, user_email: str, issuer_name: str = "ConnectX") -> str:
        """
        Generate QR code for TOTP setup
        Returns base64 encoded image string
        """
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user_email,
            issuer_name=issuer_name
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert image to base64 string
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return img_str
    
    @staticmethod
    def verify_token(secret: str, token: str) -> bool:
        """Verify TOTP token"""
        try:
            totp = pyotp.TOTP(secret)
            return totp.verify(token, valid_window=1)  # Allow 1 step tolerance
        except Exception:
            return False
    
    @staticmethod
    def setup_totp_for_user(db: Session, user: User) -> Tuple[str, str]:
        """
        Setup TOTP for a user
        Returns (secret, qr_code_base64)
        """
        if user.totp_secret and user.totp_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="TOTP is already set up for this user"
            )
        
        secret = TOTPService.generate_secret()
        qr_code = TOTPService.generate_qr_code(secret, user.email)
        
        # Update user with TOTP secret
        user.totp_secret = secret
        user.mfa_enabled = True
        db.commit()
        
        return secret, qr_code
    
    @staticmethod
    def verify_and_enable_totp(db: Session, user: User, token: str) -> bool:
        """
        Verify TOTP token and enable TOTP for user
        Returns True if verification successful
        """
        if not user.totp_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="TOTP secret not found. Please setup TOTP first."
            )
        
        if TOTPService.verify_token(user.totp_secret, token):
            user.totp_verified = True
            db.commit()
            return True
        
        return False
    
    @staticmethod
    def verify_user_totp(db: Session, user: User, token: str) -> bool:
        """
        Verify TOTP token for authenticated user
        Returns True if verification successful
        """
        if not user.totp_secret or not user.totp_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="TOTP not properly set up for this user"
            )
        
        return TOTPService.verify_token(user.totp_secret, token)
    
    @staticmethod
    def disable_totp(db: Session, user: User) -> None:
        """Disable TOTP for user"""
        user.totp_secret = None
        user.totp_verified = False
        user.mfa_enabled = False
        db.commit()
    
    @staticmethod
    def reset_totp(db: Session, user: User) -> None:
        """Reset TOTP for user - keep MFA enabled but force re-setup"""
        user.totp_secret = None
        user.totp_verified = False
        user.mfa_enabled = True  # Keep MFA enabled to force setup
        db.commit()
    
    @staticmethod
    def is_totp_required(user: User) -> bool:
        """Check if TOTP verification is required for user"""
        return user.mfa_enabled and user.totp_verified
