# seed_users.py - Initial super admin seed data
import os
import uuid
from datetime import datetime
from dotenv import load_dotenv

from database import SessionLocal, engine, Base
from models import User, Tenant, Membership, RoleEnum, ConnectorCategory, ConnectorCatalog
from auth import hash_password

load_dotenv()

def create_super_admin():
    """Create initial super admin user"""
    db = SessionLocal()
    
    try:
        # Check if super admin already exists
        existing_superadmin = db.query(User).filter(User.superadmin == True).first()
        if existing_superadmin:
            print(f"Super admin already exists: {existing_superadmin.email}")
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
            password_hash=hash_password(password),
            superadmin=True,
            auth_provider="LOCAL",
            mfa_enabled=False,  # Superadmin can choose to enable MFA
            totp_verified=False,
            totp_secret=None,
        )
        
        db.add(superadmin)
        db.commit()
        db.refresh(superadmin)
        
        print(f"✅ Created super admin: {email}")
        print(f"   Password: {password}")
        print(f"   Please change the password after first login!")
        
        return superadmin
        
    except Exception as e:
        print(f"❌ Error creating super admin: {e}")
        db.rollback()
        return None
    finally:
        db.close()

def create_sample_tenant():
    """Create a sample tenant with admin user for demonstration"""
    db = SessionLocal()
    
    try:
        # Check if sample tenant already exists
        existing_tenant = db.query(Tenant).filter(Tenant.name == "Demo Company").first()
        if existing_tenant:
            print("✅ Sample tenant created successfully")
            return existing_tenant, None
        
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
            totp_verified=False
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
            password_hash=hash_password(member_password),
            superadmin=False,
            auth_provider="LOCAL",
            mfa_enabled=False,
            totp_verified=False
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
            connector_id="microsoft-teams",
            name="Microsoft Teams",
            type="Communication",
            usecase="Team collaboration and video conferencing"
        )
        db.add(connector)
        
        db.commit()
        
        print(f"✅ Created sample tenant: {tenant.name}")
        print(f"   Admin: {admin_email} / {admin_password}")
        print(f"   User: {member_email} / {member_password}")
        
        return tenant
        
    except Exception as e:
        print(f"❌ Error creating sample tenant: {e}")
        db.rollback()
        return None
    finally:
        db.close()


def create_connector_categories():
    """Create connector categories"""
    db = SessionLocal()
    
    try:
        # Check if categories already exist
        existing_categories = db.query(ConnectorCategory).count()
        if existing_categories > 0:
            print(f"Connector categories already exist: {existing_categories} found")
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
        print(f"✅ Created {len(categories)} connector categories")
        
    finally:
        db.close()


def create_connector_catalog():
    """Create sample connector catalog entries"""
    db = SessionLocal()
    
    try:
        # Check if connectors already exist
        existing_connectors = db.query(ConnectorCatalog).count()
        if existing_connectors > 0:
            print(f"Connector catalog entries already exist: {existing_connectors} found")
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
        print(f"✅ Created {len(connectors)} connector catalog entries")
        
    finally:
        db.close()


def seed_all():
    """Run all seed operations"""
    print("🌱 Starting database seeding...")
    print(f"   Database URL: {os.getenv('DATABASE_URL', 'postgresql://user:password@localhost/connectx')}")
    print()
    
    # Create tables
    print("📋 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")
    print()
    
    # Create super admin
    print("👑 Creating super admin...")
    create_super_admin()
    print()
    
    # Create connector categories
    print("📂 Creating connector categories...")
    create_connector_categories()
    print()
    
    # Create connector catalog
    print("📋 Creating connector catalog...")
    create_connector_catalog()
    print()
    
    # Create sample tenant (optional)
    if os.getenv("CREATE_SAMPLE_TENANT", "true").lower() == "true":
        print("🏢 Creating sample tenant...")
        create_sample_tenant()
        print()
    
    print("🎉 Database seeding completed!")

if __name__ == "__main__":
    seed_all()
