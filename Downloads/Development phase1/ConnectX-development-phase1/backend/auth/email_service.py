# auth/email_service.py - Email service for sending verification codes
import os
import smtplib
from email.message import EmailMessage
from typing import Optional
from config import settings


class EmailService:
    """Service for sending emails using SMTP"""
    
    @staticmethod
    def create_verification_email(to_email: str, verification_code: str) -> EmailMessage:
        """
        Create email message with verification code
        
        Args:
            to_email: Recipient email address
            verification_code: 6-digit verification code
            
        Returns:
            EmailMessage object
        """
        msg = EmailMessage()
        msg['Subject'] = 'ConnectX - Password Reset Verification Code'
        msg['From'] = settings.smtp_from_email
        msg['To'] = to_email
        
        # HTML email template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Verification</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: #2563eb;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }}
                .content {{
                    background: #f9fafb;
                    padding: 30px;
                    border-radius: 0 0 8px 8px;
                    border: 1px solid #e5e7eb;
                }}
                .verification-code {{
                    background: #1f2937;
                    color: white;
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    padding: 20px;
                    text-align: center;
                    border-radius: 8px;
                    margin: 20px 0;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 30px;
                    color: #6b7280;
                    font-size: 14px;
                }}
                .security-note {{
                    background: #fef3c7;
                    border: 1px solid #f59e0b;
                    border-radius: 6px;
                    padding: 15px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>ConnectX</h1>
                <p>Password Reset Verification</p>
            </div>
            
            <div class="content">
                <p>Hello,</p>
                <p>We received a request to reset your password for your ConnectX account. To proceed, please use the verification code below:</p>
                
                <div class="verification-code">
                    {verification_code}
                </div>
                
                <div class="security-note">
                    <strong>Security Notice:</strong>
                    <ul>
                        <li>This code will expire in 10 minutes</li>
                        <li>Never share this code with anyone</li>
                        <li>If you didn't request this reset, please ignore this email</li>
                    </ul>
                </div>
                
                <p>If you have any questions or didn't request this password reset, please contact our support team.</p>
                
                <div class="footer">
                    <p>Best regards,<br>The ConnectX Team</p>
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text alternative
        text_content = f"""
ConnectX - Password Reset Verification

Hello,

We received a request to reset your password for your ConnectX account. 
To proceed, please use the verification code below:

Verification Code: {verification_code}

Security Notice:
- This code will expire in 10 minutes
- Never share this code with anyone  
- If you didn't request this reset, please ignore this email

If you have any questions or didn't request this password reset, 
please contact our support team.

Best regards,
The ConnectX Team

This is an automated message. Please do not reply to this email.
        """
        
        msg.set_content(text_content)
        msg.add_alternative(html_content, subtype='html')
        
        return msg
    
    @staticmethod
    def send_verification_email(to_email: str, verification_code: str) -> bool:
        """
        Send verification code email
        
        Args:
            to_email: Recipient email address
            verification_code: 6-digit verification code
            
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Create email message
            msg = EmailService.create_verification_email(to_email, verification_code)
            
            # Send email using SMTP
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                if settings.smtp_use_tls:
                    server.starttls()
                
                if settings.smtp_username and settings.smtp_password:
                    server.login(settings.smtp_username, settings.smtp_password)
                
                server.send_message(msg)
            
            return True
            
        except Exception as e:
            print(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    @staticmethod
    def create_invitation_email(to_email: str, temporary_password: str, login_url: str = "https://connectx.app/login") -> EmailMessage:
        """
        Create invitation email with temporary password
        
        Args:
            to_email: Recipient email address
            temporary_password: Generated temporary password
            login_url: Application login URL
            
        Returns:
            EmailMessage object
        """
        msg = EmailMessage()
        msg['Subject'] = 'Your ConnectX Account Invitation'
        msg['From'] = settings.smtp_from_email
        msg['To'] = to_email
        
        # HTML email template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ConnectX Account Invitation</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: #2563eb;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }}
                .content {{
                    background: #f9fafb;
                    padding: 30px;
                    border-radius: 0 0 8px 8px;
                    border: 1px solid #e5e7eb;
                }}
                .password {{
                    background: #1f2937;
                    color: white;
                    font-size: 24px;
                    font-weight: bold;
                    letter-spacing: 4px;
                    padding: 15px;
                    text-align: center;
                    border-radius: 8px;
                    margin: 20px 0;
                    font-family: monospace;
                }}
                .login-button {{
                    background: #2563eb;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 6px;
                    display: inline-block;
                    margin: 20px 0;
                    font-weight: bold;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 30px;
                    color: #6b7280;
                    font-size: 14px;
                }}
                .security-note {{
                    background: #fef3c7;
                    border: 1px solid #f59e0b;
                    border-radius: 6px;
                    padding: 15px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>ConnectX</h1>
                <p>Your Account Invitation</p>
            </div>
            
            <div class="content">
                <p>Hello,</p>
                <p>Your ConnectX account invitation has been resent.</p>
                
                <p><strong>Login URL:</strong></p>
                <a href="{login_url}" class="login-button">Login to ConnectX</a>
                
                <p><strong>Your Login Credentials:</strong></p>
                <p><strong>Email:</strong> {to_email}</p>
                <p><strong>Temporary Password:</strong></p>
                <div class="password">{temporary_password}</div>
                
                <div class="security-note">
                    <strong>Important Security Notice:</strong>
                    <ul>
                        <li>Please login and change your password immediately</li>
                        <li>This temporary password should be changed after your first login</li>
                        <li>Never share your password with anyone</li>
                    </ul>
                </div>
                
                <p>If you have any questions or need assistance, please contact our support team.</p>
                
                <div class="footer">
                    <p>Best regards,<br>The ConnectX Team</p>
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text alternative
        text_content = f"""
Your ConnectX Account Invitation

Hello,

Your ConnectX account invitation has been resent.

Login URL:
{login_url}

Email:
{to_email}

Temporary Password:
{temporary_password}

Important Security Notice:
- Please login and change your password immediately
- This temporary password should be changed after your first login
- Never share your password with anyone

If you have any questions or need assistance, please contact our support team.

Best regards,
The ConnectX Team

This is an automated message. Please do not reply to this email.
        """
        
        msg.set_content(text_content)
        msg.add_alternative(html_content, subtype='html')
        
        return msg

    @staticmethod
    def send_invitation_email(to_email: str, temporary_password: str, login_url: str = "https://connectx.app/login") -> bool:
        """
        Send invitation email with temporary password
        
        Args:
            to_email: Recipient email address
            temporary_password: Generated temporary password
            login_url: Application login URL
            
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Create email message
            msg = EmailService.create_invitation_email(to_email, temporary_password, login_url)
            
            # Send email using SMTP
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                if settings.smtp_use_tls:
                    server.starttls()
                
                if settings.smtp_username and settings.smtp_password:
                    server.login(settings.smtp_username, settings.smtp_password)
                
                server.send_message(msg)
            
            return True
            
        except Exception as e:
            print(f"Failed to send invitation email to {to_email}: {str(e)}")
            return False
    
    @staticmethod
    def create_admin_invite_email(to_email: str, full_name: str, temporary_password: str, company_name: str = None, login_url: str = "https://connectx.app/login") -> EmailMessage:
        """
        Create admin invitation email for company creation
        
        Args:
            to_email: Recipient email address
            full_name: Admin's full name
            temporary_password: Generated temporary password
            company_name: Company name (optional)
            login_url: Application login URL
            
        Returns:
            EmailMessage object
        """
        msg = EmailMessage()
        # Improve subject to be more personal and less spammy
        msg['Subject'] = f'Welcome to ConnectX - Your Account Details for {company_name or "ConnectX"}'
        msg['From'] = settings.smtp_from_email
        msg['To'] = to_email
        
        # Add Reply-To header for better deliverability
        msg['Reply-To'] = settings.smtp_from_email
        
        # HTML email template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ConnectX Admin Account</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: #2563eb;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }}
                .content {{
                    background: #f9fafb;
                    padding: 30px;
                    border-radius: 0 0 8px 8px;
                    border: 1px solid #e5e7eb;
                }}
                .password {{
                    background: #1f2937;
                    color: white;
                    font-size: 24px;
                    font-weight: bold;
                    letter-spacing: 4px;
                    padding: 15px;
                    text-align: center;
                    border-radius: 8px;
                    margin: 20px 0;
                    font-family: monospace;
                }}
                .login-button {{
                    background: #2563eb;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 6px;
                    display: inline-block;
                    margin: 20px 0;
                    font-weight: bold;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 30px;
                    color: #6b7280;
                    font-size: 14px;
                }}
                .security-note {{
                    background: #fef3c7;
                    border: 1px solid #f59e0b;
                    border-radius: 6px;
                    padding: 15px;
                    margin: 20px 0;
                }}
                .welcome-box {{
                    background: #e0f2fe;
                    border: 1px solid #0ea5e9;
                    border-radius: 6px;
                    padding: 15px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>ConnectX</h1>
                <p>Admin Account Invitation</p>
            </div>
            
            <div class="content">
                <p>Hello <strong>{full_name}</strong>,</p>
                
                {f'<div class="welcome-box"><p>Your company <strong>{company_name}</strong> has been created successfully.</p></div>' if company_name else ''}
                
                <p>Your company account has been created.</p>
                
                <p><strong>Your Login Details:</strong></p>
                <p><strong>Email:</strong> {to_email}</p>
                <p><strong>Password:</strong></p>
                <div class="password">{temporary_password}</div>
                
                <p><strong>Login Here:</strong></p>
                <a href="{login_url}" class="login-button">Login to ConnectX</a>
                
                <div class="security-note">
                    <strong>Important Security Notice:</strong>
                    <ul>
                        <li>Please login and change your password after your first login</li>
                        <li>This temporary password should be changed immediately</li>
                        <li>Never share your password with anyone</li>
                    </ul>
                </div>
                
                <p>If you have any questions or need assistance, please contact our support team.</p>
                
                <div class="footer">
                    <p>Best regards,<br>The ConnectX Team</p>
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text alternative
        text_content = f"""
Your ConnectX Admin Account

Hello {full_name},

{'Your company ' + company_name + ' has been created successfully.' if company_name else 'Your company account has been created.'}

Your Login Details:

Email: {to_email}
Password: {temporary_password}

Login Here:
{login_url}

Important Security Notice:
- Please login and change your password after your first login
- This temporary password should be changed immediately
- Never share your password with anyone

If you have any questions or need assistance, please contact our support team.

Best regards,
The ConnectX Team

This is an automated message. Please do not reply to this email.
        """
        
        msg.set_content(text_content)
        msg.add_alternative(html_content, subtype='html')
        
        return msg

    @staticmethod
    def create_user_invite_email(to_email: str, full_name: str, temporary_password: str, company_name: str = None, login_url: str = "https://connectx.app/login") -> EmailMessage:
        """
        Create user invitation email for user creation
        
        Args:
            to_email: Recipient email address
            full_name: User's full name
            temporary_password: Generated temporary password
            company_name: Company name (optional)
            login_url: Application login URL
            
        Returns:
            EmailMessage object
        """
        msg = EmailMessage()
        # Improve subject to be more personal and less spammy
        msg['Subject'] = f'Welcome to ConnectX - Your Login Credentials'
        msg['From'] = settings.smtp_from_email
        msg['To'] = to_email
        
        # Add Reply-To header for better deliverability
        msg['Reply-To'] = settings.smtp_from_email
        
        # HTML email template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ConnectX User Invitation</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: #10b981;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }}
                .content {{
                    background: #f9fafb;
                    padding: 30px;
                    border-radius: 0 0 8px 8px;
                    border: 1px solid #e5e7eb;
                }}
                .password {{
                    background: #1f2937;
                    color: white;
                    font-size: 24px;
                    font-weight: bold;
                    letter-spacing: 4px;
                    padding: 15px;
                    text-align: center;
                    border-radius: 8px;
                    margin: 20px 0;
                    font-family: monospace;
                }}
                .login-button {{
                    background: #10b981;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 6px;
                    display: inline-block;
                    margin: 20px 0;
                    font-weight: bold;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 30px;
                    color: #6b7280;
                    font-size: 14px;
                }}
                .security-note {{
                    background: #fef3c7;
                    border: 1px solid #f59e0b;
                    border-radius: 6px;
                    padding: 15px;
                    margin: 20px 0;
                }}
                .welcome-box {{
                    background: #d1fae5;
                    border: 1px solid #10b981;
                    border-radius: 6px;
                    padding: 15px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>ConnectX</h1>
                <p>Welcome to the Platform!</p>
            </div>
            
            <div class="content">
                <p>Hello <strong>{full_name}</strong>,</p>
                
                <div class="welcome-box">
                    <p>You have been added to the ConnectX platform{f' for company <strong>{company_name}</strong>' if company_name else ''}.</p>
                </div>
                
                <p>Your account is ready and you can now login to access the platform.</p>
                
                <p><strong>Your Login Details:</strong></p>
                <p><strong>Email:</strong> {to_email}</p>
                <p><strong>Password:</strong></p>
                <div class="password">{temporary_password}</div>
                
                <p><strong>Login Here:</strong></p>
                <a href="{login_url}" class="login-button">Login to ConnectX</a>
                
                <div class="security-note">
                    <strong>Important Security Notice:</strong>
                    <ul>
                        <li>Please login and change your password after your first login</li>
                        <li>This temporary password should be changed immediately</li>
                        <li>Never share your password with anyone</li>
                    </ul>
                </div>
                
                <p>If you have any questions or need assistance, please contact our support team.</p>
                
                <div class="footer">
                    <p>Best regards,<br>The ConnectX Team</p>
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text alternative
        text_content = f"""
You have been invited to ConnectX

Hello {full_name},

You have been added to the ConnectX platform{' for company ' + company_name if company_name else ''}.

Your account is ready and you can now login to access the platform.

Your Login Details:

Email: {to_email}
Password: {temporary_password}

Login Here:
{login_url}

Important Security Notice:
- Please login and change your password after your first login
- This temporary password should be changed immediately
- Never share your password with anyone

If you have any questions or need assistance, please contact our support team.

Best regards,
The ConnectX Team

This is an automated message. Please do not reply to this email.
        """
        
        msg.set_content(text_content)
        msg.add_alternative(html_content, subtype='html')
        
        return msg

    @staticmethod
    def send_admin_invite_email(to_email: str, full_name: str, temporary_password: str, company_name: str = None, login_url: str = "https://connectx.app/login") -> bool:
        """
        Send admin invitation email
        
        Args:
            to_email: Recipient email address
            full_name: Admin's full name
            temporary_password: Generated temporary password
            company_name: Company name (optional)
            login_url: Application login URL
            
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Create email message
            msg = EmailService.create_admin_invite_email(to_email, full_name, temporary_password, company_name, login_url)
            
            # Send email using SMTP
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                if settings.smtp_use_tls:
                    server.starttls()
                
                if settings.smtp_username and settings.smtp_password:
                    server.login(settings.smtp_username, settings.smtp_password)
                
                server.send_message(msg)
            
            return True
            
        except Exception as e:
            print(f"Failed to send admin invite email to {to_email}: {str(e)}")
            return False

    @staticmethod
    def send_user_invite_email(to_email: str, full_name: str, temporary_password: str, company_name: str = None, login_url: str = "https://connectx.app/login") -> bool:
        """
        Send user invitation email
        
        Args:
            to_email: Recipient email address
            full_name: User's full name
            temporary_password: Generated temporary password
            company_name: Company name (optional)
            login_url: Application login URL
            
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Create email message
            msg = EmailService.create_user_invite_email(to_email, full_name, temporary_password, company_name, login_url)
            
            # Send email using SMTP
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                if settings.smtp_use_tls:
                    server.starttls()
                
                if settings.smtp_username and settings.smtp_password:
                    server.login(settings.smtp_username, settings.smtp_password)
                
                server.send_message(msg)
            
            return True
            
        except Exception as e:
            print(f"Failed to send user invite email to {to_email}: {str(e)}")
            return False
    
    @staticmethod
    def is_email_configured() -> bool:
        """
        Check if email service is properly configured
        
        Returns:
            True if email settings are configured, False otherwise
        """
        return all([
            settings.smtp_host,
            settings.smtp_port,
            settings.smtp_from_email
        ])


# Development/Testing email service that logs instead of sending
class DevEmailService:
    """Development email service that logs to console instead of sending"""
    
    @staticmethod
    def send_verification_email(to_email: str, verification_code: str) -> bool:
        """
        Log verification code for development/testing
        
        Args:
            to_email: Recipient email address
            verification_code: 6-digit verification code
            
        Returns:
            Always returns True
        """
        
        return True
    
    @staticmethod
    def send_invitation_email(to_email: str, temporary_password: str, login_url: str = "https://connectx.app/login") -> bool:
        """
        Log invitation email details for development/testing
        
        Args:
            to_email: Recipient email address
            temporary_password: Generated temporary password
            login_url: Application login URL
            
        Returns:
            Always returns True
        """
        
        return True
    
    @staticmethod
    def send_admin_invite_email(to_email: str, full_name: str, temporary_password: str, company_name: str = None, login_url: str = "https://connectx.app/login") -> bool:
        """
        Log admin invite email details for development/testing
        
        Args:
            to_email: Recipient email address
            full_name: Admin's full name
            temporary_password: Generated temporary password
            company_name: Company name (optional)
            login_url: Application login URL
            
        Returns:
            Always returns True
        """
        return True
    
    @staticmethod
    def send_user_invite_email(to_email: str, full_name: str, temporary_password: str, company_name: str = None, login_url: str = "https://connectx.app/login") -> bool:
        """
        Log user invite email details for development/testing
        
        Args:
            to_email: Recipient email address
            full_name: User's full name
            temporary_password: Generated temporary password
            company_name: Company name (optional)
            login_url: Application login URL
            
        Returns:
            Always returns True
        """
        
        return True
    
    @staticmethod
    def is_email_configured() -> bool:
        """Dev service is always configured"""
        return True


def get_email_service() -> EmailService:
    """
    Get appropriate email service based on configuration
    
    Returns:
        EmailService instance (production or development)
    """
    if settings.debug or not EmailService.is_email_configured():
        return DevEmailService()
    
    return EmailService()
