#!/usr/bin/env python3
"""
Debug script to check TOTP status of all users
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def check_user_totp_status():
    print("🔍 TOTP Status Check for All Users")
    print("=" * 50)
    
    # Get superadmin token
    try:
        response = requests.post(f"{BASE_URL}/auth/login", 
                               data={"username": "superadmin@example.com", "password": "Super@123"})
        if response.status_code != 200:
            print("❌ Failed to get superadmin token")
            return
            
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get all companies
        companies_response = requests.get(f"{BASE_URL}/superadmin/companies", headers=headers)
        if companies_response.status_code == 200:
            companies = companies_response.json()
            
            for company in companies:
                tenant_id = company["id"]
                print(f"\n📁 Company: {company['name']} ({tenant_id})")
                
                # Get users for this company
                users_response = requests.get(f"{BASE_URL}/admin/{tenant_id}/users", headers=headers)
                if users_response.status_code == 200:
                    users = users_response.json()
                    
                    for user in users:
                        print(f"   👤 {user['email']}")
                        print(f"      🔐 MFA Enabled: {user.get('mfa_enabled', False)}")
                        print(f"      ✅ TOTP Verified: {user.get('totp_verified', False)}")
                        print(f"      🎭 Role: {user.get('role', 'Unknown')}")
                        
                        # Determine what should happen on login
                        mfa_enabled = user.get('mfa_enabled', False)
                        totp_verified = user.get('totp_verified', False)
                        role = user.get('role', '')
                        
                        if role == 'SUPERADMIN':
                            print(f"      📱 Login Flow: Direct to dashboard (Superadmin)")
                        elif mfa_enabled and not totp_verified:
                            print(f"      📱 Login Flow: TOTP Setup Modal")
                        elif mfa_enabled and totp_verified:
                            print(f"      📱 Login Flow: TOTP Verification Screen")
                        else:
                            print(f"      📱 Login Flow: Direct to dashboard (No MFA)")
                        print()
                        
        else:
            print(f"❌ Failed to get companies: {companies_response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_user_totp_status()
