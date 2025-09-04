#!/usr/bin/env python3
"""
Simple AI endpoint tests that don't require database
"""

import requests
import json

# Get backend URL from frontend .env
BACKEND_URL = "https://service-finder-97.preview.emergentagent.com/api"

def test_ai_search_suggestions():
    """Test AI search suggestions endpoint (no auth required)"""
    try:
        response = requests.get(f"{BACKEND_URL}/ai/search-suggestions")
        
        if response.status_code == 200:
            data = response.json()
            
            if "suggestions" in data and isinstance(data["suggestions"], list):
                suggestions = data["suggestions"]
                
                if len(suggestions) > 0:
                    print(f"✅ AI Search Suggestions: Retrieved {len(suggestions)} suggestions")
                    print(f"   Sample: {suggestions[0]}")
                    return True
                else:
                    print("❌ AI Search Suggestions: No suggestions returned")
                    return False
            else:
                print(f"❌ AI Search Suggestions: Invalid response format - {data}")
                return False
        else:
            print(f"❌ AI Search Suggestions: Failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ AI Search Suggestions: Request failed - {str(e)}")
        return False

def test_ai_match_without_auth():
    """Test AI match endpoint without auth (should return 401)"""
    try:
        matching_request = {
            "client_request": "Preciso de um eletricista para instalar chuveiro elétrico",
            "location": "São Paulo, SP"
        }
        
        response = requests.post(f"{BACKEND_URL}/ai/match-professionals", json=matching_request)
        
        if response.status_code == 401:
            print("✅ AI Match Professionals: Correctly requires authentication")
            return True
        else:
            print(f"❌ AI Match Professionals: Unexpected status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ AI Match Professionals: Request failed - {str(e)}")
        return False

def test_ai_smart_search_without_auth():
    """Test AI smart search endpoint without auth (should return 401)"""
    try:
        search_request = {
            "query": "Busco diarista para limpeza semanal da casa",
            "location": "São Paulo"
        }
        
        response = requests.post(f"{BACKEND_URL}/ai/smart-search", json=search_request)
        
        if response.status_code == 401:
            print("✅ AI Smart Search: Correctly requires authentication")
            return True
        else:
            print(f"❌ AI Smart Search: Unexpected status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ AI Smart Search: Request failed - {str(e)}")
        return False

def main():
    print("🤖 TESTING AI ENDPOINTS (Basic Tests)")
    print("=" * 50)
    
    tests = [
        test_ai_search_suggestions,
        test_ai_match_without_auth,
        test_ai_smart_search_without_auth
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"🎯 BASIC AI TESTS: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All basic AI tests passed!")
        print("✅ AI endpoints are accessible and properly secured")
    else:
        print(f"⚠️  {total - passed} test(s) failed")
    
    return passed == total

if __name__ == "__main__":
    main()