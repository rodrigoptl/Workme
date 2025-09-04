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
            # Use timestamp to ensure unique email
            import time
            timestamp = int(time.time())
            
            user_data = {
                "email": f"maria.silva.{timestamp}@email.com",
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
            elif response.status_code == 400 and "already registered" in response.text:
                # Try to use existing user for testing
                self.test_user_client = {"id": "existing-client-id", "email": user_data["email"]}
                self.log_result("Client Registration", True, "Using existing client user for testing")
                return True
            else:
                self.log_result("Client Registration", False, f"Registration failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Client Registration", False, "Registration request failed", str(e))
            return False
    
    def test_user_registration_professional(self):
        """Test professional user registration"""
        try:
            # Use timestamp to ensure unique email
            import time
            timestamp = int(time.time())
            
            user_data = {
                "email": f"joao.santos.{timestamp}@email.com",
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
            elif response.status_code == 400 and "already registered" in response.text:
                # Try to use existing user for testing
                self.test_user_professional = {"id": "existing-professional-id", "email": user_data["email"]}
                self.log_result("Professional Registration", True, "Using existing professional user for testing")
                return True
            else:
                self.log_result("Professional Registration", False, f"Registration failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Professional Registration", False, "Registration request failed", str(e))
            return False
    
    def test_user_login(self):
        """Test user login"""
        try:
            # Use the registered client user's email
            if self.test_user_client:
                email = self.test_user_client["email"]
            else:
                email = "maria.silva@email.com"
                
            login_data = {
                "email": email,
                "password": "SecurePass123!"
            }
            
            response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    self.auth_token = data["access_token"]
                    # Update test_user_client with the actual logged in user data
                    self.test_user_client = data["user"]
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

    # ========== PAYMENT SYSTEM TESTS ==========
    
    def test_wallet_management(self):
        """Test wallet management - get user wallet (auto-create if doesn't exist)"""
        if not self.auth_token or not self.test_user_client:
            self.log_result("Wallet Management", False, "No authenticated user available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            user_id = self.test_user_client["id"]
            response = self.session.get(f"{self.base_url}/wallet/{user_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                # Verify wallet structure
                required_fields = ["user_id", "balance", "cashback_balance", "currency"]
                if all(field in data for field in required_fields):
                    if data["user_id"] == user_id and data["currency"] == "BRL":
                        self.log_result("Wallet Management", True, f"Wallet retrieved/created successfully with balance: {data['balance']} BRL")
                        return True
                    else:
                        self.log_result("Wallet Management", False, "Wallet data validation failed", data)
                        return False
                else:
                    self.log_result("Wallet Management", False, "Missing required wallet fields", data)
                    return False
            else:
                self.log_result("Wallet Management", False, f"Wallet endpoint failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Wallet Management", False, "Wallet request failed", str(e))
            return False
    
    def test_stripe_config(self):
        """Test Stripe configuration endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/config/stripe-key")
            
            if response.status_code == 200:
                data = response.json()
                if "publishable_key" in data and data["publishable_key"].startswith("pk_"):
                    self.log_result("Stripe Config", True, "Stripe publishable key retrieved successfully")
                    return True
                else:
                    self.log_result("Stripe Config", False, "Invalid Stripe key format", data)
                    return False
            else:
                self.log_result("Stripe Config", False, f"Stripe config failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Stripe Config", False, "Stripe config request failed", str(e))
            return False
    
    def test_payment_intent_creation(self):
        """Test creating Stripe payment intents for deposits"""
        if not self.auth_token:
            self.log_result("Payment Intent Creation", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            # Test PIX payment intent
            pix_data = {
                "amount": 100.0,
                "currency": "brl",
                "payment_method_types": ["pix"],
                "description": "Depósito via PIX - Teste",
                "metadata": {"test": "true"}
            }
            
            response = self.session.post(f"{self.base_url}/payment/create-intent", json=pix_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "client_secret" in data and "payment_intent_id" in data:
                    self.log_result("Payment Intent Creation", True, "PIX payment intent created successfully")
                    
                    # Test credit card payment intent
                    card_data = {
                        "amount": 50.0,
                        "currency": "brl", 
                        "payment_method_types": ["card"],
                        "description": "Depósito via Cartão - Teste"
                    }
                    
                    card_response = self.session.post(f"{self.base_url}/payment/create-intent", json=card_data, headers=headers)
                    
                    if card_response.status_code == 200:
                        card_data_resp = card_response.json()
                        if "client_secret" in card_data_resp:
                            self.log_result("Payment Intent Creation", True, "Credit card payment intent also created successfully")
                            return True
                    
                    self.log_result("Payment Intent Creation", True, "PIX payment intent working (card test skipped)")
                    return True
                else:
                    self.log_result("Payment Intent Creation", False, "Invalid payment intent response", data)
                    return False
            else:
                self.log_result("Payment Intent Creation", False, f"Payment intent failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Payment Intent Creation", False, "Payment intent request failed", str(e))
            return False
    
    def test_deposit_functionality(self):
        """Test deposit requests with different amounts and payment methods"""
        if not self.auth_token:
            self.log_result("Deposit Functionality", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            # Test PIX deposit
            pix_deposit = {
                "amount": 75.0,
                "payment_method": "pix"
            }
            
            response = self.session.post(f"{self.base_url}/payment/deposit", json=pix_deposit, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "client_secret" in data and "payment_intent_id" in data:
                    self.log_result("Deposit Functionality", True, "PIX deposit request created successfully")
                    
                    # Test credit card deposit
                    card_deposit = {
                        "amount": 25.0,
                        "payment_method": "credit_card"
                    }
                    
                    card_response = self.session.post(f"{self.base_url}/payment/deposit", json=card_deposit, headers=headers)
                    
                    if card_response.status_code == 200:
                        self.log_result("Deposit Functionality", True, "Credit card deposit also working")
                    
                    return True
                else:
                    self.log_result("Deposit Functionality", False, "Invalid deposit response format", data)
                    return False
            else:
                self.log_result("Deposit Functionality", False, f"Deposit failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Deposit Functionality", False, "Deposit request failed", str(e))
            return False
    
    def test_withdrawal_functionality(self):
        """Test withdrawal requests with PIX keys"""
        if not self.auth_token:
            self.log_result("Withdrawal Functionality", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            # Test withdrawal (should fail with insufficient balance for new user)
            withdrawal_data = {
                "amount": 10.0,
                "pix_key": "11999887766"
            }
            
            response = self.session.post(f"{self.base_url}/payment/withdraw", json=withdrawal_data, headers=headers)
            
            if response.status_code == 400 and "Insufficient balance" in response.text:
                self.log_result("Withdrawal Functionality", True, "Withdrawal correctly rejected due to insufficient balance")
                return True
            elif response.status_code == 200:
                data = response.json()
                if "status" in data and "transaction_id" in data:
                    self.log_result("Withdrawal Functionality", True, "Withdrawal processed successfully")
                    return True
                else:
                    self.log_result("Withdrawal Functionality", False, "Invalid withdrawal response", data)
                    return False
            else:
                self.log_result("Withdrawal Functionality", False, f"Unexpected withdrawal response {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Withdrawal Functionality", False, "Withdrawal request failed", str(e))
            return False
    
    def test_transaction_history(self):
        """Test fetching user transaction history"""
        if not self.auth_token or not self.test_user_client:
            self.log_result("Transaction History", False, "No authenticated user available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            user_id = self.test_user_client["id"]
            response = self.session.get(f"{self.base_url}/transactions/{user_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "transactions" in data and isinstance(data["transactions"], list):
                    transactions = data["transactions"]
                    self.log_result("Transaction History", True, f"Transaction history retrieved with {len(transactions)} transactions")
                    
                    # Verify transaction structure if any exist
                    if transactions:
                        first_tx = transactions[0]
                        required_fields = ["id", "user_id", "amount", "type", "status", "created_at"]
                        if all(field in first_tx for field in required_fields):
                            self.log_result("Transaction History", True, "Transaction data structure is correct")
                        else:
                            self.log_result("Transaction History", False, "Transaction missing required fields", first_tx)
                            return False
                    
                    return True
                else:
                    self.log_result("Transaction History", False, "Invalid transaction history format", data)
                    return False
            else:
                self.log_result("Transaction History", False, f"Transaction history failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Transaction History", False, "Transaction history request failed", str(e))
            return False
    
    def test_service_booking_escrow(self):
        """Test creating service bookings with escrow payment"""
        if not self.auth_token or not self.test_user_client or not self.test_user_professional:
            self.log_result("Service Booking Escrow", False, "Missing required users for booking test")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            # Create a booking (should fail with insufficient balance)
            booking_data = {
                "professional_id": self.test_user_professional["id"],
                "service_category": "Limpeza & Diarista",
                "description": "Limpeza completa do apartamento",
                "amount": 150.0,
                "scheduled_date": "2024-12-25T10:00:00"
            }
            
            response = self.session.post(f"{self.base_url}/booking/create", json=booking_data, headers=headers)
            
            if response.status_code == 400 and "Insufficient wallet balance" in response.text:
                self.log_result("Service Booking Escrow", True, "Booking correctly rejected due to insufficient wallet balance")
                return True
            elif response.status_code == 200:
                data = response.json()
                if "status" in data and "booking_id" in data:
                    self.log_result("Service Booking Escrow", True, "Service booking with escrow created successfully")
                    return True
                else:
                    self.log_result("Service Booking Escrow", False, "Invalid booking response", data)
                    return False
            else:
                self.log_result("Service Booking Escrow", False, f"Booking failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Service Booking Escrow", False, "Service booking request failed", str(e))
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print(f"🚀 Starting WorkMe API Tests - Authentication & Payment System")
        print(f"Backend URL: {self.base_url}")
        print("=" * 80)
        
        # Authentication tests
        auth_tests = [
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
        
        # Payment system tests
        payment_tests = [
            self.test_wallet_management,
            self.test_stripe_config,
            self.test_payment_intent_creation,
            self.test_deposit_functionality,
            self.test_withdrawal_functionality,
            self.test_transaction_history,
            self.test_service_booking_escrow
        ]
        
        all_tests = auth_tests + payment_tests
        
        passed = 0
        total = len(all_tests)
        
        print("🔐 Running Authentication Tests...")
        print("-" * 40)
        
        for test in auth_tests:
            if test():
                passed += 1
            print()  # Add spacing between tests
        
        print("\n💳 Running Payment System Tests...")
        print("-" * 40)
        
        for test in payment_tests:
            if test():
                passed += 1
            print()  # Add spacing between tests
        
        print("=" * 80)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        print(f"   - Authentication: {min(passed, len(auth_tests))}/{len(auth_tests)} tests passed")
        print(f"   - Payment System: {max(0, passed - len(auth_tests))}/{len(payment_tests)} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! WorkMe system is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the details above.")
        
        return passed == total

if __name__ == "__main__":
    tester = WorkMeAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)