#!/usr/bin/env python3
"""
Test script to verify reports API endpoints work correctly.
"""
import asyncio
import aiohttp
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

async def test_reports_api():
    """Test reports API endpoints with authentication"""
    
    async with aiohttp.ClientSession() as session:
        # First, try to authenticate
        print("🔐 Testing authentication...")
        
        # Test login with existing test user
        login_data = {
            "email": "test@dreflowpro.com",
            "password": "testpassword"  # This might not be the actual password
        }
        
        try:
            async with session.post(f"{BASE_URL}/api/v1/auth/login", json=login_data) as response:
                if response.status == 200:
                    auth_data = await response.json()
                    print(f"✅ Authentication successful")
                    
                    # Extract token
                    access_token = auth_data.get("access_token")
                    if not access_token:
                        print("❌ No access token in response")
                        return
                    
                    print(f"🔑 Got access token: {access_token[:20]}...")
                    
                    # Set authorization header for subsequent requests
                    headers = {"Authorization": f"Bearer {access_token}"}
                    
                    # Test reports statistics endpoint
                    print("\n📊 Testing reports statistics endpoint...")
                    async with session.get(f"{BASE_URL}/api/v1/reports/statistics", headers=headers) as response:
                        if response.status == 200:
                            stats_data = await response.json()
                            print("✅ Statistics endpoint working:")
                            print(json.dumps(stats_data, indent=2))
                        else:
                            print(f"❌ Statistics endpoint failed: {response.status}")
                            text = await response.text()
                            print(f"Response: {text}")
                    
                    # Test reports list endpoint
                    print("\n📋 Testing reports list endpoint...")
                    async with session.get(f"{BASE_URL}/api/v1/reports", headers=headers) as response:
                        if response.status == 200:
                            reports_data = await response.json()
                            print("✅ List endpoint working:")
                            print(json.dumps(reports_data, indent=2))
                        else:
                            print(f"❌ List endpoint failed: {response.status}")
                            text = await response.text()
                            print(f"Response: {text}")
                            
                elif response.status == 401:
                    print("❌ Invalid credentials")
                    # Try different credentials or create a test user
                    text = await response.text()
                    print(f"Response: {text}")
                else:
                    print(f"❌ Login failed with status {response.status}")
                    text = await response.text()
                    print(f"Response: {text}")
                    
        except aiohttp.ClientConnectorError:
            print("❌ Backend server is not running")
        except Exception as e:
            print(f"❌ Error during testing: {e}")

async def create_test_user_and_test():
    """Create a test user if needed and then test the API"""
    
    async with aiohttp.ClientSession() as session:
        # Try to register a new test user
        print("👤 Creating test user...")
        
        register_data = {
            "email": "apitester@dreflowpro.com",
            "password": "testpassword123",
            "first_name": "API",
            "last_name": "Tester"
        }
        
        try:
            async with session.post(f"{BASE_URL}/api/v1/auth/register", json=register_data) as response:
                if response.status == 200 or response.status == 201:
                    print("✅ Test user created successfully")
                    
                    # Now try to login with this user
                    login_data = {
                        "email": register_data["email"],
                        "password": register_data["password"]
                    }
                    
                    async with session.post(f"{BASE_URL}/api/v1/auth/login", json=login_data) as login_response:
                        if login_response.status == 200:
                            auth_data = await login_response.json()
                            print("✅ Login with test user successful")
                            
                            access_token = auth_data.get("access_token")
                            headers = {"Authorization": f"Bearer {access_token}"}
                            
                            # Test the reports endpoints
                            print("\n📊 Testing reports with new user...")
                            async with session.get(f"{BASE_URL}/api/v1/reports/statistics", headers=headers) as stats_response:
                                print(f"Statistics endpoint: {stats_response.status}")
                                if stats_response.status == 200:
                                    data = await stats_response.json()
                                    print(json.dumps(data, indent=2))
                                    
                        else:
                            print(f"❌ Login failed: {login_response.status}")
                            
                elif response.status == 409:
                    print("ℹ️ Test user already exists, trying to login...")
                    # Try to login with existing credentials
                    await test_reports_api()
                else:
                    print(f"❌ User creation failed: {response.status}")
                    text = await response.text()
                    print(f"Response: {text}")
                    
        except Exception as e:
            print(f"❌ Error creating test user: {e}")

if __name__ == "__main__":
    print("🚀 Starting Reports API Test")
    print("=" * 50)
    
    # First try with existing users
    asyncio.run(test_reports_api())
    
    print("\n" + "=" * 50)
    print("🔄 Trying with new test user...")
    
    # Then try creating a new user
    asyncio.run(create_test_user_and_test())