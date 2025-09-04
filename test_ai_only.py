#!/usr/bin/env python3
"""
Test only the AI Matching System endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from frontend .env
BACKEND_URL = "https://service-finder-97.preview.emergentagent.com/api"

class AITestRunner:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.auth_token = None
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def setup_auth(self):
        """Setup authentication for testing"""
        try:
            # Try to login with existing user
            login_data = {
                "email": "maria.silva@email.com",
                "password": "SecurePass123!"
            }
            
            response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data["access_token"]
                print("✅ Authentication setup successful")
                return True
            else:
                print("❌ Authentication setup failed")
                return False
                
        except Exception as e:
            print(f"❌ Authentication setup error: {str(e)}")
            return False
    
    def test_ai_match_professionals(self):
        """Test AI-powered professional matching endpoint"""
        if not self.auth_token:
            self.log_result("AI Match Professionals", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            # Test natural language matching request
            matching_request = {
                "client_request": "Preciso de um eletricista para instalar chuveiro elétrico",
                "location": "São Paulo, SP",
                "budget_range": "R$ 100-200",
                "urgency": "normal",
                "preferred_time": "manhã"
            }
            
            response = self.session.post(f"{self.base_url}/ai/match-professionals", 
                                       json=matching_request, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["matches", "search_interpretation", "suggestions"]
                
                if all(field in data for field in required_fields):
                    matches = data["matches"]
                    interpretation = data["search_interpretation"]
                    suggestions = data["suggestions"]
                    
                    self.log_result("AI Match Professionals", True, 
                                  f"AI matching returned {len(matches)} matches with interpretation")
                    print(f"   Interpretation: {interpretation[:100]}...")
                    print(f"   Suggestions: {len(suggestions)} provided")
                    return True
                else:
                    self.log_result("AI Match Professionals", False, "Missing required response fields", data)
                    return False
            else:
                self.log_result("AI Match Professionals", False, 
                              f"AI matching failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("AI Match Professionals", False, "AI matching request failed", str(e))
            return False
    
    def test_ai_smart_search(self):
        """Test AI smart search with enriched professional data"""
        if not self.auth_token:
            self.log_result("AI Smart Search", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            # Test smart search request
            search_request = {
                "query": "Busco diarista para limpeza semanal da casa",
                "location": "São Paulo",
                "limit": 5
            }
            
            response = self.session.post(f"{self.base_url}/ai/smart-search", 
                                       json=search_request, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["matches", "search_interpretation", "suggestions", "total_found"]
                
                if all(field in data for field in required_fields):
                    matches = data["matches"]
                    total_found = data["total_found"]
                    
                    self.log_result("AI Smart Search", True, 
                                  f"Smart search returned {len(matches)} enriched matches (total: {total_found})")
                    return True
                else:
                    self.log_result("AI Smart Search", False, "Missing required response fields", data)
                    return False
            else:
                self.log_result("AI Smart Search", False, 
                              f"Smart search failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("AI Smart Search", False, "Smart search request failed", str(e))
            return False
    
    def test_ai_search_suggestions(self):
        """Test AI search suggestions endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/ai/search-suggestions")
            
            if response.status_code == 200:
                data = response.json()
                
                if "suggestions" in data and isinstance(data["suggestions"], list):
                    suggestions = data["suggestions"]
                    
                    if len(suggestions) > 0:
                        self.log_result("AI Search Suggestions", True, 
                                      f"Retrieved {len(suggestions)} search suggestions")
                        print(f"   Sample suggestions: {suggestions[:3]}")
                        return True
                    else:
                        self.log_result("AI Search Suggestions", False, "No suggestions returned")
                        return False
                else:
                    self.log_result("AI Search Suggestions", False, "Invalid suggestions response format", data)
                    return False
            else:
                self.log_result("AI Search Suggestions", False, 
                              f"Search suggestions failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("AI Search Suggestions", False, "Search suggestions request failed", str(e))
            return False
    
    def run_ai_tests(self):
        """Run all AI tests"""
        print("🤖 TESTING AI MATCHING SYSTEM")
        print("=" * 50)
        
        if not self.setup_auth():
            print("❌ Cannot proceed without authentication")
            return False
        
        print("\n🔍 Testing AI Endpoints...")
        print("-" * 30)
        
        tests = [
            self.test_ai_search_suggestions,
            self.test_ai_match_professionals,
            self.test_ai_smart_search
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
            print()
        
        print("=" * 50)
        print(f"🎯 AI TESTS RESULTS: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All AI tests passed!")
        else:
            print(f"⚠️  {total - passed} AI test(s) failed")
        
        return passed == total

if __name__ == "__main__":
    tester = AITestRunner()
    success = tester.run_ai_tests()
    sys.exit(0 if success else 1)