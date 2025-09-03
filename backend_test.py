#!/usr/bin/env python3
"""
Backend API Testing for WorkMe Authentication System
Tests all authentication endpoints and core functionality
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from frontend .env
BACKEND_URL = "https://service-finder-97.preview.emergentagent.com/api"

class WorkMeAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_results = []
        self.auth_token = None
        self.test_user_client = None
        self.test_user_professional = None
        
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
    
    def test_health_check(self):
        """Test basic API health check"""
        try:
            # Test root API endpoint
            response = self.session.get(f"{self.base_url}/")
            
            if response.status_code == 404:
                # Try without trailing slash
                response = self.session.get(f"{self.base_url}")
                
            if response.status_code == 404:
                # Check if there's a health endpoint
                response = self.session.get(f"{self.base_url}/health")
                
            if response.status_code in [200, 404]:
                # 404 is acceptable if no root endpoint exists, but server is responding
                self.log_result("Health Check", True, "Backend server is responding")
                return True
            else:
                self.log_result("Health Check", False, f"Unexpected status code: {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result("Health Check", False, "Backend server not accessible", str(e))
            return False
    
    def test_user_registration_client(self):
        """Test client user registration"""
        try:
            user_data = {
                "email": "maria.silva@email.com",
                "full_name": "Maria Silva",
                "phone": "+55 11 99999-1234",
                "user_type": "client",
                "password": "SecurePass123!"
            }
            
            response = self.session.post(f"{self.base_url}/auth/register", json=user_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    self.test_user_client = data["user"]
                    self.log_result("Client Registration", True, "Client user registered successfully")
                    return True
                else:
                    self.log_result("Client Registration", False, "Invalid response format", data)
                    return False
            else:
                self.log_result("Client Registration", False, f"Registration failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Client Registration", False, "Registration request failed", str(e))
            return False
    
    def test_user_registration_professional(self):
        """Test professional user registration"""
        try:
            user_data = {
                "email": "joao.santos@email.com",
                "full_name": "João Santos",
                "phone": "+55 11 88888-5678",
                "user_type": "professional",
                "password": "SecurePass456!"
            }
            
            response = self.session.post(f"{self.base_url}/auth/register", json=user_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    self.test_user_professional = data["user"]
                    self.log_result("Professional Registration", True, "Professional user registered successfully")
                    return True
                else:
                    self.log_result("Professional Registration", False, "Invalid response format", data)
                    return False
            else:
                self.log_result("Professional Registration", False, f"Registration failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Professional Registration", False, "Registration request failed", str(e))
            return False
    
    def test_user_login(self):
        """Test user login"""
        try:
            login_data = {
                "email": "maria.silva@email.com",
                "password": "SecurePass123!"
            }
            
            response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    self.auth_token = data["access_token"]
                    self.log_result("User Login", True, "User login successful")
                    return True
                else:
                    self.log_result("User Login", False, "Invalid login response format", data)
                    return False
            else:
                self.log_result("User Login", False, f"Login failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("User Login", False, "Login request failed", str(e))
            return False
    
    def test_protected_route_valid_token(self):
        """Test protected route with valid token"""
        if not self.auth_token:
            self.log_result("Protected Route (Valid Token)", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.get(f"{self.base_url}/auth/me", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "email" in data and "full_name" in data:
                    self.log_result("Protected Route (Valid Token)", True, "Protected route accessible with valid token")
                    return True
                else:
                    self.log_result("Protected Route (Valid Token)", False, "Invalid user data format", data)
                    return False
            else:
                self.log_result("Protected Route (Valid Token)", False, f"Protected route failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Protected Route (Valid Token)", False, "Protected route request failed", str(e))
            return False
    
    def test_protected_route_invalid_token(self):
        """Test protected route with invalid token"""
        try:
            headers = {"Authorization": "Bearer invalid_token_12345"}
            response = self.session.get(f"{self.base_url}/auth/me", headers=headers)
            
            if response.status_code == 401:
                self.log_result("Protected Route (Invalid Token)", True, "Protected route correctly rejected invalid token")
                return True
            else:
                self.log_result("Protected Route (Invalid Token)", False, f"Expected 401, got {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Protected Route (Invalid Token)", False, "Protected route request failed", str(e))
            return False
    
    def test_categories_endpoint(self):
        """Test service categories endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/categories")
            
            if response.status_code == 200:
                data = response.json()
                if "categories" in data and isinstance(data["categories"], list):
                    categories = data["categories"]
                    expected_categories = ["Casa & Construção", "Limpeza & Diarista", "Beleza & Bem-estar"]
                    if any(cat in categories for cat in expected_categories):
                        self.log_result("Categories Endpoint", True, f"Categories endpoint working, found {len(categories)} categories")
                        return True
                    else:
                        self.log_result("Categories Endpoint", False, "Categories don't match expected format", categories)
                        return False
                else:
                    self.log_result("Categories Endpoint", False, "Invalid categories response format", data)
                    return False
            else:
                self.log_result("Categories Endpoint", False, f"Categories endpoint failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Categories Endpoint", False, "Categories request failed", str(e))
            return False
    
    def test_professional_profile(self):
        """Test professional profile endpoint"""
        if not self.test_user_professional:
            self.log_result("Professional Profile", False, "No professional user available for testing")
            return False
            
        try:
            user_id = self.test_user_professional["id"]
            response = self.session.get(f"{self.base_url}/profile/professional/{user_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "user_id" in data and data["user_id"] == user_id:
                    self.log_result("Professional Profile", True, "Professional profile endpoint working")
                    return True
                else:
                    self.log_result("Professional Profile", False, "Invalid profile data format", data)
                    return False
            else:
                self.log_result("Professional Profile", False, f"Profile endpoint failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Professional Profile", False, "Profile request failed", str(e))
            return False
    
    def test_client_profile(self):
        """Test client profile endpoint"""
        if not self.test_user_client:
            self.log_result("Client Profile", False, "No client user available for testing")
            return False
            
        try:
            user_id = self.test_user_client["id"]
            response = self.session.get(f"{self.base_url}/profile/client/{user_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "user_id" in data and data["user_id"] == user_id:
                    self.log_result("Client Profile", True, "Client profile endpoint working")
                    return True
                else:
                    self.log_result("Client Profile", False, "Invalid profile data format", data)
                    return False
            else:
                self.log_result("Client Profile", False, f"Profile endpoint failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Client Profile", False, "Profile request failed", str(e))
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print(f"🚀 Starting WorkMe API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        tests = [
            self.test_health_check,
            self.test_user_registration_client,
            self.test_user_registration_professional,
            self.test_user_login,
            self.test_protected_route_valid_token,
            self.test_protected_route_invalid_token,
            self.test_categories_endpoint,
            self.test_professional_profile,
            self.test_client_profile
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
            print()  # Add spacing between tests
        
        print("=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Authentication system is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the details above.")
        
        return passed == total

if __name__ == "__main__":
    tester = WorkMeAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)