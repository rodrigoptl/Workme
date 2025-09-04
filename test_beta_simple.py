#!/usr/bin/env python3
"""
Test beta environment endpoints - simple version
"""

import requests
import json

# Get backend URL from frontend .env
BACKEND_URL = "https://pro-match.preview.emergentagent.com/api"

def test_beta_environment_info():
    """Test GET /api/beta/environment - Beta Environment Info"""
    try:
        print("Testing Beta Environment Info...")
        response = requests.get(f"{BACKEND_URL}/beta/environment")
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            required_fields = ["environment", "is_beta", "beta_users_count", "max_beta_users", "beta_spots_remaining", "version"]
            
            if all(field in data for field in required_fields):
                print("✅ All required fields present")
                
                environment = data["environment"]
                is_beta = data["is_beta"]
                beta_users_count = data["beta_users_count"]
                max_beta_users = data["max_beta_users"]
                beta_spots_remaining = data["beta_spots_remaining"]
                version = data["version"]
                
                print(f"Environment: {environment}")
                print(f"Is Beta: {is_beta}")
                print(f"Beta Users: {beta_users_count}/{max_beta_users}")
                print(f"Spots Remaining: {beta_spots_remaining}")
                print(f"Version: {version}")
                
                return True
            else:
                missing_fields = [field for field in required_fields if field not in data]
                print(f"❌ Missing required fields: {missing_fields}")
                return False
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return False

def test_beta_validate_access():
    """Test POST /api/beta/validate-access"""
    try:
        print("\nTesting Beta Access Validation...")
        
        # Test with correct access code
        response = requests.post(f"{BACKEND_URL}/beta/validate-access", params={"access_code": "WORKME2025BETA"})
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if "valid" in data and "message" in data:
                print(f"✅ Access validation working: {data['message']}")
                return True
            else:
                print("❌ Invalid response format")
                return False
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return False

if __name__ == "__main__":
    print(f"🧪 Testing Beta Environment Endpoints")
    print(f"Backend URL: {BACKEND_URL}")
    print("=" * 60)
    
    results = []
    
    # Test unauthenticated endpoints
    results.append(test_beta_environment_info())
    results.append(test_beta_validate_access())
    
    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"📊 RESULTS: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED!")
    else:
        print(f"⚠️  {total - passed} test(s) failed")