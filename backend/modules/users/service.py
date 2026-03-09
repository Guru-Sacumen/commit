# modules/users/service.py - Users module service layer
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import json


class UsersService:
    """Service for managing user profiles and preferences"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_profile(self, user_id: str, tenant_id: str) -> Dict:
        """Get user's profile within tenant context"""
        # Placeholder implementation - would query from database
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {}
        
        membership = (
            self.db.query(Membership)
            .filter(Membership.user_id == user_id, Membership.tenant_id == tenant_id)
            .first()
        )
        
        return {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "created_at": user.created_at,
            "role": membership.role if membership else None,
            "tenant_membership": {
                "tenant_id": tenant_id,
                "role": membership.role if membership else None,
                "joined_at": membership.created_at if membership else None
            },
            "preferences": {
                "timezone": "UTC",
                "language": "en",
                "theme": "light"
            },
            "statistics": {
                "login_count": 142,
                "last_login": datetime.utcnow() - timedelta(hours=2),
                "api_calls_this_month": 1250,
                "active_connectors": 5
            }
        }
    
    def update_user_profile(self, user_id: str, tenant_id: str, profile_data: dict) -> Dict:
        """Update user's profile"""
        # Placeholder implementation
        updated_fields = []
        
        if "full_name" in profile_data:
            # Update user's full name in database
            updated_fields.append("full_name")
        
        if "preferences" in profile_data:
            # Update user preferences
            updated_fields.append("preferences")
        
        return {
            "ok": True,
            "updated_fields": updated_fields,
            "updated_at": datetime.utcnow()
        }
    
    def get_user_activity(self, user_id: str, tenant_id: str, limit: int = 50) -> List[Dict]:
        """Get user's activity log"""
        # Placeholder implementation
        activities = [
            {
                "id": "activity_1",
                "user_id": user_id,
                "tenant_id": tenant_id,
                "action": "connector_test",
                "description": "Tested connection to Salesforce connector",
                "entity_type": "connector",
                "entity_id": "salesforce_1",
                "timestamp": datetime.utcnow() - timedelta(minutes=30),
                "metadata": {
                    "test_result": "success",
                    "response_time_ms": 145
                }
            },
            {
                "id": "activity_2",
                "user_id": user_id,
                "tenant_id": tenant_id,
                "action": "login",
                "description": "User logged in",
                "entity_type": "user",
                "entity_id": user_id,
                "timestamp": datetime.utcnow() - timedelta(hours=2),
                "metadata": {
                    "ip_address": "192.168.1.100",
                    "user_agent": "Mozilla/5.0..."
                }
            },
            {
                "id": "activity_3",
                "user_id": user_id,
                "tenant_id": tenant_id,
                "action": "connector_request",
                "description": "Requested access to Slack connector",
                "entity_type": "connector_request",
                "entity_id": "request_123",
                "timestamp": datetime.utcnow() - timedelta(days=1),
                "metadata": {
                    "connector_id": "slack",
                    "request_status": "pending"
                }
            },
            {
                "id": "activity_4",
                "user_id": user_id,
                "tenant_id": tenant_id,
                "action": "profile_update",
                "description": "Updated user profile",
                "entity_type": "user",
                "entity_id": user_id,
                "timestamp": datetime.utcnow() - timedelta(days=2),
                "metadata": {
                    "updated_fields": ["full_name", "preferences"]
                }
            }
        ]
        
        return activities[:limit]
    
    def get_user_preferences(self, user_id: str, tenant_id: str) -> Dict:
        """Get user's preferences"""
        # Placeholder implementation
        return {
            "ui": {
                "theme": "light",
                "language": "en",
                "timezone": "UTC",
                "date_format": "MM/DD/YYYY",
                "time_format": "24h"
            },
            "notifications": {
                "email_enabled": True,
                "push_enabled": True,
                "connector_alerts": True,
                "security_alerts": True,
                "marketing_emails": False
            },
            "dashboard": {
                "default_view": "overview",
                "widgets": ["metrics", "alerts", "recent_activity"],
                "refresh_interval": 30
            },
            "api": {
                "default_page_size": 50,
                "timeout_seconds": 30
            }
        }
    
    def update_user_preferences(self, user_id: str, tenant_id: str, preferences_data: dict) -> Dict:
        """Update user's preferences"""
        # Placeholder implementation
        updated_sections = []
        
        for section, values in preferences_data.items():
            # Update preferences in database
            updated_sections.append(section)
        
        return {
            "ok": True,
            "updated_sections": updated_sections,
            "updated_at": datetime.utcnow()
        }
    
    def get_notification_settings(self, user_id: str, tenant_id: str) -> Dict:
        """Get user's notification settings"""
        # Placeholder implementation
        return {
            "email_notifications": {
                "enabled": True,
                "frequency": "immediate",
                "categories": {
                    "security": True,
                    "connectors": True,
                    "system_updates": False,
                    "marketing": False
                }
            },
            "push_notifications": {
                "enabled": True,
                "categories": {
                    "security": True,
                    "connectors": True,
                    "system_updates": True,
                    "marketing": False
                }
            },
            "in_app_notifications": {
                "enabled": True,
                "auto_mark_read": False,
                "sound_enabled": True
            }
        }
    
    def update_notification_settings(self, user_id: str, tenant_id: str, settings_data: dict) -> Dict:
        """Update user's notification settings"""
        # Placeholder implementation
        updated_categories = []
        
        for category, settings in settings_data.items():
            # Update notification settings in database
            updated_categories.append(category)
        
        return {
            "ok": True,
            "updated_categories": updated_categories,
            "updated_at": datetime.utcnow()
        }
