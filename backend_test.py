#!/usr/bin/env python3
"""
DERMATICS Backend API Test Suite
Tests all API endpoints for the luxury skincare platform
"""

import requests
import json
import sys

# Base URL from environment
BASE_URL = "https://dermatics-luxury.preview.emergentagent.com/api"

def print_test_header(test_name):
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print(f"{'='*80}")

def print_success(message):
    print(f"✅ PASS: {message}")

def print_failure(message):
    print(f"❌ FAIL: {message}")

def test_get_all_products():
    """Test GET /api/products - should return 6 products"""
    print_test_header("GET /api/products (all products)")
    
    try:
        response = requests.get(f"{BASE_URL}/products", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)[:500]}...")
        
        # Check if it's a list
        if not isinstance(data, list):
            print_failure(f"Expected list, got {type(data)}")
            return False
        
        # Check count
        if len(data) != 6:
            print_failure(f"Expected 6 products, got {len(data)}")
            return False
        
        print_success(f"Returned {len(data)} products")
        
        # Check required fields
        required_fields = ['id', 'tier', 'tag', 'name', 'description', 'price', 'imageUrl']
        for product in data:
            for field in required_fields:
                if field not in product:
                    print_failure(f"Product missing required field: {field}")
                    return False
            
            # Check no MongoDB _id leak
            if '_id' in product:
                print_failure("MongoDB _id leaked into response!")
                return False
        
        print_success("All products have required fields (id, tier, tag, name, description, price, imageUrl)")
        print_success("No MongoDB _id found in response")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_get_products_by_tier_premium():
    """Test GET /api/products?tier=premium - should return 3 premium products"""
    print_test_header("GET /api/products?tier=premium")
    
    try:
        response = requests.get(f"{BASE_URL}/products?tier=premium", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)[:500]}...")
        
        # Check count
        if len(data) != 3:
            print_failure(f"Expected 3 premium products, got {len(data)}")
            return False
        
        print_success(f"Returned {len(data)} products")
        
        # Check all are premium tier
        for product in data:
            if product.get('tier') != 'premium':
                print_failure(f"Expected tier 'premium', got '{product.get('tier')}'")
                return False
            
            if '_id' in product:
                print_failure("MongoDB _id leaked into response!")
                return False
        
        print_success("All products have tier='premium'")
        print_success("No MongoDB _id found in response")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_get_products_by_tier_ultra():
    """Test GET /api/products?tier=ultra - should return 3 ultra products"""
    print_test_header("GET /api/products?tier=ultra")
    
    try:
        response = requests.get(f"{BASE_URL}/products?tier=ultra", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)[:500]}...")
        
        # Check count
        if len(data) != 3:
            print_failure(f"Expected 3 ultra products, got {len(data)}")
            return False
        
        print_success(f"Returned {len(data)} products")
        
        # Check all are ultra tier
        for product in data:
            if product.get('tier') != 'ultra':
                print_failure(f"Expected tier 'ultra', got '{product.get('tier')}'")
                return False
            
            if '_id' in product:
                print_failure("MongoDB _id leaked into response!")
                return False
        
        print_success("All products have tier='ultra'")
        print_success("No MongoDB _id found in response")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_get_products_by_tier_super():
    """Test GET /api/products?tier=super - should return 0 products (no super tier)"""
    print_test_header("GET /api/products?tier=super")
    
    try:
        response = requests.get(f"{BASE_URL}/products?tier=super", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check count is 0
        if len(data) != 0:
            print_failure(f"Expected 0 super products (tier doesn't exist), got {len(data)}")
            return False
        
        print_success("Returned 0 products as expected (super tier doesn't exist)")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_get_team():
    """Test GET /api/team - should return 4 team members sorted by order"""
    print_test_header("GET /api/team")
    
    try:
        response = requests.get(f"{BASE_URL}/team", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)[:500]}...")
        
        # Check count
        if len(data) != 4:
            print_failure(f"Expected 4 team members, got {len(data)}")
            return False
        
        print_success(f"Returned {len(data)} team members")
        
        # Check required fields
        required_fields = ['id', 'order', 'name', 'role', 'bio', 'imageUrl']
        for member in data:
            for field in required_fields:
                if field not in member:
                    print_failure(f"Team member missing required field: {field}")
                    return False
            
            if '_id' in member:
                print_failure("MongoDB _id leaked into response!")
                return False
        
        print_success("All team members have required fields (id, order, name, role, bio, imageUrl)")
        
        # Check sorting by order
        orders = [member['order'] for member in data]
        if orders != sorted(orders):
            print_failure(f"Team members not sorted by order. Got: {orders}")
            return False
        
        print_success(f"Team members correctly sorted by order: {orders}")
        print_success("No MongoDB _id found in response")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_get_faqs():
    """Test GET /api/faqs - should return 3 FAQs sorted by order with Hinglish answers"""
    print_test_header("GET /api/faqs")
    
    try:
        response = requests.get(f"{BASE_URL}/faqs", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)[:800]}...")
        
        # Check count
        if len(data) != 3:
            print_failure(f"Expected 3 FAQs, got {len(data)}")
            return False
        
        print_success(f"Returned {len(data)} FAQs")
        
        # Check required fields
        required_fields = ['id', 'order', 'question', 'answer']
        for faq in data:
            for field in required_fields:
                if field not in faq:
                    print_failure(f"FAQ missing required field: {field}")
                    return False
            
            if '_id' in faq:
                print_failure("MongoDB _id leaked into response!")
                return False
            
            # Check answer is non-empty string (Hinglish)
            if not isinstance(faq['answer'], str) or len(faq['answer']) == 0:
                print_failure(f"FAQ answer is not a non-empty string")
                return False
        
        print_success("All FAQs have required fields (id, order, question, answer)")
        print_success("All answers are non-empty strings (Hinglish content)")
        
        # Check sorting by order
        orders = [faq['order'] for faq in data]
        if orders != sorted(orders):
            print_failure(f"FAQs not sorted by order. Got: {orders}")
            return False
        
        print_success(f"FAQs correctly sorted by order: {orders}")
        print_success("No MongoDB _id found in response")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_post_consultation_valid():
    """Test POST /api/consultation with valid data - should return success with uuid"""
    print_test_header("POST /api/consultation (valid data)")
    
    try:
        payload = {
            "name": "Priya Sharma",
            "phone": "+91-9876543210",
            "email": "priya.sharma@example.com",
            "message": "I'm interested in a custom formulation for my combination skin with hyperpigmentation concerns.",
            "tier": "premium"
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(f"{BASE_URL}/consultation", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check success field
        if not data.get('success'):
            print_failure("Expected success=true in response")
            return False
        
        print_success("Response has success=true")
        
        # Check submission object
        if 'submission' not in data:
            print_failure("Missing 'submission' field in response")
            return False
        
        submission = data['submission']
        
        # Check for uuid id
        if 'id' not in submission:
            print_failure("Missing 'id' field in submission")
            return False
        
        # Check id is a valid uuid format (contains hyphens)
        if '-' not in submission['id']:
            print_failure(f"ID doesn't look like a UUID: {submission['id']}")
            return False
        
        print_success(f"Submission has valid UUID id: {submission['id']}")
        
        # Check no MongoDB _id leak
        if '_id' in submission:
            print_failure("MongoDB _id leaked into response!")
            return False
        
        print_success("No MongoDB _id found in response")
        
        # Check submitted data is present
        if submission.get('name') != payload['name']:
            print_failure(f"Name mismatch: expected '{payload['name']}', got '{submission.get('name')}'")
            return False
        
        if submission.get('phone') != payload['phone']:
            print_failure(f"Phone mismatch: expected '{payload['phone']}', got '{submission.get('phone')}'")
            return False
        
        print_success("Submission data matches payload")
        
        # Store the id for later verification
        global last_submission_id
        last_submission_id = submission['id']
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_post_consultation_missing_name():
    """Test POST /api/consultation missing name - should return 400 error"""
    print_test_header("POST /api/consultation (missing name)")
    
    try:
        payload = {
            "phone": "+91-9876543210",
            "email": "test@example.com",
            "message": "Test message",
            "tier": "premium"
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(f"{BASE_URL}/consultation", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 400:
            print_failure(f"Expected status 400, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_success("Correctly returned 400 status code")
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check for error field
        if 'error' not in data:
            print_failure("Missing 'error' field in response")
            return False
        
        print_success(f"Response contains error message: {data['error']}")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_post_consultation_missing_phone():
    """Test POST /api/consultation missing phone - should return 400 error"""
    print_test_header("POST /api/consultation (missing phone)")
    
    try:
        payload = {
            "name": "Test User",
            "email": "test@example.com",
            "message": "Test message",
            "tier": "premium"
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(f"{BASE_URL}/consultation", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 400:
            print_failure(f"Expected status 400, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_success("Correctly returned 400 status code")
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check for error field
        if 'error' not in data:
            print_failure("Missing 'error' field in response")
            return False
        
        print_success(f"Response contains error message: {data['error']}")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def test_get_consultations():
    """Test GET /api/consultation - should list stored submissions"""
    print_test_header("GET /api/consultation (list submissions)")
    
    try:
        response = requests.get(f"{BASE_URL}/consultation", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_failure(f"Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)[:800]}...")
        
        # Check if it's a list
        if not isinstance(data, list):
            print_failure(f"Expected list, got {type(data)}")
            return False
        
        print_success(f"Returned list with {len(data)} submission(s)")
        
        # Check if our submission is in the list
        if hasattr(test_get_consultations, '__globals__') and 'last_submission_id' in globals():
            found = False
            for submission in data:
                if submission.get('id') == last_submission_id:
                    found = True
                    print_success(f"Found our test submission with id: {last_submission_id}")
                    break
            
            if not found:
                print_failure(f"Could not find our test submission with id: {last_submission_id}")
                return False
        
        # Check no MongoDB _id leak
        for submission in data:
            if '_id' in submission:
                print_failure("MongoDB _id leaked into response!")
                return False
        
        print_success("No MongoDB _id found in any submission")
        
        return True
        
    except Exception as e:
        print_failure(f"Exception occurred: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("DERMATICS BACKEND API TEST SUITE")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print("="*80)
    
    tests = [
        ("GET /api/products (all)", test_get_all_products),
        ("GET /api/products?tier=premium", test_get_products_by_tier_premium),
        ("GET /api/products?tier=ultra", test_get_products_by_tier_ultra),
        ("GET /api/products?tier=super", test_get_products_by_tier_super),
        ("GET /api/team", test_get_team),
        ("GET /api/faqs", test_get_faqs),
        ("POST /api/consultation (valid)", test_post_consultation_valid),
        ("POST /api/consultation (missing name)", test_post_consultation_missing_name),
        ("POST /api/consultation (missing phone)", test_post_consultation_missing_phone),
        ("GET /api/consultation", test_get_consultations),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print_failure(f"Test crashed: {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print("="*80)
    print(f"TOTAL: {passed}/{total} tests passed")
    print("="*80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
