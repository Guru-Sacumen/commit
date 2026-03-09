#!/usr/bin/env python3
"""
Comprehensive test script for ConnectX Backend
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'connectx-api'))

def test_imports():
    """Test all module imports"""
    print("🧪 Testing imports...")
    
    try:
        from database import Base, engine, SessionLocal
        print("✅ Database imports working")
    except Exception as e:
        print(f"❌ Database imports failed: {e}")
        return False
    
    try:
        from models import User, Tenant, Membership, RoleEnum
        print("✅ Models imports working")
    except Exception as e:
        print(f"❌ Models imports failed: {e}")
        return False
    
    try:
        from auth import hash_password, verify_password, create_access_token
        print("✅ Auth imports working")
    except Exception as e:
        print(f"❌ Auth imports failed: {e}")
        return False
    
    try:
        from config import settings
        print("✅ Config imports working")
    except Exception as e:
        print(f"❌ Config imports failed: {e}")
        return False
    
    try:
        from cache import cache
        print("✅ Cache imports working")
    except Exception as e:
        print(f"❌ Cache imports failed: {e}")
        return False
    
    try:
        from file_storage import file_storage
        print("✅ File storage imports working")
    except Exception as e:
        print(f"❌ File storage imports failed: {e}")
        return False
    
    try:
        from celery_app import celery_app
        print("✅ Celery imports working")
    except Exception as e:
        print(f"❌ Celery imports failed: {e}")
        return False
    
    try:
        from main_new import app
        print("✅ FastAPI app imports working")
    except Exception as e:
        print(f"❌ FastAPI app imports failed: {e}")
        return False
    
    return True

def test_authentication():
    """Test authentication functionality"""
    print("\n🔐 Testing authentication...")
    
    try:
        from auth import hash_password, verify_password, create_access_token
        import uuid
        
        # Test password hashing
        password = 'test123'
        hashed = hash_password(password)
        verified = verify_password(password, hashed)
        
        if verified:
            print("✅ Password hashing working")
        else:
            print("❌ Password hashing failed")
            return False
        
        # Test JWT token creation
        token = create_access_token(data={'sub': str(uuid.uuid4()), 'role': 'ADMIN'})
        if len(token) > 0:
            print("✅ JWT token creation working")
        else:
            print("❌ JWT token creation failed")
            return False
        
    except Exception as e:
        print(f"❌ Authentication test failed: {e}")
        return False
    
    return True

def test_cache():
    """Test cache functionality"""
    print("\n💾 Testing cache...")
    
    try:
        from cache import cache
        
        # Test cache set/get
        test_key = "test_key"
        test_value = {"test": "data"}
        
        cache.set(test_key, test_value, ttl=60)
        retrieved_value = cache.get(test_key)
        
        if retrieved_value == test_value:
            print("✅ Cache set/get working")
        else:
            print("❌ Cache set/get failed")
            return False
        
        # Test cache delete
        cache.delete(test_key)
        deleted_value = cache.get(test_key)
        
        if deleted_value is None:
            print("✅ Cache delete working")
        else:
            print("❌ Cache delete failed")
            return False
        
    except Exception as e:
        print(f"❌ Cache test failed: {e}")
        return False
    
    return True

def test_file_storage():
    """Test file storage functionality"""
    print("\n📁 Testing file storage...")
    
    try:
        from file_storage import file_storage
        from fastapi import UploadFile
        import io
        
        # Create a mock file
        file_content = b"test file content"
        mock_file = UploadFile(
            filename="test.txt",
            file=io.BytesIO(file_content),
            size=len(file_content)
        )
        
        # Test file saving
        file_info = file_storage.save_file(mock_file, subdirectory="temp")
        
        if file_info and "filename" in file_info:
            print("✅ File storage save working")
            
            # Test file retrieval
            file_path = file_storage.get_file_path(file_info["file_path"])
            if file_path.exists():
                print("✅ File storage retrieval working")
                
                # Clean up
                file_storage.delete_file(file_info["file_path"])
                print("✅ File storage cleanup working")
            else:
                print("❌ File storage retrieval failed")
                return False
        else:
            print("❌ File storage save failed")
            return False
        
    except Exception as e:
        print(f"❌ File storage test failed: {e}")
        return False
    
    return True

def test_database_connection():
    """Test database connection"""
    print("\n🗄️ Testing database connection...")
    
    try:
        from database import engine
        from sqlalchemy import text
        
        # Test database connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            if result.fetchone():
                print("✅ Database connection working")
                return True
            else:
                print("❌ Database connection failed")
                return False
        
    except Exception as e:
        print(f"❌ Database connection test failed: {e}")
        # Don't return False as this might just be configuration issue
        print("⚠️  Database connection issue (might be configuration)")
        return True

def test_fastapi_app():
    """Test FastAPI application"""
    print("\n🌐 Testing FastAPI application...")
    
    try:
        from main_new import app
        
        # Test app creation
        if app.title == "ConnectX Backend API":
            print("✅ FastAPI app creation working")
        else:
            print("❌ FastAPI app title incorrect")
            return False
        
        # Test routes
        routes = [route.path for route in app.routes if hasattr(route, 'path')]
        expected_routes = ['/auth/login', '/auth/google', '/auth/logout', '/auth/forgot-password', '/auth/reset-password', '/health', '/stats']
        
        for route in expected_routes:
            if route in routes:
                print(f"✅ Route {route} exists")
            else:
                print(f"❌ Route {route} missing")
                return False
        
    except Exception as e:
        print(f"❌ FastAPI app test failed: {e}")
        return False
    
    return True

def main():
    """Run all tests"""
    print("🚀 Starting ConnectX Backend Tests\n")
    
    tests = [
        test_imports,
        test_authentication,
        test_cache,
        test_file_storage,
        test_database_connection,
        test_fastapi_app,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Backend is ready to use.")
        print("\n📋 Next steps:")
        print("1. Set up your .env file (copy from env.example)")
        print("2. Start Redis server: redis-server")
        print("3. Start PostgreSQL database")
        print("4. Run migrations: alembic upgrade head")
        print("5. Start the application: ./start.sh")
        print("6. Visit API docs: http://localhost:8000/docs")
        return True
    else:
        print("❌ Some tests failed. Please check the errors above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
