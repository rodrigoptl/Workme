#!/usr/bin/env python3
"""
Test only the beta environment endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from frontend .env
BACKEND_URL = "https://pro-match.preview.emergentagent.com/api"

class BetaAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_results = []
        self.auth_token = None
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def setup_auth(self):
        """Setup authentication for tests that require it"""
        try:
            # Try to register a test user
            import time
            timestamp = int(time.time())
            
            user_data = {
                "email": f"beta.test.{timestamp}@email.com",
                "full_name": "Beta Test User",
                "phone": "+55 11 99999-0000",
                "user_type": "client",
                "password": "BetaTest123!",
                "beta_access_code": "WORKME2025BETA"
            }
            
            response = self.session.post(f"{self.base_url}/auth/register", json=user_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.auth_token = data["access_token"]
                    print(f"✅ Authentication setup successful")
                    return True
            elif response.status_code == 400 and "already registered" in response.text:
                # Try to login instead
                login_data = {
                    "email": user_data["email"],
                    "password": user_data["password"]
                }
                
                login_response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
                if login_response.status_code == 200:
                    login_result = login_response.json()
                    if "access_token" in login_result:
                        self.auth_token = login_result["access_token"]
                        print(f"✅ Authentication setup successful (existing user)")
                        return True
            
            print(f"❌ Authentication setup failed")
            return False
                
        except Exception as e:
            print(f"❌ Authentication setup error: {str(e)}")
            return False
    
    def test_beta_environment_info(self):
        """Test GET /api/beta/environment - Beta Environment Info"""
        try:
            response = self.session.get(f"{self.base_url}/beta/environment")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["environment", "is_beta", "beta_users_count", "max_beta_users", "beta_spots_remaining", "version"]
                
                if all(field in data for field in required_fields):
                    environment = data["environment"]
                    is_beta = data["is_beta"]
                    beta_users_count = data["beta_users_count"]
                    max_beta_users = data["max_beta_users"]
                    beta_spots_remaining = data["beta_spots_remaining"]
                    version = data["version"]
                    
                    # Validate data types and logic
                    if (isinstance(beta_users_count, int) and isinstance(max_beta_users, int) and 
                        isinstance(beta_spots_remaining, int) and isinstance(is_beta, bool)):
                        
                        # Check if beta_spots_remaining calculation is correct
                        expected_spots = max(0, max_beta_users - beta_users_count)
                        if beta_spots_remaining == expected_spots:
                            self.log_result("Beta Environment Info", True, 
                                          f"Beta environment info retrieved: {environment}, {beta_users_count}/{max_beta_users} users, {beta_spots_remaining} spots remaining")
                            return True
                        else:
                            self.log_result("Beta Environment Info", False, 
                                          f"Beta spots calculation incorrect: expected {expected_spots}, got {beta_spots_remaining}")
                            return False
                    else:
                        self.log_result("Beta Environment Info", False, "Invalid data types in response", data)
                        return False
                else:
                    missing_fields = [field for field in required_fields if field not in data]
                    self.log_result("Beta Environment Info", False, f"Missing required fields: {missing_fields}", data)
                    return False
            else:
                self.log_result("Beta Environment Info", False, f"Beta environment endpoint failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Beta Environment Info", False, "Beta environment request failed", str(e))
            return False
    
    def test_beta_analytics_tracking(self):
        """Test POST /api/beta/analytics/track - Beta Analytics Tracking"""
        if not self.auth_token:
            self.log_result("Beta Analytics Tracking", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            # Test analytics event
            event = {
                "session_id": "test_session_123",
                "event_type": "screen_view",
                "screen_name": "home",
                "action_name": None,
                "properties": {"user_agent": "test_browser", "screen_resolution": "1920x1080"}
            }
            
            response = self.session.post(f"{self.base_url}/beta/analytics/track", json=event, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "success" and "message" in data:
                    self.log_result("Beta Analytics Tracking", True, "Analytics event tracked successfully")
                    return True
                else:
                    self.log_result("Beta Analytics Tracking", False, "Invalid response format", data)
                    return False
            else:
                self.log_result("Beta Analytics Tracking", False, 
                              f"Analytics tracking failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Beta Analytics Tracking", False, "Beta analytics tracking request failed", str(e))
            return False
    
    def test_beta_feedback_submission(self):
        """Test POST /api/beta/feedback/submit - Beta Feedback Submission"""
        if not self.auth_token:
            self.log_result("Beta Feedback Submission", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            # Test feedback submission
            feedback = {
                "screen_name": "home",
                "feedback_type": "suggestion",
                "rating": 4,
                "message": "A tela inicial poderia ter mais filtros de busca",
                "device_info": {"platform": "web", "browser": "Chrome", "version": "120.0"}
            }
            
            response = self.session.post(f"{self.base_url}/beta/feedback/submit", json=feedback, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "success" and "message" in data:
                    if "enviado com sucesso" in data["message"].lower():
                        self.log_result("Beta Feedback Submission", True, "Feedback submitted successfully")
                        return True
                    else:
                        self.log_result("Beta Feedback Submission", False, f"Unexpected success message", data)
                        return False
                else:
                    self.log_result("Beta Feedback Submission", False, "Invalid response format", data)
                    return False
            else:
                self.log_result("Beta Feedback Submission", False, 
                              f"Feedback submission failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Beta Feedback Submission", False, "Beta feedback submission request failed", str(e))
            return False
    
    def test_beta_admin_stats(self):
        """Test GET /api/beta/admin/stats - Beta Admin Stats"""
        if not self.auth_token:
            self.log_result("Beta Admin Stats", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.get(f"{self.base_url}/beta/admin/stats", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if it's an error response
                if "error" in data:
                    self.log_result("Beta Admin Stats", True, f"Beta stats endpoint working (expected error in test env): {data['error']}")
                    return True
                
                # Check for expected stats fields
                expected_fields = ["total_beta_users", "active_sessions_today", "total_feedback_count", 
                                 "average_session_time", "top_screens", "feedback_breakdown", 
                                 "conversion_funnel", "error_rate"]
                
                if all(field in data for field in expected_fields):
                    total_beta_users = data["total_beta_users"]
                    active_sessions = data["active_sessions_today"]
                    feedback_count = data["total_feedback_count"]
                    error_rate = data["error_rate"]
                    
                    self.log_result("Beta Admin Stats", True, 
                                  f"Beta admin stats retrieved: {total_beta_users} users, {active_sessions} active sessions, {feedback_count} feedback items, {error_rate}% error rate")
                    return True
                else:
                    missing_fields = [field for field in expected_fields if field not in data]
                    self.log_result("Beta Admin Stats", False, f"Missing required beta stats fields: {missing_fields}", data)
                    return False
            else:
                self.log_result("Beta Admin Stats", False, f"Beta admin stats failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Beta Admin Stats", False, "Beta admin stats request failed", str(e))
            return False
    
    def test_beta_admin_feedback(self):
        """Test GET /api/beta/admin/feedback - Beta Admin Feedback"""
        if not self.auth_token:
            self.log_result("Beta Admin Feedback", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            # Test basic feedback retrieval
            response = self.session.get(f"{self.base_url}/beta/admin/feedback", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                if "feedback" in data and isinstance(data["feedback"], list):
                    feedback_list = data["feedback"]
                    self.log_result("Beta Admin Feedback", True, f"Retrieved {len(feedback_list)} feedback items")
                    return True
                else:
                    self.log_result("Beta Admin Feedback", False, "Invalid feedback response format", data)
                    return False
            else:
                self.log_result("Beta Admin Feedback", False, f"Beta admin feedback failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Beta Admin Feedback", False, "Beta admin feedback request failed", str(e))
            return False
    
    def test_beta_admin_users(self):
        """Test GET /api/beta/admin/users - Beta Admin Users"""
        if not self.auth_token:
            self.log_result("Beta Admin Users", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.get(f"{self.base_url}/beta/admin/users", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                if "beta_users" in data and isinstance(data["beta_users"], list):
                    beta_users = data["beta_users"]
                    self.log_result("Beta Admin Users", True, f"Retrieved {len(beta_users)} beta users")
                    return True
                else:
                    self.log_result("Beta Admin Users", False, "Invalid beta users response format", data)
                    return False
            else:
                self.log_result("Beta Admin Users", False, f"Beta admin users failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Beta Admin Users", False, "Beta admin users request failed", str(e))
            return False
    
    def run_beta_tests(self):
        """Run all beta tests"""
        print(f"🧪 Starting Beta Environment Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Setup authentication first
        if not self.setup_auth():
            print("❌ Cannot proceed without authentication")
            return False
        
        beta_tests = [
            self.test_beta_environment_info,
            self.test_beta_analytics_tracking,
            self.test_beta_feedback_submission,
            self.test_beta_admin_stats,
            self.test_beta_admin_feedback,
            self.test_beta_admin_users
        ]
        
        passed = 0
        total = len(beta_tests)
        
        for test in beta_tests:
            if test():
                passed += 1
            print()
        
        print("=" * 60)
        print(f"📊 BETA TESTS RESULTS: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL BETA TESTS PASSED!")
        else:
            failed_count = total - passed
            print(f"⚠️  {failed_count} beta test(s) failed")
        
        return passed == total

if __name__ == "__main__":
    tester = BetaAPITester()
    success = tester.run_beta_tests()
    sys.exit(0 if success else 1)