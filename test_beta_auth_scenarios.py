#!/usr/bin/env python3
"""
Test beta environment endpoints for both authenticated and unauthenticated scenarios
"""

import requests
import json

# Get backend URL from frontend .env
BACKEND_URL = "https://pro-match.preview.emergentagent.com/api"

def test_unauthenticated_scenarios():
    """Test endpoints that should work without authentication"""
    print("🔓 Testing Unauthenticated Scenarios")
    print("-" * 50)
    
    results = []
    
    # Test 1: Beta Environment Info (should work without auth)
    try:
        print("1. Testing Beta Environment Info (unauthenticated)...")
        response = requests.get(f"{BACKEND_URL}/beta/environment")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ SUCCESS: {data['environment']}, {data['beta_users_count']}/{data['max_beta_users']} users")
            results.append(True)
        else:
            print(f"   ❌ FAILED: Status {response.status_code}")
            results.append(False)
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        results.append(False)
    
    # Test 2: Beta Access Validation (should work without auth)
    try:
        print("2. Testing Beta Access Validation (unauthenticated)...")
        response = requests.post(f"{BACKEND_URL}/beta/validate-access", params={"access_code": "WORKME2025BETA"})
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ SUCCESS: {data['message']}")
            results.append(True)
        else:
            print(f"   ❌ FAILED: Status {response.status_code}")
            results.append(False)
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        results.append(False)
    
    # Test 3: Analytics Tracking (should require auth)
    try:
        print("3. Testing Analytics Tracking (unauthenticated - should fail)...")
        event = {
            "session_id": "test_session",
            "event_type": "screen_view",
            "screen_name": "home"
        }
        response = requests.post(f"{BACKEND_URL}/beta/analytics/track", json=event)
        
        if response.status_code == 401:
            print(f"   ✅ SUCCESS: Correctly rejected (401 Unauthorized)")
            results.append(True)
        else:
            print(f"   ❌ FAILED: Expected 401, got {response.status_code}")
            results.append(False)
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        results.append(False)
    
    # Test 4: Feedback Submission (should require auth)
    try:
        print("4. Testing Feedback Submission (unauthenticated - should fail)...")
        feedback = {
            "screen_name": "home",
            "feedback_type": "suggestion",
            "message": "Test feedback"
        }
        response = requests.post(f"{BACKEND_URL}/beta/feedback/submit", json=feedback)
        
        if response.status_code == 401:
            print(f"   ✅ SUCCESS: Correctly rejected (401 Unauthorized)")
            results.append(True)
        else:
            print(f"   ❌ FAILED: Expected 401, got {response.status_code}")
            results.append(False)
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        results.append(False)
    
    # Test 5: Admin Stats (should require auth)
    try:
        print("5. Testing Admin Stats (unauthenticated - should fail)...")
        response = requests.get(f"{BACKEND_URL}/beta/admin/stats")
        
        if response.status_code == 401:
            print(f"   ✅ SUCCESS: Correctly rejected (401 Unauthorized)")
            results.append(True)
        else:
            print(f"   ❌ FAILED: Expected 401, got {response.status_code}")
            results.append(False)
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        results.append(False)
    
    return results

def get_auth_token():
    """Get authentication token for testing"""
    try:
        import time
        timestamp = int(time.time())
        
        user_data = {
            "email": f"beta.auth.test.{timestamp}@email.com",
            "full_name": "Beta Auth Test User",
            "phone": "+55 11 99999-1111",
            "user_type": "client",
            "password": "BetaAuthTest123!",
            "beta_access_code": "WORKME2025BETA"
        }
        
        response = requests.post(f"{BACKEND_URL}/auth/register", json=user_data)
        
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        elif response.status_code == 400 and "already registered" in response.text:
            # Try to login
            login_data = {
                "email": user_data["email"],
                "password": user_data["password"]
            }
            login_response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
            if login_response.status_code == 200:
                login_result = login_response.json()
                return login_result.get("access_token")
        
        return None
    except Exception as e:
        print(f"Auth setup error: {str(e)}")
        return None

def test_authenticated_scenarios():
    """Test endpoints that require authentication"""
    print("\n🔐 Testing Authenticated Scenarios")
    print("-" * 50)
    
    # Get auth token
    auth_token = get_auth_token()
    if not auth_token:
        print("❌ Could not get authentication token")
        return [False] * 4
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    results = []
    
    # Test 1: Analytics Tracking (authenticated)
    try:
        print("1. Testing Analytics Tracking (authenticated)...")
        event = {
            "session_id": "auth_test_session",
            "event_type": "screen_view",
            "screen_name": "home",
            "properties": {"test": "authenticated"}
        }
        response = requests.post(f"{BACKEND_URL}/beta/analytics/track", json=event, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ SUCCESS: {data['message']}")
            results.append(True)
        else:
            print(f"   ❌ FAILED: Status {response.status_code}")
            results.append(False)
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        results.append(False)
    
    # Test 2: Feedback Submission (authenticated)
    try:
        print("2. Testing Feedback Submission (authenticated)...")
        feedback = {
            "screen_name": "home",
            "feedback_type": "suggestion",
            "rating": 4,
            "message": "Authenticated feedback test",
            "device_info": {"platform": "test", "browser": "test"}
        }
        response = requests.post(f"{BACKEND_URL}/beta/feedback/submit", json=feedback, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ SUCCESS: {data['message']}")
            results.append(True)
        else:
            print(f"   ❌ FAILED: Status {response.status_code}")
            results.append(False)
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        results.append(False)
    
    # Test 3: Admin Stats (authenticated)
    try:
        print("3. Testing Admin Stats (authenticated)...")
        response = requests.get(f"{BACKEND_URL}/beta/admin/stats", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ SUCCESS: {data['total_beta_users']} beta users, {data['total_feedback_count']} feedback items")
            results.append(True)
        else:
            print(f"   ❌ FAILED: Status {response.status_code}")
            results.append(False)
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        results.append(False)
    
    # Test 4: Admin Feedback (authenticated)
    try:
        print("4. Testing Admin Feedback (authenticated)...")
        response = requests.get(f"{BACKEND_URL}/beta/admin/feedback", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            feedback_count = len(data['feedback'])
            print(f"   ✅ SUCCESS: Retrieved {feedback_count} feedback items")
            results.append(True)
        else:
            print(f"   ❌ FAILED: Status {response.status_code}")
            results.append(False)
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        results.append(False)
    
    return results

if __name__ == "__main__":
    print(f"🧪 Testing Beta Environment - Authentication Scenarios")
    print(f"Backend URL: {BACKEND_URL}")
    print("=" * 70)
    
    # Test unauthenticated scenarios
    unauth_results = test_unauthenticated_scenarios()
    
    # Test authenticated scenarios
    auth_results = test_authenticated_scenarios()
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 AUTHENTICATION SCENARIO TEST RESULTS")
    print("=" * 70)
    
    unauth_passed = sum(unauth_results)
    unauth_total = len(unauth_results)
    print(f"Unauthenticated Tests: {unauth_passed}/{unauth_total} passed")
    
    auth_passed = sum(auth_results)
    auth_total = len(auth_results)
    print(f"Authenticated Tests: {auth_passed}/{auth_total} passed")
    
    total_passed = unauth_passed + auth_passed
    total_tests = unauth_total + auth_total
    print(f"Overall: {total_passed}/{total_tests} tests passed")
    
    if total_passed == total_tests:
        print("🎉 ALL AUTHENTICATION SCENARIOS PASSED!")
        print("✅ Unauthenticated endpoints work correctly")
        print("✅ Protected endpoints require authentication")
        print("✅ Authenticated endpoints work with valid tokens")
    else:
        print(f"⚠️  {total_tests - total_passed} test(s) failed")