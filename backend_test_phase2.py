#!/usr/bin/env python3
"""
DERMATICS Backend API Test Suite - Phase 2
Tests Auth, Admin CRUD, Analytics, and Public Content endpoints
"""

import os
import requests
import json
import sys
import random
import string

BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:3000/api")

# Admin credentials
ADMIN_EMAIL = "admin@dermatics.com"
ADMIN_PASSWORD = "admin123"

# Session to persist cookies
session = requests.Session()

# Store created resource IDs for cleanup/testing
created_product_id = None
created_team_id = None
created_faq_id = None
new_user_email = None

def print_test_header(test_name):
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print(f"{'='*80}")

def print_success(message):
    print(f"✅ PASS: {message}")

def print_failure(message):
    print(f"❌ FAIL: {message}")

def generate_random_email():
    """Generate a random email for testing"""
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"newuser_{random_str}@test.com"

def check_no_leaks(data, context=""):
    """Check for _id or passwordHash leaks in response"""
    if isinstance(data, dict):
        if '_id' in data:
            print_failure(f"{context} MongoDB _id leaked into response!")
            return False
        if 'passwordHash' in data:
            print_failure(f"{context} passwordHash leaked into response!")
            return False
        for value in data.values():
            if not check_no_leaks(value, context):
                return False
    elif isinstance(data, list):
        for item in data:
            if not check_no_leaks(item, context):
                return False
    return True

# ============================================================================
# AUTH TESTS
# ============================================================================

def test_auth_register_valid():
    """Test POST /api/auth/register with valid data"""
    print_test_header("AUTH: POST /api/auth/register (valid)")
    
    global new_user_email
    new_user_email = generate_random_email()
    
    try:
        payload = {
            "name": "Rajesh Kumar",
            "email": new_user_email,
            "password": "pass123"
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = session.post(f"{BASE_URL}/auth/register", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check user object
        if 'user' not in data:
            print_failure("Missing 'user' field in response")
            return False
        
        user = data['user']
        
        # Check role is 'user'
        if user.get('role') != 'user':
            print_failure(f"Expected role='user', got '{user.get('role')}'")
            return False
        
        print_success("User created with role='user'")
        
        # Check email matches
        if user.get('email') != new_user_email:
            print_failure(f"Email mismatch: expected '{new_user_email}', got '{user.get('email')}'")
            return False
        
        print_success(f"Email matches: {new_user_email}")
        
        # Check cookie was set
        if 'access_token' not in session.cookies:
            print_failure("access_token cookie not set")
            return False
        
        print_success("access_token cookie set")
        
        # Check no leaks
        if not check_no_leaks(data, "Register"):
            return False
        
        print_success("No _id or passwordHash leaks")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_auth_register_duplicate():
    """Test POST /api/auth/register with duplicate email"""
    print_test_header("AUTH: POST /api/auth/register (duplicate email)")
    
    try:
        payload = {
            "name": "Duplicate User",
            "email": new_user_email,  # Use the same email from previous test
            "password": "pass123"
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = session.post(f"{BASE_URL}/auth/register", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 409:
            print_failure(f"Expected status 409 (Conflict), got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_success("Correctly returned 409 status code for duplicate email")
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if 'error' not in data:
            print_failure("Missing 'error' field in response")
            return False
        
        print_success(f"Response contains error message: {data['error']}")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_auth_register_missing_fields():
    """Test POST /api/auth/register with missing fields"""
    print_test_header("AUTH: POST /api/auth/register (missing fields)")
    
    try:
        payload = {
            "email": "incomplete@test.com"
            # Missing name and password
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = session.post(f"{BASE_URL}/auth/register", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 400:
            print_failure(f"Expected status 400, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_success("Correctly returned 400 status code for missing fields")
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if 'error' not in data:
            print_failure("Missing 'error' field in response")
            return False
        
        print_success(f"Response contains error message: {data['error']}")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_auth_login_admin():
    """Test POST /api/auth/login with admin credentials"""
    print_test_header("AUTH: POST /api/auth/login (admin)")
    
    try:
        # Clear cookies first
        session.cookies.clear()
        
        payload = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = session.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check user object
        if 'user' not in data:
            print_failure("Missing 'user' field in response")
            return False
        
        user = data['user']
        
        # Check role is 'admin'
        if user.get('role') != 'admin':
            print_failure(f"Expected role='admin', got '{user.get('role')}'")
            return False
        
        print_success("Admin user logged in with role='admin'")
        
        # Check cookie was set
        if 'access_token' not in session.cookies:
            print_failure("access_token cookie not set")
            return False
        
        print_success("access_token cookie set")
        
        # Check no leaks
        if not check_no_leaks(data, "Login"):
            return False
        
        print_success("No _id or passwordHash leaks")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_auth_login_wrong_password():
    """Test POST /api/auth/login with wrong password"""
    print_test_header("AUTH: POST /api/auth/login (wrong password)")
    
    try:
        payload = {
            "email": ADMIN_EMAIL,
            "password": "wrongpassword123"
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = session.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 401:
            print_failure(f"Expected status 401 (Unauthorized), got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_success("Correctly returned 401 status code for wrong password")
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if 'error' not in data:
            print_failure("Missing 'error' field in response")
            return False
        
        print_success(f"Response contains error message: {data['error']}")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_auth_me_with_cookie():
    """Test GET /api/auth/me with admin cookie"""
    print_test_header("AUTH: GET /api/auth/me (with admin cookie)")
    
    try:
        # Should have admin cookie from previous login test
        response = session.get(f"{BASE_URL}/auth/me", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check user object
        if 'user' not in data:
            print_failure("Missing 'user' field in response")
            return False
        
        user = data['user']
        
        if user is None:
            print_failure("Expected user object, got null")
            return False
        
        # Check role is 'admin'
        if user.get('role') != 'admin':
            print_failure(f"Expected role='admin', got '{user.get('role')}'")
            return False
        
        print_success("Returned admin user object")
        
        # Check no leaks
        if not check_no_leaks(data, "Auth Me"):
            return False
        
        print_success("No _id or passwordHash leaks")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_auth_me_without_cookie():
    """Test GET /api/auth/me without cookie"""
    print_test_header("AUTH: GET /api/auth/me (without cookie)")
    
    try:
        # Create a new session without cookies
        no_auth_session = requests.Session()
        
        response = no_auth_session.get(f"{BASE_URL}/auth/me", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check user is null
        if 'user' not in data:
            print_failure("Missing 'user' field in response")
            return False
        
        if data['user'] is not None:
            print_failure(f"Expected user=null, got {data['user']}")
            return False
        
        print_success("Correctly returned {user: null} without cookie")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_auth_logout():
    """Test POST /api/auth/logout"""
    print_test_header("AUTH: POST /api/auth/logout")
    
    try:
        response = session.post(f"{BASE_URL}/auth/logout", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if not data.get('success'):
            print_failure("Expected success=true in response")
            return False
        
        print_success("Logout successful")
        
        # Note: Cookie clearing is handled by the server setting maxAge=0
        # The session may still have the cookie, but it should be expired
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

# ============================================================================
# ADMIN GUARD TESTS
# ============================================================================

def test_admin_guard_without_cookie():
    """Test that /api/admin/* returns 401 without admin cookie"""
    print_test_header("ADMIN GUARD: Test 401 without admin cookie")
    
    try:
        # Create a new session without cookies
        no_auth_session = requests.Session()
        
        # Test a few admin endpoints
        endpoints = [
            "/admin/products",
            "/admin/users",
            "/admin/consultations",
            "/admin/analytics/overview"
        ]
        
        all_passed = True
        
        for endpoint in endpoints:
            response = no_auth_session.get(f"{BASE_URL}{endpoint}", timeout=10)
            print(f"GET {endpoint}: Status {response.status_code}")
            
            if response.status_code != 401:
                print_failure(f"Expected 401 for {endpoint}, got {response.status_code}")
                all_passed = False
            else:
                print_success(f"{endpoint} correctly returned 401")
        
        return all_passed
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_admin_login_for_tests():
    """Login as admin for subsequent tests"""
    print_test_header("ADMIN: Login for subsequent tests")
    
    try:
        # Clear cookies and login again
        session.cookies.clear()
        
        payload = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        response = session.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Admin login failed: {response.status_code}")
            return False
        
        print_success("Admin logged in successfully")
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_admin_products_create():
    """Test POST /api/admin/products (create)"""
    print_test_header("ADMIN: POST /api/admin/products (create)")
    
    global created_product_id
    
    try:
        payload = {
            "tier": "premium",
            "tag": "Test Tag",
            "name": "Test Product",
            "description": "This is a test product description",
            "price": 99,
            "imageUrl": "http://example.com/test.jpg"
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = session.post(f"{BASE_URL}/admin/products", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check id exists and is UUID
        if 'id' not in data:
            print_failure("Missing 'id' field in response")
            return False
        
        if '-' not in data['id']:
            print_failure(f"ID doesn't look like a UUID: {data['id']}")
            return False
        
        created_product_id = data['id']
        print_success(f"Product created with UUID id: {created_product_id}")
        
        # Check fields match
        if data.get('name') != payload['name']:
            print_failure(f"Name mismatch: expected '{payload['name']}', got '{data.get('name')}'")
            return False
        
        if data.get('price') != payload['price']:
            print_failure(f"Price mismatch: expected {payload['price']}, got {data.get('price')}")
            return False
        
        print_success("Product data matches payload")
        
        # Check no leaks
        if not check_no_leaks(data, "Product Create"):
            return False
        
        print_success("No _id leaks")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_admin_products_update():
    """Test PUT /api/admin/products/:id (update)"""
    print_test_header("ADMIN: PUT /api/admin/products/:id (update)")
    
    try:
        if not created_product_id:
            print_failure("No product ID available (create test may have failed)")
            return False
        
        payload = {
            "price": 120,
            "name": "Test Product Edited"
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        print(f"Product ID: {created_product_id}")
        
        response = session.put(f"{BASE_URL}/admin/products/{created_product_id}", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check updated fields
        if data.get('price') != 120:
            print_failure(f"Price not updated: expected 120, got {data.get('price')}")
            return False
        
        if data.get('name') != "Test Product Edited":
            print_failure(f"Name not updated: expected 'Test Product Edited', got '{data.get('name')}'")
            return False
        
        print_success("Product updated successfully (price=120, name='Test Product Edited')")
        
        # Check no leaks
        if not check_no_leaks(data, "Product Update"):
            return False
        
        print_success("No _id leaks")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_admin_products_delete():
    """Test DELETE /api/admin/products/:id"""
    print_test_header("ADMIN: DELETE /api/admin/products/:id")
    
    try:
        if not created_product_id:
            print_failure("No product ID available (create test may have failed)")
            return False
        
        print(f"Product ID: {created_product_id}")
        
        response = session.delete(f"{BASE_URL}/admin/products/{created_product_id}", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if not data.get('success'):
            print_failure("Expected success=true in response")
            return False
        
        print_success("Product deleted successfully")
        
        # Verify it's gone by checking GET /api/products
        verify_response = session.get(f"{BASE_URL}/products", timeout=10)
        products = verify_response.json()
        
        for product in products:
            if product.get('id') == created_product_id:
                print_failure(f"Product still exists after deletion!")
                return False
        
        print_success("Verified product is no longer in GET /api/products")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_admin_categories_update():
    """Test PUT /api/admin/categories/:id"""
    print_test_header("ADMIN: PUT /api/admin/categories/:id (update)")
    
    try:
        # First get categories to get an ID
        response = session.get(f"{BASE_URL}/categories", timeout=10)
        categories = response.json()
        
        if len(categories) < 1:
            print_failure("No categories available to test")
            return False
        
        category_id = categories[0]['id']
        print(f"Testing with category ID: {category_id}")
        
        payload = {
            "introTitle": "Edited Title"
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = session.put(f"{BASE_URL}/admin/categories/{category_id}", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check updated field
        if data.get('introTitle') != "Edited Title":
            print_failure(f"introTitle not updated: expected 'Edited Title', got '{data.get('introTitle')}'")
            return False
        
        print_success("Category updated successfully (introTitle='Edited Title')")
        
        # Check no leaks
        if not check_no_leaks(data, "Category Update"):
            return False
        
        print_success("No _id leaks")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_admin_content_update():
    """Test PUT /api/admin/content"""
    print_test_header("ADMIN: PUT /api/admin/content (update)")
    
    try:
        payload = {
            "footerText": "Edited footer text for testing"
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = session.put(f"{BASE_URL}/admin/content", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)[:500]}...")
        
        # Check updated field
        if data.get('footerText') != "Edited footer text for testing":
            print_failure(f"footerText not updated: expected 'Edited footer text for testing', got '{data.get('footerText')}'")
            return False
        
        print_success("Content updated successfully (footerText='Edited footer text for testing')")
        
        # Check no leaks
        if not check_no_leaks(data, "Content Update"):
            return False
        
        print_success("No _id leaks")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_admin_users_list():
    """Test GET /api/admin/users"""
    print_test_header("ADMIN: GET /api/admin/users (list)")
    
    try:
        response = session.get(f"{BASE_URL}/admin/users", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)[:800]}...")
        
        if not isinstance(data, list):
            print_failure(f"Expected list, got {type(data)}")
            return False
        
        print_success(f"Returned list with {len(data)} user(s)")
        
        # Check admin is in the list
        admin_found = False
        for user in data:
            if user.get('email') == ADMIN_EMAIL:
                admin_found = True
                if user.get('role') != 'admin':
                    print_failure(f"Admin user has wrong role: {user.get('role')}")
                    return False
                break
        
        if not admin_found:
            print_failure("Admin user not found in list")
            return False
        
        print_success("Admin user found in list with role='admin'")
        
        # Check no leaks
        if not check_no_leaks(data, "Users List"):
            return False
        
        print_success("No _id or passwordHash leaks")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_admin_users_toggle_active():
    """Test PUT /api/admin/users/:id (toggle active)"""
    print_test_header("ADMIN: PUT /api/admin/users/:id (toggle active)")
    
    try:
        # Get users list to find a non-admin user
        response = session.get(f"{BASE_URL}/admin/users", timeout=10)
        users = response.json()
        
        test_user = None
        for user in users:
            if user.get('role') == 'user':
                test_user = user
                break
        
        if not test_user:
            print_failure("No regular user found to test (only admin exists)")
            # This is not a critical failure, just skip
            print_success("Skipping test (no regular user available)")
            return True
        
        user_id = test_user['id']
        print(f"Testing with user ID: {user_id}")
        
        # Toggle to inactive
        payload = {"active": False}
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = session.put(f"{BASE_URL}/admin/users/{user_id}", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if data.get('active') != False:
            print_failure(f"active not updated to False: got {data.get('active')}")
            return False
        
        print_success("User deactivated (active=False)")
        
        # Toggle back to active
        payload = {"active": True}
        response = session.put(f"{BASE_URL}/admin/users/{user_id}", json=payload, timeout=10)
        data = response.json()
        
        if data.get('active') != True:
            print_failure(f"active not updated to True: got {data.get('active')}")
            return False
        
        print_success("User reactivated (active=True)")
        
        # Check no leaks
        if not check_no_leaks(data, "User Update"):
            return False
        
        print_success("No _id or passwordHash leaks")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_admin_consultations_list():
    """Test GET /api/admin/consultations"""
    print_test_header("ADMIN: GET /api/admin/consultations (list)")
    
    try:
        response = session.get(f"{BASE_URL}/admin/consultations", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)[:800]}...")
        
        if not isinstance(data, list):
            print_failure(f"Expected list, got {type(data)}")
            return False
        
        print_success(f"Returned list with {len(data)} consultation(s)")
        
        # Check no leaks
        if not check_no_leaks(data, "Consultations List"):
            return False
        
        print_success("No _id leaks")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_admin_team_create():
    """Test POST /api/admin/team (create)"""
    print_test_header("ADMIN: POST /api/admin/team (create)")
    
    global created_team_id
    
    try:
        payload = {
            "name": "Test Team Member",
            "role": "Test Role",
            "bio": "Test bio for team member",
            "order": 99,
            "imageUrl": "http://example.com/test-team.jpg"
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = session.post(f"{BASE_URL}/admin/team", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check id exists
        if 'id' not in data:
            print_failure("Missing 'id' field in response")
            return False
        
        created_team_id = data['id']
        print_success(f"Team member created with id: {created_team_id}")
        
        # Check fields match
        if data.get('name') != payload['name']:
            print_failure(f"Name mismatch")
            return False
        
        print_success("Team member data matches payload")
        
        # Check no leaks
        if not check_no_leaks(data, "Team Create"):
            return False
        
        print_success("No _id leaks")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_admin_team_update():
    """Test PUT /api/admin/team/:id (update)"""
    print_test_header("ADMIN: PUT /api/admin/team/:id (update)")
    
    try:
        if not created_team_id:
            print_failure("No team ID available (create test may have failed)")
            return False
        
        payload = {
            "role": "Updated Test Role"
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        print(f"Team ID: {created_team_id}")
        
        response = session.put(f"{BASE_URL}/admin/team/{created_team_id}", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check updated field
        if data.get('role') != "Updated Test Role":
            print_failure(f"Role not updated")
            return False
        
        print_success("Team member updated successfully")
        
        # Check no leaks
        if not check_no_leaks(data, "Team Update"):
            return False
        
        print_success("No _id leaks")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_admin_team_delete():
    """Test DELETE /api/admin/team/:id"""
    print_test_header("ADMIN: DELETE /api/admin/team/:id")
    
    try:
        if not created_team_id:
            print_failure("No team ID available (create test may have failed)")
            return False
        
        print(f"Team ID: {created_team_id}")
        
        response = session.delete(f"{BASE_URL}/admin/team/{created_team_id}", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if not data.get('success'):
            print_failure("Expected success=true in response")
            return False
        
        print_success("Team member deleted successfully")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_admin_faqs_create():
    """Test POST /api/admin/faqs (create)"""
    print_test_header("ADMIN: POST /api/admin/faqs (create)")
    
    global created_faq_id
    
    try:
        payload = {
            "question": "Test Question?",
            "answer": "Test Answer",
            "order": 99
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = session.post(f"{BASE_URL}/admin/faqs", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check id exists
        if 'id' not in data:
            print_failure("Missing 'id' field in response")
            return False
        
        created_faq_id = data['id']
        print_success(f"FAQ created with id: {created_faq_id}")
        
        # Check fields match
        if data.get('question') != payload['question']:
            print_failure(f"Question mismatch")
            return False
        
        print_success("FAQ data matches payload")
        
        # Check no leaks
        if not check_no_leaks(data, "FAQ Create"):
            return False
        
        print_success("No _id leaks")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_admin_faqs_update():
    """Test PUT /api/admin/faqs/:id (update)"""
    print_test_header("ADMIN: PUT /api/admin/faqs/:id (update)")
    
    try:
        if not created_faq_id:
            print_failure("No FAQ ID available (create test may have failed)")
            return False
        
        payload = {
            "answer": "Updated Test Answer"
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        print(f"FAQ ID: {created_faq_id}")
        
        response = session.put(f"{BASE_URL}/admin/faqs/{created_faq_id}", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check updated field
        if data.get('answer') != "Updated Test Answer":
            print_failure(f"Answer not updated")
            return False
        
        print_success("FAQ updated successfully")
        
        # Check no leaks
        if not check_no_leaks(data, "FAQ Update"):
            return False
        
        print_success("No _id leaks")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_admin_faqs_delete():
    """Test DELETE /api/admin/faqs/:id"""
    print_test_header("ADMIN: DELETE /api/admin/faqs/:id")
    
    try:
        if not created_faq_id:
            print_failure("No FAQ ID available (create test may have failed)")
            return False
        
        print(f"FAQ ID: {created_faq_id}")
        
        response = session.delete(f"{BASE_URL}/admin/faqs/{created_faq_id}", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if not data.get('success'):
            print_failure("Expected success=true in response")
            return False
        
        print_success("FAQ deleted successfully")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

# ============================================================================
# ANALYTICS TESTS
# ============================================================================

def test_analytics_event_post():
    """Test POST /api/analytics/event (public, no auth)"""
    print_test_header("ANALYTICS: POST /api/analytics/event (public)")
    
    try:
        # Create a new session without auth
        no_auth_session = requests.Session()
        
        # Test multiple event types
        events = [
            {
                "event_type": "page_view",
                "session_id": "sess-test-1",
                "metadata": {}
            },
            {
                "event_type": "tab_switch",
                "session_id": "sess-test-1",
                "metadata": {"tier": "ultra"}
            },
            {
                "event_type": "product_view",
                "session_id": "sess-test-1",
                "metadata": {"name": "Velvet Barrier Cream"}
            },
            {
                "event_type": "inquiry",
                "session_id": "sess-test-1",
                "metadata": {"name": "Telomere Matrix Serum", "tier": "ultra"}
            }
        ]
        
        all_passed = True
        
        for event in events:
            print(f"\nPosting event: {event['event_type']}")
            print(f"Payload: {json.dumps(event, indent=2)}")
            
            response = no_auth_session.post(f"{BASE_URL}/analytics/event", json=event, timeout=10)
            print(f"Status Code: {response.status_code}")
            
            if response.status_code != 200:
                print_failure(f"Expected status 200, got {response.status_code}")
                print(f"Response: {response.text}")
                all_passed = False
                continue
            
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if not data.get('success'):
                print_failure("Expected success=true in response")
                all_passed = False
                continue
            
            print_success(f"Event '{event['event_type']}' posted successfully")
        
        return all_passed
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_analytics_overview_admin():
    """Test GET /api/admin/analytics/overview (admin only)"""
    print_test_header("ANALYTICS: GET /api/admin/analytics/overview (admin)")
    
    try:
        # Should have admin cookie from previous tests
        response = session.get(f"{BASE_URL}/admin/analytics/overview", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)[:1000]}...")
        
        # Check required keys
        required_keys = ['stats', 'visitorsSeries', 'topProducts', 'tierInterest', 'funnel']
        for key in required_keys:
            if key not in data:
                print_failure(f"Missing required key: {key}")
                return False
        
        print_success("All required keys present: stats, visitorsSeries, topProducts, tierInterest, funnel")
        
        # Check stats object
        stats = data['stats']
        stats_keys = ['visitorsToday', 'visitorsWeek', 'visitorsMonth', 'totalUsers', 'inquiries']
        for key in stats_keys:
            if key not in stats:
                print_failure(f"Missing stats key: {key}")
                return False
        
        print_success(f"Stats object complete: {json.dumps(stats, indent=2)}")
        
        # Check visitorsSeries is array of length 7
        if not isinstance(data['visitorsSeries'], list):
            print_failure(f"visitorsSeries is not a list")
            return False
        
        if len(data['visitorsSeries']) != 7:
            print_failure(f"visitorsSeries length is {len(data['visitorsSeries'])}, expected 7")
            return False
        
        print_success(f"visitorsSeries is array of length 7")
        
        # Check topProducts is array
        if not isinstance(data['topProducts'], list):
            print_failure(f"topProducts is not a list")
            return False
        
        print_success(f"topProducts is array with {len(data['topProducts'])} items")
        
        # Check tierInterest is array
        if not isinstance(data['tierInterest'], list):
            print_failure(f"tierInterest is not a list")
            return False
        
        print_success(f"tierInterest is array with {len(data['tierInterest'])} items")
        
        # Check funnel object
        funnel = data['funnel']
        funnel_keys = ['visits', 'productViews', 'inquiries']
        for key in funnel_keys:
            if key not in funnel:
                print_failure(f"Missing funnel key: {key}")
                return False
        
        print_success(f"Funnel object complete: {json.dumps(funnel, indent=2)}")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_analytics_overview_without_auth():
    """Test GET /api/admin/analytics/overview without auth (should be 401)"""
    print_test_header("ANALYTICS: GET /api/admin/analytics/overview (no auth)")
    
    try:
        # Create a new session without auth
        no_auth_session = requests.Session()
        
        response = no_auth_session.get(f"{BASE_URL}/admin/analytics/overview", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 401:
            print_failure(f"Expected status 401, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_success("Correctly returned 401 without admin cookie")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

# ============================================================================
# PUBLIC CONTENT TESTS
# ============================================================================

def test_public_categories():
    """Test GET /api/categories (public)"""
    print_test_header("PUBLIC: GET /api/categories")
    
    try:
        # Use session without auth
        no_auth_session = requests.Session()
        
        response = no_auth_session.get(f"{BASE_URL}/categories", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check count is 3
        if len(data) != 3:
            print_failure(f"Expected 3 categories, got {len(data)}")
            return False
        
        print_success("Returned 3 categories")
        
        # Check required fields
        required_fields = ['id', 'key', 'order', 'label', 'introTitle', 'introText']
        for category in data:
            for field in required_fields:
                if field not in category:
                    print_failure(f"Category missing required field: {field}")
                    return False
        
        print_success("All categories have required fields (id, key, order, label, introTitle, introText)")
        
        # Check no leaks
        if not check_no_leaks(data, "Categories"):
            return False
        
        print_success("No _id leaks")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_public_content():
    """Test GET /api/content (public)"""
    print_test_header("PUBLIC: GET /api/content")
    
    try:
        # Use session without auth
        no_auth_session = requests.Session()
        
        response = no_auth_session.get(f"{BASE_URL}/content", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)[:800]}...")
        
        # Check required fields
        required_fields = ['key', 'heroTitle', 'flagshipTitle', 'process', 'feedbackText', 'phone']
        for field in required_fields:
            if field not in data:
                print_failure(f"Content missing required field: {field}")
                return False
        
        print_success("Content has required fields (key, heroTitle, flagshipTitle, process, feedbackText, phone)")
        
        # Check process is array
        if not isinstance(data['process'], list):
            print_failure(f"process is not a list")
            return False
        
        print_success(f"process is array with {len(data['process'])} items")
        
        # Check no leaks
        if not check_no_leaks(data, "Content"):
            return False
        
        print_success("No _id leaks")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

def main():
    """Run all Phase 2 tests"""
    print("\n" + "="*80)
    print("DERMATICS BACKEND API TEST SUITE - PHASE 2")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Credentials: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
    print("="*80)
    
    tests = [
        # AUTH TESTS
        ("AUTH: Register (valid)", test_auth_register_valid),
        ("AUTH: Register (duplicate)", test_auth_register_duplicate),
        ("AUTH: Register (missing fields)", test_auth_register_missing_fields),
        ("AUTH: Login (admin)", test_auth_login_admin),
        ("AUTH: Login (wrong password)", test_auth_login_wrong_password),
        ("AUTH: GET /me (with cookie)", test_auth_me_with_cookie),
        ("AUTH: GET /me (without cookie)", test_auth_me_without_cookie),
        ("AUTH: Logout", test_auth_logout),
        
        # ADMIN GUARD TESTS
        ("ADMIN: Guard (401 without cookie)", test_admin_guard_without_cookie),
        ("ADMIN: Login for tests", test_admin_login_for_tests),
        
        # ADMIN CRUD TESTS
        ("ADMIN: Products CREATE", test_admin_products_create),
        ("ADMIN: Products UPDATE", test_admin_products_update),
        ("ADMIN: Products DELETE", test_admin_products_delete),
        ("ADMIN: Categories UPDATE", test_admin_categories_update),
        ("ADMIN: Content UPDATE", test_admin_content_update),
        ("ADMIN: Users LIST", test_admin_users_list),
        ("ADMIN: Users TOGGLE ACTIVE", test_admin_users_toggle_active),
        ("ADMIN: Consultations LIST", test_admin_consultations_list),
        ("ADMIN: Team CREATE", test_admin_team_create),
        ("ADMIN: Team UPDATE", test_admin_team_update),
        ("ADMIN: Team DELETE", test_admin_team_delete),
        ("ADMIN: FAQs CREATE", test_admin_faqs_create),
        ("ADMIN: FAQs UPDATE", test_admin_faqs_update),
        ("ADMIN: FAQs DELETE", test_admin_faqs_delete),
        
        # ANALYTICS TESTS
        ("ANALYTICS: Event POST (public)", test_analytics_event_post),
        ("ANALYTICS: Overview (admin)", test_analytics_overview_admin),
        ("ANALYTICS: Overview (no auth)", test_analytics_overview_without_auth),
        
        # PUBLIC CONTENT TESTS
        ("PUBLIC: Categories", test_public_categories),
        ("PUBLIC: Content", test_public_content),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print_failure(f"Test crashed: {str(e)}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY - PHASE 2")
    print("="*80)
    
    # Group by category
    categories = {
        "AUTH": [],
        "ADMIN": [],
        "ANALYTICS": [],
        "PUBLIC": []
    }
    
    for test_name, result in results:
        for category in categories.keys():
            if test_name.startswith(category):
                categories[category].append((test_name, result))
                break
    
    total_passed = 0
    total_tests = 0
    
    for category, tests in categories.items():
        if tests:
            print(f"\n{category}:")
            passed = sum(1 for _, result in tests if result)
            total = len(tests)
            total_passed += passed
            total_tests += total
            
            for test_name, result in tests:
                status = "✅ PASS" if result else "❌ FAIL"
                print(f"  {status}: {test_name}")
            
            print(f"  {category} Summary: {passed}/{total} passed")
    
    print("\n" + "="*80)
    print(f"TOTAL: {total_passed}/{total_tests} tests passed")
    print("="*80)
    
    if total_passed == total_tests:
        print("\n🎉 ALL PHASE 2 TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total_tests - total_passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
