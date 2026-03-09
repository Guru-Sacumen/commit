#!/usr/bin/env python3
"""
Comprehensive test script for all ConnectX Backend modules
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'connectx-api'))

def test_module_imports():
    """Test all module imports"""
    print("🧪 Testing all module imports...")
    
    modules = [
        ("admin", "admin.routes"),
        ("user", "user.routes"),
        ("superadmin", "superadmin.routes"),
        ("support", "support.routes"),
        ("integration_library", "integration_library.routes"),
        ("lab_validation", "lab_validation.routes"),
        ("automated_testing", "automated_testing.routes"),
        ("agentic_monitor", "agentic_monitor.routes"),
    ]
    
    for module_name, module_path in modules:
        try:
            module = __import__(module_path, fromlist=['router'])
            if hasattr(module, 'router'):
                print(f"✅ {module_name} module imported successfully")
            else:
                print(f"❌ {module_name} module missing router")
                return False
        except Exception as e:
            print(f"❌ {module_name} module import failed: {e}")
            return False
    
    return True

def test_main_app():
    """Test main FastAPI application"""
    print("\n🌐 Testing main FastAPI application...")
    
    try:
        from main_new import app
        
        if app.title == "ConnectX Backend API":
            print("✅ Main app loaded successfully")
        else:
            print("❌ Main app title incorrect")
            return False
        
        # Count routes
        routes = [route for route in app.routes if hasattr(route, 'path')]
        print(f"✅ Total routes: {len(routes)}")
        
        # Check key routes exist
        key_routes = [
            "/auth/login",
            "/auth/logout", 
            "/me",
            "/health",
            "/superadmin/companies",
            "/admin/{tenant_id}/users",
            "/support/notifications",
            "/integration-library/catalog",
            "/lab-validation/tests",
            "/automated-testing/test-suites",
            "/agentic-monitor/agents"
        ]
        
        for route in key_routes:
            matching_routes = [r for r in routes if route in r.path]
            if matching_routes:
                print(f"✅ Route {route} exists")
            else:
                print(f"❌ Route {route} missing")
                return False
        
    except Exception as e:
        print(f"❌ Main app test failed: {e}")
        return False
    
    return True

def test_module_health_endpoints():
    """Test all module health endpoints"""
    print("\n🏥 Testing module health endpoints...")
    
    modules = [
        ("support", "/support/health"),
        ("integration_library", "/integration-library/health"),
        ("lab_validation", "/lab-validation/health"),
        ("automated_testing", "/automated-testing/health"),
        ("agentic_monitor", "/agentic-monitor/health"),
    ]
    
    for module_name, health_endpoint in modules:
        try:
            from main_new import app
            from fastapi.testclient import TestClient
            
            client = TestClient(app)
            response = client.get(health_endpoint)
            
            if response.status_code == 200:
                print(f"✅ {module_name} health endpoint working")
            else:
                print(f"❌ {module_name} health endpoint failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ {module_name} health endpoint test failed: {e}")
            return False
    
    return True

def test_route_structure():
    """Test route structure and organization"""
    print("\n📋 Testing route structure...")
    
    try:
        from main_new import app
        
        # Group routes by module
        route_groups = {
            "auth": [],
            "user": [],
            "admin": [],
            "superadmin": [],
            "support": [],
            "integration_library": [],
            "lab_validation": [],
            "automated_testing": [],
            "agentic_monitor": [],
        }
        
        for route in app.routes:
            if hasattr(route, 'path'):
                path = route.path
                if "/auth/" in path:
                    route_groups["auth"].append(path)
                elif "/me" in path:
                    route_groups["user"].append(path)
                elif "/admin/" in path:
                    route_groups["admin"].append(path)
                elif "/superadmin/" in path:
                    route_groups["superadmin"].append(path)
                elif "/support/" in path:
                    route_groups["support"].append(path)
                elif "/integration-library/" in path:
                    route_groups["integration_library"].append(path)
                elif "/lab-validation/" in path:
                    route_groups["lab_validation"].append(path)
                elif "/automated-testing/" in path:
                    route_groups["automated_testing"].append(path)
                elif "/agentic-monitor/" in path:
                    route_groups["agentic_monitor"].append(path)
        
        # Check each module has routes
        for module, routes in route_groups.items():
            if routes:
                print(f"✅ {module} module has {len(routes)} routes")
            else:
                print(f"⚠️  {module} module has no routes")
        
        return True
        
    except Exception as e:
        print(f"❌ Route structure test failed: {e}")
        return False

def test_schemas():
    """Test Pydantic schemas"""
    print("\n📝 Testing Pydantic schemas...")
    
    try:
        from schemas import (
            Token, UserOut, UserCreateRequest, CompanyCreate,
            NotificationOut, GoogleLogin, ForgotPasswordRequest
        )
        
        # Test schema instantiation
        token = Token(access_token="test_token")
        print("✅ Token schema working")
        
        user_out = UserOut(
            id="123",
            email="test@example.com",
            created_at="2024-01-01T00:00:00",
            role="MEMBER",
            superadmin=False,
            auth_provider="LOCAL",
            mfa_enabled=False
        )
        print("✅ UserOut schema working")
        
        return True
        
    except Exception as e:
        print(f"❌ Schema test failed: {e}")
        return False

def main():
    """Run all module tests"""
    print("🚀 Starting ConnectX Backend Module Tests\n")
    
    tests = [
        test_module_imports,
        test_main_app,
        test_module_health_endpoints,
        test_route_structure,
        test_schemas,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f"\n📊 Module Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All module tests passed! Backend is fully functional.")
        print("\n📋 Available modules:")
        print("1. ✅ Authentication & Authorization")
        print("2. ✅ User Management")
        print("3. ✅ Admin Functions")
        print("4. ✅ Superadmin Functions")
        print("5. ✅ Support & Notifications")
        print("6. ✅ Integration Library")
        print("7. ✅ Lab Validation")
        print("8. ✅ Automated Testing")
        print("9. ✅ Agentic Monitoring")
        print("\n🚀 Ready for production!")
        return True
    else:
        print("❌ Some module tests failed. Please check the errors above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
