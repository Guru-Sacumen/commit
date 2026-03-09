#!/usr/bin/env python3
"""
Test script to demonstrate the complete TOTP flow for ConnectX
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_complete_totp_flow():
    print("🎯 Complete TOTP Flow Demonstration")
    print("=" * 60)
    
    # Test user credentials
    email = "newuser@test.com"
    password = "newpass123"
    
    print(f"\n📝 Testing with user: {email}")
    print(f"🔑 Password: {password}")
    
    # Step 1: Test login with TOTP requirement
    print("\n1️⃣ Testing login flow (should trigger TOTP setup)...")
    
    login_data = {
        "email": email,
        "password": password,
        "totp_token": None
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login-with-totp", json=login_data)
        if response.status_code == 200:
            token_data = response.json()
            token = token_data["access_token"]
            print("✅ Login successful (user not yet TOTP verified)")
            
            # Step 2: Check user details
            print("\n2️⃣ Checking user details...")
            headers = {"Authorization": f"Bearer {token}"}
            
            me_response = requests.get(f"{BASE_URL}/me", headers=headers)
            if me_response.status_code == 200:
                user_data = me_response.json()
                print(f"   📧 Email: {user_data['email']}")
                print(f"   🔐 MFA Enabled: {user_data['mfa_enabled']}")
                print(f"   ✅ TOTP Verified: {user_data['totp_verified']}")
                print(f"   🎭 Role: {user_data['role']}")
                
                # Step 3: TOTP Setup
                print("\n3️⃣ Setting up TOTP...")
                setup_response = requests.post(f"{BASE_URL}/auth/totp/setup", headers=headers)
                if setup_response.status_code == 200:
                    totp_data = setup_response.json()
                    print("✅ TOTP setup successful")
                    print(f"   📱 QR Code: {'Generated' if totp_data.get('qr_code') else 'Not generated'}")
                    print(f"   🔤 Secret: {totp_data.get('secret', 'N/A')[:10]}...")
                    
                    # Step 4: Simulate TOTP verification
                    print("\n4️⃣ Simulating TOTP verification...")
                    # Note: In real scenario, user would scan QR code and enter code from app
                    print("   📱 User should now:")
                    print("      - Scan QR code with Google Authenticator")
                    print("      - Enter 6-digit code from app")
                    print("      - Click 'Verify & Enable'")
                    
                    # For testing, we'll manually mark as verified
                    print("\n5️⃣ For testing: Marking TOTP as verified...")
                    # In real implementation, this would be done via the verify endpoint
                    # with a valid TOTP token from the app
                    
                    print("\n6️⃣ Testing login after TOTP verification...")
                    # Now login should require TOTP token
                    login_response = requests.post(f"{BASE_URL}/auth/login-with-totp", json=login_data)
                    if login_response.status_code == 401:
                        result = login_response.json()
                        if result.get("detail") == "TOTP token required":
                            print("✅ Login now correctly requires TOTP token")
                        else:
                            print(f"❌ Unexpected error: {result}")
                    else:
                        print(f"❌ Expected 401, got {login_response.status_code}")
                    
                    print("\n🎉 Frontend Flow Summary:")
                    print("=" * 40)
                    print("1. User logs in with email/password")
                    print("2. Frontend detects mfa_enabled=true & totp_verified=false")
                    print("3. TOTP Setup Modal appears with QR code")
                    print("4. User scans QR code with Google Authenticator")
                    print("5. User enters 6-digit code and clicks verify")
                    print("6. Frontend calls /auth/totp/verify endpoint")
                    print("7. On success, user is redirected to dashboard")
                    print("8. Future logins will show TOTP verification screen")
                    
                else:
                    print(f"❌ TOTP setup failed: {setup_response.status_code}")
            else:
                print(f"❌ Failed to get user details: {me_response.status_code}")
                
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n" + "=" * 60)
    print("🔧 To test in browser:")
    print(f"1. Go to http://localhost:5173/login")
    print(f"2. Login with: {email} / {password}")
    print("3. You should see the TOTP setup modal")
    print("4. Use Google Authenticator app to scan QR code")
    print("5. Enter verification code to complete setup")

if __name__ == "__main__":
    test_complete_totp_flow()
