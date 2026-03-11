"""
Pytest configuration and shared fixtures for ConnectX backend tests.

This module provides common test fixtures including:
- Test database setup and teardown
- Test client configuration
- Mock user and tenant fixtures
- Authentication helpers
"""

import os
import sys
import uuid
from datetime import datetime
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base
from main import app
from auth import get_db, hash_password
from models import User, Tenant, Membership, RoleEnum, ConnectorCatalog, Connector, Notification


SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db() -> Generator[Session, None, None]:
    """
    Override database dependency for testing.

    Yields:
        Session: Test database session.
    """
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """
    Create a fresh database for each test.

    Yields:
        Session: Test database session with clean tables.
    """
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db: Session) -> TestClient:
    """
    Create a test client with database dependency override.

    Args:
        db: Test database session fixture.

    Returns:
        TestClient: FastAPI test client instance.
    """
    return TestClient(app)


@pytest.fixture
def test_superadmin(db: Session) -> User:
    """
    Create a test superadmin user.

    Args:
        db: Test database session.

    Returns:
        User: Superadmin user instance.
    """
    user = User(
        id=str(uuid.uuid4()),
        email="superadmin@test.com",
        full_name="Test Superadmin",
        password_hash=hash_password("testpass123"),
        superadmin=True,
        auth_provider="LOCAL",
        mfa_enabled=False,
        totp_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_tenant(db: Session) -> Tenant:
    """
    Create a test tenant.

    Args:
        db: Test database session.

    Returns:
        Tenant: Test tenant instance.
    """
    tenant = Tenant(
        id=str(uuid.uuid4()),
        name="Test Company",
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


@pytest.fixture
def test_admin_user(db: Session, test_tenant: Tenant) -> User:
    """
    Create a test admin user with tenant membership.

    Args:
        db: Test database session.
        test_tenant: Test tenant fixture.

    Returns:
        User: Admin user instance with membership.
    """
    user = User(
        id=str(uuid.uuid4()),
        email="admin@test.com",
        full_name="Test Admin",
        password_hash=hash_password("testpass123"),
        superadmin=False,
        auth_provider="LOCAL",
        mfa_enabled=False,
        totp_verified=False,
    )
    db.add(user)
    db.flush()

    membership = Membership(
        id=str(uuid.uuid4()),
        tenant_id=test_tenant.id,
        user_id=user.id,
        role=RoleEnum.ADMIN,
    )
    db.add(membership)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_member_user(db: Session, test_tenant: Tenant) -> User:
    """
    Create a test member user with tenant membership.

    Args:
        db: Test database session.
        test_tenant: Test tenant fixture.

    Returns:
        User: Member user instance with membership.
    """
    user = User(
        id=str(uuid.uuid4()),
        email="member@test.com",
        full_name="Test Member",
        password_hash=hash_password("testpass123"),
        superadmin=False,
        auth_provider="LOCAL",
        mfa_enabled=False,
        totp_verified=False,
    )
    db.add(user)
    db.flush()

    membership = Membership(
        id=str(uuid.uuid4()),
        tenant_id=test_tenant.id,
        user_id=user.id,
        role=RoleEnum.MEMBER,
    )
    db.add(membership)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_connector_catalog(db: Session) -> ConnectorCatalog:
    """
    Create a test connector catalog entry.

    Args:
        db: Test database session.

    Returns:
        ConnectorCatalog: Test connector catalog instance.
    """
    catalog = ConnectorCatalog(
        id=str(uuid.uuid4()),
        connector_id="test-connector",
        name="Test Connector",
        type="API",
        usecase="Testing purposes",
    )
    db.add(catalog)
    db.commit()
    db.refresh(catalog)
    return catalog


@pytest.fixture
def test_connector(db: Session, test_tenant: Tenant) -> Connector:
    """
    Create a test connector for a tenant.

    Args:
        db: Test database session.
        test_tenant: Test tenant fixture.

    Returns:
        Connector: Test connector instance.
    """
    connector = Connector(
        id=str(uuid.uuid4()),
        tenant_id=test_tenant.id,
        name="test-connector",
        category="API",
        type="API",
        logo_url="https://example.com/logo.png",
        external_url="https://api.example.com",
    )
    db.add(connector)
    db.commit()
    db.refresh(connector)
    return connector


@pytest.fixture
def test_notification(db: Session, test_tenant: Tenant, test_member_user: User) -> Notification:
    """
    Create a test notification.

    Args:
        db: Test database session.
        test_tenant: Test tenant fixture.
        test_member_user: Test member user fixture.

    Returns:
        Notification: Test notification instance.
    """
    notification = Notification(
        id=str(uuid.uuid4()),
        tenant_id=test_tenant.id,
        recipient_user_id=test_member_user.id,
        actor_user_id=test_member_user.id,
        title="Test Notification",
        message="This is a test notification",
        entity_type="test",
        entity_id="test-123",
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def get_auth_headers(client: TestClient, email: str, password: str) -> dict:
    """
    Get authentication headers for a user.

    Args:
        client: Test client instance.
        email: User email.
        password: User password.

    Returns:
        dict: Authorization headers with bearer token.
    """
    response = client.post(
        "/auth/login",
        data={"username": email, "password": password},
    )
    if response.status_code == 200:
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    return {}


@pytest.fixture
def superadmin_headers(client: TestClient, test_superadmin: User) -> dict:
    """
    Get authentication headers for superadmin.

    Args:
        client: Test client instance.
        test_superadmin: Superadmin user fixture.

    Returns:
        dict: Authorization headers.
    """
    return get_auth_headers(client, "superadmin@test.com", "testpass123")


@pytest.fixture
def admin_headers(client: TestClient, test_admin_user: User) -> dict:
    """
    Get authentication headers for admin user.

    Args:
        client: Test client instance.
        test_admin_user: Admin user fixture.

    Returns:
        dict: Authorization headers.
    """
    return get_auth_headers(client, "admin@test.com", "testpass123")


@pytest.fixture
def member_headers(client: TestClient, test_member_user: User) -> dict:
    """
    Get authentication headers for member user.

    Args:
        client: Test client instance.
        test_member_user: Member user fixture.

    Returns:
        dict: Authorization headers.
    """
    return get_auth_headers(client, "member@test.com", "testpass123")
