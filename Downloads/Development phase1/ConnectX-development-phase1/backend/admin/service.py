# admin/service.py - Admin module service layer
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import uuid
import random

from models import User, Tenant, Membership, RoleEnum, Connector, ConnectorRequest


class AdminService:
    """Service for administrative operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_admin_dashboard(self) -> Dict:
        """Get admin dashboard data"""
        # Placeholder implementation
        return {
            "overview": {
                "total_tenants": 24,
                "total_users": 156,
                "active_connectors": 89,
                "pending_requests": 7
            },
            "recent_activity": [
                {
                    "type": "user_created",
                    "description": "New user registered",
                    "timestamp": datetime.utcnow() - timedelta(minutes=15),
                    "entity": "user_123"
                },
                {
                    "type": "connector_request",
                    "description": "New connector request from Company A",
                    "timestamp": datetime.utcnow() - timedelta(hours=2),
                    "entity": "request_456"
                },
                {
                    "type": "tenant_created",
                    "description": "New tenant created",
                    "timestamp": datetime.utcnow() - timedelta(hours=4),
                    "entity": "tenant_789"
                }
            ],
            "alerts": [
                {
                    "type": "warning",
                    "message": "High error rate detected in Salesforce connectors",
                    "count": 3,
                    "timestamp": datetime.utcnow() - timedelta(minutes=30)
                },
                {
                    "type": "info",
                    "message": "System maintenance scheduled for tonight",
                    "count": 1,
                    "timestamp": datetime.utcnow() - timedelta(hours=6)
                }
            ],
            "metrics": {
                "daily_active_users": 89,
                "api_calls_today": 15420,
                "average_response_time_ms": 145,
                "system_uptime_percentage": 99.8
            }
        }
    
    def get_tenants(self, search: Optional[str] = None, status: Optional[str] = None, 
                   limit: int = 50) -> List[Dict]:
        """Get all tenants with optional filtering"""
        query = self.db.query(Tenant)
        
        # Apply filters
        if search:
            query = query.filter(Tenant.name.ilike(f"%{search}%"))
        
        tenants = query.limit(limit).all()
        
        result = []
        for tenant in tenants:
            user_count = (
                self.db.query(Membership)
                .filter(Membership.tenant_id == tenant.id)
                .count()
            )
            
            connector_count = (
                self.db.query(Connector)
                .filter(Connector.tenant_id == tenant.id)
                .count()
            )
            
            result.append({
                "id": tenant.id,
                "name": tenant.name,
                "created_at": tenant.created_at,
                "user_count": user_count,
                "connector_count": connector_count,
                "status": "active"  # Placeholder status
            })
        
        return result
    
    def get_tenant_details(self, tenant_id: str) -> Optional[Dict]:
        """Get detailed tenant information"""
        tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            return None
        
        # Get tenant statistics
        user_count = (
            self.db.query(Membership)
            .filter(Membership.tenant_id == tenant_id)
            .count()
        )
        
        connector_count = (
            self.db.query(Connector)
            .filter(Connector.tenant_id == tenant_id)
            .count()
        )
        
        pending_requests = (
            self.db.query(ConnectorRequest)
            .filter(
                ConnectorRequest.tenant_id == tenant_id,
                ConnectorRequest.status == "PENDING"
            )
            .count()
        )
        
        # Get recent activity
        recent_activity = self.get_tenant_activity(tenant_id, limit=10)
        
        return {
            "id": tenant.id,
            "name": tenant.name,
            "created_at": tenant.created_at,
            "statistics": {
                "user_count": user_count,
                "connector_count": connector_count,
                "pending_requests": pending_requests,
                "api_calls_this_month": random.randint(10000, 50000)
            },
            "recent_activity": recent_activity,
            "health_status": "healthy"
        }
    
    def get_tenant_users(self, tenant_id: str, role: Optional[str] = None, 
                        status: Optional[str] = None) -> List[Dict]:
        """Get users for a specific tenant"""
        query = (
            self.db.query(User, Membership)
            .join(Membership, User.id == Membership.user_id)
            .filter(Membership.tenant_id == tenant_id)
        )
        
        # Apply filters
        if role:
            query = query.filter(Membership.role == role)
        
        results = query.all()
        
        users = []
        for user, membership in results:
            users.append({
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": membership.role,
                "created_at": user.created_at,
                "joined_at": membership.created_at,
                "last_login": datetime.utcnow() - timedelta(hours=random.randint(1, 72)),
                "status": "active",
                "auth_provider": user.auth_provider,
                "mfa_enabled": user.mfa_enabled
            })
        
        return users
    
    def create_tenant_user(self, tenant_id: str, user_data: dict, admin_id: str) -> Dict:
        """Create a new user for a tenant"""
        # Placeholder implementation
        user_id = str(uuid.uuid4())
        
        user = {
            "id": user_id,
            "email": user_data.get("email"),
            "full_name": user_data.get("full_name"),
            "role": user_data.get("role", "MEMBER"),
            "tenant_id": tenant_id,
            "created_at": datetime.utcnow(),
            "status": "active",
            "created_by": admin_id
        }
        
        return user
    
    def update_tenant_user(self, tenant_id: str, user_id: str, update_data: dict, 
                          admin_id: str) -> Dict:
        """Update a tenant user"""
        # Placeholder implementation
        return {
            "ok": True,
            "user_id": user_id,
            "updated_fields": list(update_data.keys()),
            "updated_at": datetime.utcnow(),
            "updated_by": admin_id
        }
    
    def delete_tenant_user(self, tenant_id: str, user_id: str, admin_id: str) -> Dict:
        """Delete a tenant user"""
        # Placeholder implementation
        return {
            "ok": True,
            "user_id": user_id,
            "deleted_at": datetime.utcnow(),
            "deleted_by": admin_id
        }
    
    def get_tenant_connectors(self, tenant_id: str, status: Optional[str] = None) -> List[Dict]:
        """Get connectors for a specific tenant"""
        query = self.db.query(Connector).filter(Connector.tenant_id == tenant_id)
        
        connectors = query.all()
        
        result = []
        for connector in connectors:
            result.append({
                "id": connector.id,
                "name": connector.name,
                "category": connector.category,
                "type": connector.type,
                "status": "active",  # Placeholder status
                "created_at": connector.created_at,
                "last_used": datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
                "usage_count": random.randint(10, 1000)
            })
        
        return result
    
    def get_tenant_activity(self, tenant_id: str, limit: int = 100) -> List[Dict]:
        """Get activity log for a tenant"""
        # Placeholder implementation
        activities = [
            {
                "id": "activity_1",
                "tenant_id": tenant_id,
                "type": "user_login",
                "description": "User logged in",
                "user_id": "user_123",
                "timestamp": datetime.utcnow() - timedelta(minutes=30),
                "metadata": {"ip": "192.168.1.100"}
            },
            {
                "id": "activity_2",
                "tenant_id": tenant_id,
                "type": "connector_test",
                "description": "Connector test performed",
                "user_id": "user_456",
                "timestamp": datetime.utcnow() - timedelta(hours=2),
                "metadata": {"connector": "salesforce", "result": "success"}
            },
            {
                "id": "activity_3",
                "tenant_id": tenant_id,
                "type": "user_created",
                "description": "New user added to tenant",
                "user_id": "admin_789",
                "timestamp": datetime.utcnow() - timedelta(hours=4),
                "metadata": {"new_user": "user_101"}
            }
        ]
        
        return activities[:limit]
    
    def get_tenant_statistics(self, tenant_id: str, timeframe: str) -> Dict:
        """Get statistics for a tenant"""
        # Parse timeframe
        if timeframe == "7d":
            start_date = datetime.utcnow() - timedelta(days=7)
        elif timeframe == "30d":
            start_date = datetime.utcnow() - timedelta(days=30)
        elif timeframe == "90d":
            start_date = datetime.utcnow() - timedelta(days=90)
        else:
            start_date = datetime.utcnow() - timedelta(days=30)
        
        # Placeholder implementation
        return {
            "timeframe": timeframe,
            "start_date": start_date,
            "end_date": datetime.utcnow(),
            "api_metrics": {
                "total_calls": random.randint(10000, 50000),
                "success_rate": random.uniform(95, 99.5),
                "avg_response_time_ms": random.randint(100, 200),
                "data_transferred_gb": random.uniform(1, 10)
            },
            "user_metrics": {
                "active_users": random.randint(10, 50),
                "new_users": random.randint(1, 5),
                "login_count": random.randint(100, 500)
            },
            "connector_metrics": {
                "total_connectors": random.randint(5, 15),
                "healthy_connectors": random.randint(4, 15),
                "total_tests": random.randint(50, 200),
                "success_rate": random.uniform(90, 98)
            }
        }
    
    def get_system_overview(self) -> Dict:
        """Get system overview (superadmin only)"""
        return {
            "system_stats": {
                "total_tenants": 24,
                "total_users": 156,
                "total_connectors": 89,
                "daily_active_users": 89,
                "api_calls_today": 15420
            },
            "health_status": {
                "overall": "healthy",
                "database": "healthy",
                "api_server": "healthy",
                "background_jobs": "healthy"
            },
            "recent_system_events": [
                {
                    "type": "deployment",
                    "description": "System updated to v2.1.0",
                    "timestamp": datetime.utcnow() - timedelta(hours=6)
                },
                {
                    "type": "maintenance",
                    "description": "Scheduled maintenance completed",
                    "timestamp": datetime.utcnow() - timedelta(days=1)
                }
            ]
        }
    
    def get_system_metrics(self, timeframe: str) -> Dict:
        """Get system metrics (superadmin only)"""
        return {
            "timeframe": timeframe,
            "api_metrics": {
                "total_requests": 15420,
                "success_rate": 98.5,
                "avg_response_time_ms": 145,
                "p95_response_time_ms": 320
            },
            "system_metrics": {
                "cpu_usage": 45.2,
                "memory_usage": 67.8,
                "disk_usage": 34.1,
                "network_io_mbps": 125.4
            },
            "database_metrics": {
                "connections": 45,
                "query_time_avg_ms": 12,
                "slow_queries_count": 3
            }
        }
    
    def get_system_health(self) -> Dict:
        """Get system health status (superadmin only)"""
        return {
            "overall_status": "healthy",
            "services": [
                {
                    "name": "API Server",
                    "status": "healthy",
                    "response_time_ms": 45,
                    "last_check": datetime.utcnow()
                },
                {
                    "name": "Database",
                    "status": "healthy",
                    "response_time_ms": 12,
                    "last_check": datetime.utcnow()
                },
                {
                    "name": "Background Jobs",
                    "status": "healthy",
                    "pending_jobs": 2,
                    "last_check": datetime.utcnow()
                },
                {
                    "name": "File Storage",
                    "status": "healthy",
                    "available_space_gb": 125.6,
                    "last_check": datetime.utcnow()
                }
            ],
            "alerts": [
                {
                    "level": "info",
                    "message": "System operating normally",
                    "timestamp": datetime.utcnow() - timedelta(minutes=5)
                }
            ]
        }
