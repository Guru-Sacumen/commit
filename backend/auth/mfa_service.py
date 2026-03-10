# auth/mfa_service.py - Multi-Factor Authentication (TOTP) service
import pyotp
import qrcode
import io
import base64
from typing import Tuple, Optional
from sqlalchemy.orm import Session

from models import User


class MFAService:
    """
    Multi-Factor Authentication service using TOTP (Time-based One-Time Password).
    Compatible with Google Authenticator and similar apps.
    """
    
    ISSUER_NAME = "ConnectX"
    
    @staticmethod
    def generate_secret() -> str:
        """
        Generate a new TOTP secret.
        
        Returns:
            Base32 encoded secret string
        """
        return pyotp.random_base32()
    
    @staticmethod
    def generate_qr_code(secret: str, user_email: str) -> str:
        """
        Generate QR code for TOTP setup.
        
        Args:
            secret: TOTP secret
            user_email: User's email for identification
        
        Returns:
            Base64 encoded PNG image string
        """
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user_email,
            issuer_name=MFAService.ISSUER_NAME
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return img_str
    
    @staticmethod
    def verify_token(secret: str, token: str) -> bool:
        """
        Verify a TOTP token.
        
        Args:
            secret: User's TOTP secret
            token: 6-digit token from authenticator app
        
        Returns:
            True if token is valid, False otherwise
        """
        if not secret or not token:
            return False
        
        try:
            totp = pyotp.TOTP(secret)
            return totp.verify(token, valid_window=1)
        except Exception:
            return False
    
    @staticmethod
    def setup_mfa(db: Session, user: User) -> Tuple[str, str]:
        """
        Setup MFA for a user by generating secret and QR code.
        
        Args:
            db: Database session
            user: User model instance
        
        Returns:
            Tuple of (secret, qr_code_base64)
        
        Raises:
            ValueError: If MFA is already verified for user
        """
        if user.mfa_enabled and user.totp_verified:
            raise ValueError("MFA is already set up and verified for this user")
        
        secret = MFAService.generate_secret()
        qr_code = MFAService.generate_qr_code(secret, user.email)
        
        user.mfa_secret = secret
        user.totp_secret = secret
        user.mfa_enabled = True
        user.totp_verified = False
        db.commit()
        
        return secret, qr_code
    
    @staticmethod
    def verify_and_enable_mfa(db: Session, user: User, token: str) -> bool:
        """
        Verify TOTP token and complete MFA setup.
        
        Args:
            db: Database session
            user: User model instance
            token: 6-digit TOTP token
        
        Returns:
            True if verification successful
        
        Raises:
            ValueError: If MFA secret not found
        """
        secret = user.mfa_secret or user.totp_secret
        
        if not secret:
            raise ValueError("MFA secret not found. Please setup MFA first.")
        
        if MFAService.verify_token(secret, token):
            user.totp_verified = True
            db.commit()
            return True
        
        return False
    
    @staticmethod
    def verify_user_mfa(user: User, token: str) -> bool:
        """
        Verify MFA token during login.
        
        Args:
            user: User model instance
            token: 6-digit TOTP token
        
        Returns:
            True if token is valid
        
        Raises:
            ValueError: If MFA not properly set up
        """
        secret = user.mfa_secret or user.totp_secret
        
        if not secret or not user.totp_verified:
            raise ValueError("MFA not properly set up for this user")
        
        return MFAService.verify_token(secret, token)
    
    @staticmethod
    def disable_mfa(db: Session, user: User) -> None:
        """
        Disable MFA for a user.
        
        Args:
            db: Database session
            user: User model instance
        """
        user.mfa_secret = None
        user.totp_secret = None
        user.mfa_enabled = False
        user.totp_verified = False
        db.commit()
    
    @staticmethod
    def is_mfa_required(user: User) -> bool:
        """
        Check if MFA verification is required for user login.
        
        Args:
            user: User model instance
        
        Returns:
            True if MFA is enabled and verified
        """
        return user.mfa_enabled and user.totp_verified
    
    @staticmethod
    def reset_mfa(db: Session, user: User) -> None:
        """
        Reset MFA for a user, keeping MFA enabled but requiring re-setup.
        
        Args:
            db: Database session
            user: User model instance
        """
        user.mfa_secret = None
        user.totp_secret = None
        user.totp_verified = False
        user.mfa_enabled = True
        db.commit()
