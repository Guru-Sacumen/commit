"""Database seeding script for ConnectX.

This module provides functions to seed the database with initial data including:
- Super admin user
- Sample tenant with admin and member users
- Connector categories
- Connector catalog entries

The script follows PEP 8 style guidelines and includes proper error handling.
For production use, all print statements have been replaced with logging.
"""

import logging
import os
import uuid
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv

from database import SessionLocal, engine, Base
from models import (
    User,
    Tenant,
    Membership,
    RoleEnum,
    ConnectorCategory,
    ConnectorCatalog,
    Connector,
)
from auth import hash_password

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

def create_super_admin() -> Optional[User]:
    """Create initial super admin user.
    
    Creates a super admin user with credentials from environment variables
    or defaults. If a super admin already exists, returns the existing user.
    
    Returns:
        Optional[User]: The created super admin user or None if error occurs.
        
    Raises:
        Exception: If database error occurs during creation.
    """
    db = SessionLocal()
    
    try:
        # Check if super admin already exists
        existing_superadmin = db.query(User).filter(User.superadmin == True).first()
        if existing_superadmin:
            logger.info(f"Super admin already exists: {existing_superadmin.email}")
            return existing_superadmin
        
        # Get super admin credentials from environment or use defaults
        email = os.getenv("SUPERADMIN_EMAIL", "admin@connectx.dev")
        password = os.getenv("SUPERADMIN_PASSWORD", "admin123")
        full_name = os.getenv("SUPERADMIN_NAME", "System Administrator")
        
        # Create super admin user
        superadmin = User(
            id=str(uuid.uuid4()),
            email=email,
            full_name=full_name,
            password_hash=hash_password(password[:72]),
            superadmin=True,
            auth_provider="LOCAL",
            mfa_enabled=False,  # Superadmin can choose to enable MFA
            totp_verified=False,
            totp_secret=None,
        )
        
        db.add(superadmin)
        db.commit()
        db.refresh(superadmin)
        
        logger.info(f"Created super admin: {email}")
        logger.info("Password set successfully (change after first login)")
        
        return superadmin
        
    except Exception as e:
        logger.error(f"Error creating super admin: {e}")
        db.rollback()
        return None
    finally:
        db.close()

def create_sample_tenant() -> Optional[Tenant]:
    """Create a sample tenant with admin and member users for demonstration.
    
    Creates a sample tenant named 'Demo Company' with:
    - One admin user (demo-admin@connectx.local)
    - One member user (demo-user@connectx.local)
    - One sample connector (Microsoft Teams)
    
    Returns:
        Optional[Tenant]: The created tenant or None if error occurs.
        
    Raises:
        Exception: If database error occurs during creation.
    """
    db = SessionLocal()
    
    try:
        # Check if sample tenant already exists
        existing_tenant = db.query(Tenant).filter(Tenant.name == "Demo Company").first()
        if existing_tenant:
            logger.info("Sample tenant already exists")
            return existing_tenant
        
        # Create sample tenant
        tenant = Tenant(
            id=str(uuid.uuid4()),
            name="Demo Company"
        )
        db.add(tenant)
        db.flush()
        
        # Create tenant admin user
        admin_email = "demo-admin@connectx.local"
        admin_password = "demo123"
        
        admin_user = User(
            id=str(uuid.uuid4()),
            email=admin_email,
            full_name="Demo Admin",
            password_hash=hash_password(admin_password),
            superadmin=False,
            auth_provider="LOCAL",
            mfa_enabled=False,
            totp_verified=False,
            totp_secret=None,
        )
        db.add(admin_user)
        db.flush()
        
        # Create admin membership
        admin_membership = Membership(
            id=str(uuid.uuid4()),
            tenant_id=tenant.id,
            user_id=admin_user.id,
            role=RoleEnum.ADMIN
        )
        db.add(admin_membership)
        
        # Create a regular member user
        member_email = "demo-user@connectx.local"
        member_password = "demo123"
        
        member_user = User(
            id=str(uuid.uuid4()),
            email=member_email,
            full_name="Demo User",
            password_hash=hash_password(member_password[:72]),
            superadmin=False,
            auth_provider="LOCAL",
            mfa_enabled=False,
            totp_verified=False,
            totp_secret=None,
        )
        db.add(member_user)
        db.flush()
        
        # Create member membership
        member_membership = Membership(
            id=str(uuid.uuid4()),
            tenant_id=tenant.id,
            user_id=member_user.id,
            role=RoleEnum.MEMBER
        )
        db.add(member_membership)
        
        # Create a connector
        connector = Connector(
            id="conn_008",
            tenant_id=tenant.id,
            name="Microsoft Teams",
            category="Communication",
            type="Communication",
            external_url="https://teams.microsoft.com"
        )
        db.add(connector)
        
        db.commit()
        
        logger.info(f"Created sample tenant: {tenant.name}")
        logger.info(f"Admin user: {admin_email}")
        logger.info(f"Member user: {member_email}")
        
        return tenant
        
    except Exception as e:
        logger.error(f"Error creating sample tenant: {e}")
        db.rollback()
        return None
    finally:
        db.close()


def create_connector_categories() -> None:
    """Create predefined connector categories.
    
    Creates 10 predefined connector categories including:
    CRM, ERP, Analytics, Communication, E-commerce, Project Management,
    HR, Finance, Marketing, and Storage.
    
    Returns:
        None
        
    Raises:
        Exception: If database error occurs during creation.
    """
    db = SessionLocal()
    
    try:
        # Check if categories already exist
        existing_categories = db.query(ConnectorCategory).count()
        if existing_categories > 0:
            logger.info(f"Connector categories already exist: {existing_categories} found")
            return
        
        categories = [
            {
                "id": "cat_001",
                "name": "CRM",
                "description": "Customer Relationship Management connectors for managing customer data and interactions"
            },
            {
                "id": "cat_002", 
                "name": "ERP",
                "description": "Enterprise Resource Planning connectors for business process management"
            },
            {
                "id": "cat_003",
                "name": "Analytics",
                "description": "Data analytics and business intelligence connectors"
            },
            {
                "id": "cat_004",
                "name": "Communication",
                "description": "Email, messaging and collaboration tools"
            },
            {
                "id": "cat_005",
                "name": "E-commerce",
                "description": "Online shopping and payment processing connectors"
            },
            {
                "id": "cat_006",
                "name": "Project Management",
                "description": "Task tracking and project collaboration tools"
            },
            {
                "id": "cat_007",
                "name": "HR",
                "description": "Human resources and talent management systems"
            },
            {
                "id": "cat_008",
                "name": "Finance",
                "description": "Accounting, billing and financial management tools"
            },
            {
                "id": "cat_009",
                "name": "Marketing",
                "description": "Marketing automation and campaign management tools"
            },
            {
                "id": "cat_010",
                "name": "Storage",
                "description": "Cloud storage and file management services"
            }
        ]
        
        for cat_data in categories:
            category = ConnectorCategory(
                id=cat_data["id"],
                name=cat_data["name"],
                description=cat_data["description"]
            )
            db.add(category)
        
        db.commit()
        logger.info(f"Created {len(categories)} connector categories")
        
    except Exception as e:
        logger.error(f"Error creating connector categories: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def create_connector_catalog() -> None:
    """Create sample connector catalog entries.
    
    Creates 20 predefined connector catalog entries across various categories
    including popular services like Salesforce, Slack, Jira, Shopify, etc.
    
    Returns:
        None
        
    Raises:
        Exception: If database error occurs during creation.
    """
    db = SessionLocal()
    
    try:
        # Check if connectors already exist
        existing_connectors = db.query(ConnectorCatalog).count()
        if existing_connectors > 0:
            logger.info(f"Connector catalog entries already exist: {existing_connectors} found")
            return
        
        connectors = [
            # CRM Connectors
            {
                "id": "conn_001",
                "connector_id": "salesforce",
                "name": "Salesforce CRM",
                "type": "CRM",
                "usecase": "Manage customer relationships, sales pipeline, and customer data"
            },
            {
                "id": "conn_002",
                "connector_id": "hubspot",
                "name": "HubSpot",
                "type": "CRM",
                "usecase": "Inbound marketing, sales, and customer service platform"
            },
            
            # ERP Connectors
            {
                "id": "conn_003",
                "connector_id": "sap",
                "name": "SAP ERP",
                "type": "ERP",
                "usecase": "Enterprise resource planning and business management"
            },
            {
                "id": "conn_004",
                "connector_id": "oracle",
                "name": "Oracle ERP",
                "type": "ERP", 
                "usecase": "Comprehensive business management solutions"
            },
            
            # Analytics Connectors
            {
                "id": "conn_005",
                "connector_id": "tableau",
                "name": "Tableau",
                "type": "Analytics",
                "usecase": "Business intelligence and data visualization"
            },
            {
                "id": "conn_006",
                "connector_id": "powerbi",
                "name": "Microsoft Power BI",
                "type": "Analytics",
                "usecase": "Business analytics and interactive data visualization"
            },
            
            # Communication Connectors
            {
                "id": "conn_007",
                "connector_id": "slack",
                "name": "Slack",
                "type": "Communication",
                "usecase": "Team collaboration and messaging platform"
            },
            {
                "id": "conn_008",
                "connector_id": "microsoft-teams",
                "name": "Microsoft Teams",
                "type": "Communication",
                "usecase": "Team collaboration and video conferencing"
            },
            
            # E-commerce Connectors
            {
                "id": "conn_009",
                "connector_id": "shopify",
                "name": "Shopify",
                "type": "E-commerce",
                "usecase": "Online store management and e-commerce platform"
            },
            {
                "id": "conn_010",
                "connector_id": "stripe",
                "name": "Stripe",
                "type": "E-commerce",
                "usecase": "Online payment processing and financial services"
            },
            
            # Project Management Connectors
            {
                "id": "conn_011",
                "connector_id": "jira",
                "name": "Jira",
                "type": "Project Management",
                "usecase": "Issue tracking and project management"
            },
            {
                "id": "conn_012",
                "connector_id": "asana",
                "name": "Asana",
                "type": "Project Management",
                "usecase": "Work management and team collaboration"
            },
            
            # HR Connectors
            {
                "id": "conn_013",
                "connector_id": "workday",
                "name": "Workday",
                "type": "HR",
                "usecase": "Human capital management and HR solutions"
            },
            {
                "id": "conn_014",
                "connector_id": "bamboohr",
                "name": "BambooHR",
                "type": "HR",
                "usecase": "HR management and employee data platform"
            },
            
            # Finance Connectors
            {
                "id": "conn_015",
                "connector_id": "quickbooks",
                "name": "QuickBooks",
                "type": "Finance",
                "usecase": "Accounting and financial management software"
            },
            {
                "id": "conn_016",
                "connector_id": "xero",
                "name": "Xero",
                "type": "Finance",
                "usecase": "Cloud-based accounting software for small businesses"
            },
            
            # Marketing Connectors
            {
                "id": "conn_017",
                "connector_id": "mailchimp",
                "name": "Mailchimp",
                "type": "Marketing",
                "usecase": "Email marketing and automation platform"
            },
            {
                "id": "conn_018",
                "connector_id": "hubspot-marketing",
                "name": "HubSpot Marketing",
                "type": "Marketing",
                "usecase": "Inbound marketing and marketing automation"
            },
            
            # Storage Connectors
            {
                "id": "conn_019",
                "connector_id": "google-drive",
                "name": "Google Drive",
                "type": "Storage",
                "usecase": "Cloud storage and file collaboration"
            },
            {
                "id": "conn_020",
                "connector_id": "dropbox",
                "name": "Dropbox",
                "type": "Storage",
                "usecase": "Cloud storage and file synchronization"
            }
        ]
        
        for conn_data in connectors:
            connector = ConnectorCatalog(
                id=conn_data["id"],
                connector_id=conn_data["connector_id"],
                name=conn_data["name"],
                type=conn_data["type"],
                usecase=conn_data["usecase"]
            )
            db.add(connector)
        
        db.commit()
        logger.info(f"Created {len(connectors)} connector catalog entries")
        
    except Exception as e:
        logger.error(f"Error creating connector catalog: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def seed_all() -> None:
    """Run all database seeding operations.
    
    Executes the complete seeding process:
    1. Creates database tables
    2. Creates super admin user
    3. Creates connector categories
    4. Creates connector catalog entries
    5. Optionally creates sample tenant
    
    Returns:
        None
        
    Raises:
        Exception: If any seeding operation fails.
    """
    logger.info("Starting database seeding...")
    logger.info(f"Database URL: {os.getenv('DATABASE_URL', 'postgresql://user:password@localhost/connectx')}")
    
    # Create tables
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")
    
    # Create super admin
    logger.info("Creating super admin...")
    create_super_admin()
    
    # Create connector categories
    logger.info("Creating connector categories...")
    create_connector_categories()
    
    # Create connector catalog
    logger.info("Creating connector catalog...")
    create_connector_catalog()
    
    # Create sample tenant (optional)
    if os.getenv("CREATE_SAMPLE_TENANT", "true").lower() == "true":
        logger.info("Creating sample tenant...")
        create_sample_tenant()
    
    logger.info("Database seeding completed!")

if __name__ == "__main__":
    seed_all()
