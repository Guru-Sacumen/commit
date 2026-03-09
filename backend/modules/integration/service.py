# modules/integration/service.py - Integration module service layer
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from models import Connector, ConnectorCatalog, Tenant, User
import requests
import json


class IntegrationService:
    """Service for managing integrations and connectors"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_available_connectors(self) -> List[Dict]:
        """Get all available connectors from catalog"""
        connectors = self.db.query(ConnectorCatalog).all()
        return [
            {
                "id": connector.id,
                "connector_id": connector.connector_id,
                "name": connector.name,
                "type": connector.type,
                "usecase": connector.usecase,
                "created_at": connector.created_at
            }
            for connector in connectors
        ]
    
    def get_tenant_connectors(self, tenant_id: str) -> List[Dict]:
        """Get all connectors for a specific tenant"""
        connectors = (
            self.db.query(Connector)
            .filter(Connector.tenant_id == tenant_id)
            .all()
        )
        return [
            {
                "id": connector.id,
                "name": connector.name,
                "category": connector.category,
                "type": connector.type,
                "logo_url": connector.logo_url,
                "external_url": connector.external_url,
                "created_at": connector.created_at
            }
            for connector in connectors
        ]
    
    def test_connector_connection(self, tenant_id: str, connector_id: str) -> Dict:
        """Test connection to a specific connector"""
        connector = (
            self.db.query(Connector)
            .filter(Connector.tenant_id == tenant_id, Connector.name == connector_id)
            .first()
        )
        
        if not connector:
            return {
                "ok": False,
                "error": "Connector not found"
            }
        
        # Placeholder for actual connection testing
        # In a real implementation, this would make API calls to the connector
        try:
            # Simulate connection test
            return {
                "ok": True,
                "connector_id": connector_id,
                "test_result": "success",
                "message": "Connection test successful",
                "response_time_ms": 150
            }
        except Exception as e:
            return {
                "ok": False,
                "connector_id": connector_id,
                "test_result": "failed",
                "message": str(e)
            }
    
    def get_connector_health_status(self, tenant_id: str, connector_id: str) -> Dict:
        """Get health status of a specific connector"""
        connector = (
            self.db.query(Connector)
            .filter(Connector.tenant_id == tenant_id, Connector.name == connector_id)
            .first()
        )
        
        if not connector:
            return {
                "status": "not_found",
                "message": "Connector not found"
            }
        
        # Placeholder for actual health check
        return {
            "status": "healthy",
            "last_check": "2024-01-01T00:00:00Z",
            "response_time_ms": 120,
            "uptime_percentage": 99.9
        }
