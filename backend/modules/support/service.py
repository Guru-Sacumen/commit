# modules/support/service.py - Support module service layer
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime
import uuid


class SupportService:
    """Service for managing support tickets and knowledge base"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_tenant_tickets(self, tenant_id: str, status: Optional[str] = None,
                          priority: Optional[str] = None, limit: int = 50) -> List[Dict]:
        """Get support tickets for a tenant"""
        # Placeholder implementation
        tickets = [
            {
                "id": "ticket_1",
                "tenant_id": tenant_id,
                "title": "Salesforce connector authentication issue",
                "description": "Unable to authenticate with Salesforce using API keys",
                "status": "open",
                "priority": "high",
                "category": "authentication",
                "created_by": "user_123",
                "assigned_to": "support_agent_1",
                "created_at": datetime.utcnow() - timedelta(hours=4),
                "updated_at": datetime.utcnow() - timedelta(hours=2),
                "comments_count": 3
            },
            {
                "id": "ticket_2",
                "tenant_id": tenant_id,
                "title": "Data sync delay with Slack",
                "description": "Slack messages are taking too long to sync",
                "status": "in_progress",
                "priority": "medium",
                "category": "performance",
                "created_by": "user_456",
                "assigned_to": "support_agent_2",
                "created_at": datetime.utcnow() - timedelta(days=1),
                "updated_at": datetime.utcnow() - timedelta(hours=6),
                "comments_count": 5
            },
            {
                "id": "ticket_3",
                "tenant_id": tenant_id,
                "title": "Feature request: Custom field mapping",
                "description": "Need ability to map custom fields between systems",
                "status": "closed",
                "priority": "low",
                "category": "feature_request",
                "created_by": "user_789",
                "assigned_to": None,
                "created_at": datetime.utcnow() - timedelta(days=3),
                "updated_at": datetime.utcnow() - timedelta(days=2),
                "comments_count": 2
            }
        ]
        
        # Filter by status and priority
        if status:
            tickets = [t for t in tickets if t["status"] == status]
        if priority:
            tickets = [t for t in tickets if t["priority"] == priority]
        
        return tickets[:limit]
    
    def create_ticket(self, tenant_id: str, ticket_data: dict, user_id: str) -> Dict:
        """Create a new support ticket"""
        ticket_id = str(uuid.uuid4())
        
        ticket = {
            "id": ticket_id,
            "tenant_id": tenant_id,
            "title": ticket_data.get("title"),
            "description": ticket_data.get("description"),
            "status": "open",
            "priority": ticket_data.get("priority", "medium"),
            "category": ticket_data.get("category", "general"),
            "created_by": user_id,
            "assigned_to": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "comments_count": 0
        }
        
        # In real implementation, would save to database
        return ticket
    
    def get_ticket(self, ticket_id: str) -> Optional[Dict]:
        """Get a specific support ticket"""
        # Placeholder implementation
        return {
            "id": ticket_id,
            "tenant_id": "tenant_1",
            "title": "Salesforce connector authentication issue",
            "description": "Unable to authenticate with Salesforce using API keys. Getting 401 errors.",
            "status": "open",
            "priority": "high",
            "category": "authentication",
            "created_by": "user_123",
            "assigned_to": "support_agent_1",
            "created_at": datetime.utcnow() - timedelta(hours=4),
            "updated_at": datetime.utcnow() - timedelta(hours=2),
            "comments": [
                {
                    "id": "comment_1",
                    "ticket_id": ticket_id,
                    "author": "user_123",
                    "content": "We're getting 401 errors when trying to connect to Salesforce.",
                    "created_at": datetime.utcnow() - timedelta(hours=4),
                    "is_internal": False
                },
                {
                    "id": "comment_2",
                    "ticket_id": ticket_id,
                    "author": "support_agent_1",
                    "content": "Can you please verify your API credentials and permissions?",
                    "created_at": datetime.utcnow() - timedelta(hours=3),
                    "is_internal": False
                }
            ]
        }
    
    def update_ticket(self, ticket_id: str, update_data: dict, user_id: str) -> Dict:
        """Update a support ticket"""
        # Placeholder implementation
        return {
            "ok": True,
            "ticket_id": ticket_id,
            "updated_fields": list(update_data.keys()),
            "updated_at": datetime.utcnow()
        }
    
    def add_ticket_comment(self, ticket_id: str, comment_data: dict, user_id: str) -> Dict:
        """Add a comment to a support ticket"""
        comment_id = str(uuid.uuid4())
        
        comment = {
            "id": comment_id,
            "ticket_id": ticket_id,
            "author": user_id,
            "content": comment_data.get("content"),
            "is_internal": comment_data.get("is_internal", False),
            "created_at": datetime.utcnow()
        }
        
        return comment
    
    def get_knowledge_base_articles(self, category: Optional[str] = None, 
                                  search: Optional[str] = None) -> List[Dict]:
        """Get knowledge base articles"""
        # Placeholder implementation
        articles = [
            {
                "id": "kb_1",
                "title": "Troubleshooting Salesforce Authentication",
                "category": "authentication",
                "summary": "Common issues and solutions for Salesforce authentication problems",
                "content": "Detailed guide on resolving Salesforce authentication issues...",
                "tags": ["salesforce", "authentication", "api"],
                "created_at": datetime.utcnow() - timedelta(days=30),
                "updated_at": datetime.utcnow() - timedelta(days=5),
                "views": 245
            },
            {
                "id": "kb_2",
                "title": "Optimizing Connector Performance",
                "category": "performance",
                "summary": "Tips and best practices for improving connector performance",
                "content": "Guide on optimizing connector performance and reducing latency...",
                "tags": ["performance", "optimization", "connectors"],
                "created_at": datetime.utcnow() - timedelta(days=20),
                "updated_at": datetime.utcnow() - timedelta(days=2),
                "views": 189
            },
            {
                "id": "kb_3",
                "title": "Data Sync Best Practices",
                "category": "data_sync",
                "summary": "Best practices for setting up and managing data synchronization",
                "content": "Comprehensive guide on data sync configuration and management...",
                "tags": ["data", "sync", "best_practices"],
                "created_at": datetime.utcnow() - timedelta(days=15),
                "updated_at": datetime.utcnow() - timedelta(days=1),
                "views": 156
            }
        ]
        
        # Filter by category
        if category:
            articles = [a for a in articles if a["category"] == category]
        
        # Filter by search term
        if search:
            search_lower = search.lower()
            articles = [
                a for a in articles 
                if search_lower in a["title"].lower() or 
                   search_lower in a["summary"].lower() or
                   search_lower in a["content"].lower()
            ]
        
        return articles
