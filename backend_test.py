#!/usr/bin/env python3
"""
DERMATICS Phase 3 Backend API Tests
Tests: Product Variants, Packages, Secure File Upload, Diagnostic Consultation
"""

import os
import requests
import json
import base64
import sys

BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:3000/api")

# Admin credentials
ADMIN_EMAIL = "admin@dermatics.com"
ADMIN_PASSWORD = "admin123"

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}

def log_test(name, passed, message=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if message:
        print(f"   {message}")
    
    test_results["tests"].append({
        "name": name,
        "passed": passed,
        "message": message
    })
    
    if passed:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1

def print_summary():
    """Print test summary"""
    total = test_results["passed"] + test_results["failed"]
    print("\n" + "="*80)
    print(f"TEST SUMMARY: {test_results['passed']}/{total} PASSED")
    print("="*80)
    
    if test_results["failed"] > 0:
        print("\nFailed Tests:")
        for test in test_results["tests"]:
            if not test["passed"]:
                print(f"  ❌ {test['name']}")
                if test["message"]:
                    print(f"     {test['message']}")

def get_admin_session():
    """Login as admin and return session with cookie"""
    session = requests.Session()
    
    try:
        response = session.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("user", {}).get("role") == "admin":
                print("✅ Admin login successful")
                return session
            else:
                print(f"❌ Admin login failed: user role is {data.get('user', {}).get('role')}")
                return None
        else:
            print(f"❌ Admin login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Admin login error: {str(e)}")
        return None

def test_product_variants():
    """Test Phase 3: Product Variants"""
    print("\n" + "="*80)
    print("TESTING: PRODUCT VARIANTS")
    print("="*80)
    
    # Test 1: GET /api/products?tier=premium - check for variants
    try:
        response = requests.get(f"{BASE_URL}/products?tier=premium", timeout=10)
        
        if response.status_code == 200:
            products = response.json()
            
            # Check if at least one product has variants
            has_variants = False
            variant_product = None
            
            for product in products:
                if "variants" in product and len(product["variants"]) > 0:
                    has_variants = True
                    variant_product = product
                    
                    # Verify variant structure
                    for variant in product["variants"]:
                        if "label" not in variant or "price" not in variant:
                            log_test("GET /api/products?tier=premium - variant structure", False, 
                                   f"Variant missing label or price: {variant}")
                            break
                        if not isinstance(variant["price"], (int, float)):
                            log_test("GET /api/products?tier=premium - variant price type", False,
                                   f"Variant price is not numeric: {variant['price']}")
                            break
                    break
            
            if has_variants:
                log_test("GET /api/products?tier=premium - has variants", True,
                       f"Found product '{variant_product['name']}' with {len(variant_product['variants'])} variants")
                
                # Check for specific demo products
                sunscreen = next((p for p in products if p["name"] == "Solar Veil Mineral Fluid"), None)
                if sunscreen and "variants" in sunscreen:
                    spf_variants = [v["label"] for v in sunscreen["variants"]]
                    log_test("Solar Veil Mineral Fluid - SPF variants", True,
                           f"SPF variants: {', '.join(spf_variants)}")
                
                velvet = next((p for p in products if p["name"] == "Velvet Barrier Cream"), None)
                if velvet and "variants" in velvet:
                    ml_variants = [v["label"] for v in velvet["variants"]]
                    log_test("Velvet Barrier Cream - ml variants", True,
                           f"ML variants: {', '.join(ml_variants)}")
            else:
                log_test("GET /api/products?tier=premium - has variants", False,
                       "No products with variants found")
        else:
            log_test("GET /api/products?tier=premium", False,
                   f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("GET /api/products?tier=premium", False, str(e))
    
    # Test 2: POST /api/admin/products with variants (without admin cookie - should fail)
    try:
        response = requests.post(
            f"{BASE_URL}/admin/products",
            json={
                "tier": "premium",
                "name": "Variant Test Product",
                "tag": "Test",
                "description": "Test description",
                "price": 100,
                "imageUrl": "http://example.com/test.jpg",
                "variants": [
                    {"label": "Small", "price": 100},
                    {"label": "Large", "price": 180}
                ]
            },
            timeout=10
        )
        
        if response.status_code == 401:
            log_test("POST /api/admin/products without admin cookie", True, "Correctly returned 401")
        else:
            log_test("POST /api/admin/products without admin cookie", False,
                   f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_test("POST /api/admin/products without admin cookie", False, str(e))
    
    # Test 3: POST /api/admin/products with variants (with admin cookie)
    admin_session = get_admin_session()
    if not admin_session:
        log_test("POST /api/admin/products with admin cookie", False, "Failed to get admin session")
        return
    
    created_product_id = None
    
    try:
        response = admin_session.post(
            f"{BASE_URL}/admin/products",
            json={
                "tier": "premium",
                "name": "Variant Test Product",
                "tag": "Test",
                "description": "Test description",
                "price": 100,
                "imageUrl": "http://example.com/test.jpg",
                "variants": [
                    {"label": "Small", "price": 100},
                    {"label": "Large", "price": 180}
                ]
            },
            timeout=10
        )
        
        if response.status_code == 200:
            product = response.json()
            
            # Check for _id leak
            if "_id" in product:
                log_test("POST /api/admin/products - no _id leak", False, "_id found in response")
            else:
                log_test("POST /api/admin/products - no _id leak", True)
            
            # Verify variants
            if "variants" in product and len(product["variants"]) == 2:
                variant_labels = [v["label"] for v in product["variants"]]
                variant_prices = [v["price"] for v in product["variants"]]
                
                if "Small" in variant_labels and "Large" in variant_labels:
                    if 100 in variant_prices and 180 in variant_prices:
                        log_test("POST /api/admin/products with variants", True,
                               f"Created product with 2 variants: {variant_labels}")
                        created_product_id = product.get("id")
                    else:
                        log_test("POST /api/admin/products with variants", False,
                               f"Variant prices incorrect: {variant_prices}")
                else:
                    log_test("POST /api/admin/products with variants", False,
                           f"Variant labels incorrect: {variant_labels}")
            else:
                log_test("POST /api/admin/products with variants", False,
                       f"Expected 2 variants, got {len(product.get('variants', []))}")
        else:
            log_test("POST /api/admin/products with variants", False,
                   f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("POST /api/admin/products with variants", False, str(e))
    
    # Test 4: PUT /api/admin/products/:id - update variants
    if created_product_id:
        try:
            response = admin_session.put(
                f"{BASE_URL}/admin/products/{created_product_id}",
                json={
                    "variants": [
                        {"label": "Only", "price": 150}
                    ]
                },
                timeout=10
            )
            
            if response.status_code == 200:
                product = response.json()
                
                if "variants" in product and len(product["variants"]) == 1:
                    if product["variants"][0]["label"] == "Only" and product["variants"][0]["price"] == 150:
                        log_test("PUT /api/admin/products/:id - update variants", True,
                               "Variants replaced with 1 item")
                    else:
                        log_test("PUT /api/admin/products/:id - update variants", False,
                               f"Variant data incorrect: {product['variants'][0]}")
                else:
                    log_test("PUT /api/admin/products/:id - update variants", False,
                           f"Expected 1 variant, got {len(product.get('variants', []))}")
            else:
                log_test("PUT /api/admin/products/:id - update variants", False,
                       f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("PUT /api/admin/products/:id - update variants", False, str(e))
        
        # Test 5: DELETE /api/admin/products/:id
        try:
            response = admin_session.delete(
                f"{BASE_URL}/admin/products/{created_product_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                log_test("DELETE /api/admin/products/:id", True, "Product deleted successfully")
            else:
                log_test("DELETE /api/admin/products/:id", False,
                       f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("DELETE /api/admin/products/:id", False, str(e))

def test_packages():
    """Test Phase 3: Packages"""
    print("\n" + "="*80)
    print("TESTING: PACKAGES")
    print("="*80)
    
    # Test 1: GET /api/packages (public)
    try:
        response = requests.get(f"{BASE_URL}/packages", timeout=10)
        
        if response.status_code == 200:
            packages = response.json()
            
            if len(packages) == 3:
                log_test("GET /api/packages - count", True, "Returns 3 packages")
                
                # Check structure
                required_fields = ["id", "order", "name", "price", "description", "recommended", "features"]
                all_valid = True
                
                for pkg in packages:
                    for field in required_fields:
                        if field not in pkg:
                            log_test("GET /api/packages - structure", False, f"Missing field: {field}")
                            all_valid = False
                            break
                    
                    # Check _id leak
                    if "_id" in pkg:
                        log_test("GET /api/packages - no _id leak", False, "_id found in response")
                        all_valid = False
                
                if all_valid:
                    log_test("GET /api/packages - structure", True, "All required fields present")
                    log_test("GET /api/packages - no _id leak", True)
                
                # Check sorting by order
                orders = [pkg["order"] for pkg in packages]
                if orders == sorted(orders):
                    log_test("GET /api/packages - sorted by order", True, f"Orders: {orders}")
                else:
                    log_test("GET /api/packages - sorted by order", False, f"Not sorted: {orders}")
                
                # Check for recommended package
                recommended = [pkg for pkg in packages if pkg.get("recommended")]
                if len(recommended) == 1:
                    log_test("GET /api/packages - one recommended", True,
                           f"'{recommended[0]['name']}' is recommended")
                else:
                    log_test("GET /api/packages - one recommended", False,
                           f"Found {len(recommended)} recommended packages")
            else:
                log_test("GET /api/packages - count", False, f"Expected 3, got {len(packages)}")
        else:
            log_test("GET /api/packages", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("GET /api/packages", False, str(e))
    
    # Test 2: POST /api/admin/packages without admin cookie
    try:
        response = requests.post(
            f"{BASE_URL}/admin/packages",
            json={
                "name": "Test Package",
                "price": 999,
                "description": "Test",
                "recommended": False,
                "features": ["A", "B"],
                "order": 9
            },
            timeout=10
        )
        
        if response.status_code == 401:
            log_test("POST /api/admin/packages without admin cookie", True, "Correctly returned 401")
        else:
            log_test("POST /api/admin/packages without admin cookie", False,
                   f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_test("POST /api/admin/packages without admin cookie", False, str(e))
    
    # Test 3: POST /api/admin/packages with admin cookie
    admin_session = get_admin_session()
    if not admin_session:
        log_test("POST /api/admin/packages with admin cookie", False, "Failed to get admin session")
        return
    
    created_package_id = None
    
    try:
        response = admin_session.post(
            f"{BASE_URL}/admin/packages",
            json={
                "name": "Pkg Test",
                "price": 999,
                "description": "d",
                "recommended": False,
                "features": ["A", "B"],
                "order": 9
            },
            timeout=10
        )
        
        if response.status_code == 200:
            package = response.json()
            
            # Check for _id leak
            if "_id" in package:
                log_test("POST /api/admin/packages - no _id leak", False, "_id found in response")
            else:
                log_test("POST /api/admin/packages - no _id leak", True)
            
            # Verify data
            if package.get("name") == "Pkg Test" and package.get("price") == 999:
                if isinstance(package.get("features"), list) and len(package["features"]) == 2:
                    log_test("POST /api/admin/packages", True, "Package created with correct data")
                    created_package_id = package.get("id")
                else:
                    log_test("POST /api/admin/packages", False, "Features array incorrect")
            else:
                log_test("POST /api/admin/packages", False, "Package data incorrect")
        else:
            log_test("POST /api/admin/packages", False,
                   f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("POST /api/admin/packages", False, str(e))
    
    # Test 4: PUT /api/admin/packages/:id
    if created_package_id:
        try:
            response = admin_session.put(
                f"{BASE_URL}/admin/packages/{created_package_id}",
                json={
                    "price": 1099,
                    "recommended": True
                },
                timeout=10
            )
            
            if response.status_code == 200:
                package = response.json()
                
                if package.get("price") == 1099 and package.get("recommended") == True:
                    log_test("PUT /api/admin/packages/:id", True, "Package updated successfully")
                else:
                    log_test("PUT /api/admin/packages/:id", False,
                           f"Update failed: price={package.get('price')}, recommended={package.get('recommended')}")
            else:
                log_test("PUT /api/admin/packages/:id", False,
                       f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("PUT /api/admin/packages/:id", False, str(e))
        
        # Test 5: DELETE /api/admin/packages/:id
        try:
            response = admin_session.delete(
                f"{BASE_URL}/admin/packages/{created_package_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                log_test("DELETE /api/admin/packages/:id", True, "Package deleted successfully")
            else:
                log_test("DELETE /api/admin/packages/:id", False,
                       f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("DELETE /api/admin/packages/:id", False, str(e))
    
    # Test 6: PUT /api/admin/packages/:id without admin cookie
    if created_package_id:
        try:
            response = requests.put(
                f"{BASE_URL}/admin/packages/{created_package_id}",
                json={"price": 2000},
                timeout=10
            )
            
            if response.status_code == 401:
                log_test("PUT /api/admin/packages/:id without admin cookie", True, "Correctly returned 401")
            else:
                log_test("PUT /api/admin/packages/:id without admin cookie", False,
                       f"Expected 401, got {response.status_code}")
        except Exception as e:
            log_test("PUT /api/admin/packages/:id without admin cookie", False, str(e))

def test_secure_file_upload():
    """Test Phase 3: Secure File Upload (chunked)"""
    print("\n" + "="*80)
    print("TESTING: SECURE FILE UPLOAD")
    print("="*80)
    
    # Test 1: POST /api/upload/chunk with valid data
    upload_id = "phase3test"
    test_data = "hello"
    test_data_base64 = base64.b64encode(test_data.encode()).decode()  # 'aGVsbG8='
    
    try:
        response = requests.post(
            f"{BASE_URL}/upload/chunk",
            json={
                "uploadId": upload_id,
                "index": 0,
                "total": 1,
                "data": test_data_base64
            },
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success") == True:
                log_test("POST /api/upload/chunk", True, "Chunk uploaded successfully")
            else:
                log_test("POST /api/upload/chunk", False, f"Response: {result}")
        else:
            log_test("POST /api/upload/chunk", False,
                   f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("POST /api/upload/chunk", False, str(e))
    
    # Test 2: POST /api/upload/complete
    file_id = None
    
    try:
        response = requests.post(
            f"{BASE_URL}/upload/complete",
            json={
                "uploadId": upload_id,
                "fileName": "r.pdf",
                "contentType": "application/pdf"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            
            if "fileId" in result and result.get("size") == 5:
                log_test("POST /api/upload/complete", True,
                       f"File completed: fileId={result['fileId']}, size=5")
                file_id = result["fileId"]
            else:
                log_test("POST /api/upload/complete", False,
                       f"Expected size=5, got {result.get('size')}")
        else:
            log_test("POST /api/upload/complete", False,
                   f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("POST /api/upload/complete", False, str(e))
    
    # Test 3: GET /api/admin/secure-file/:id without admin cookie
    if file_id:
        try:
            response = requests.get(
                f"{BASE_URL}/admin/secure-file/{file_id}",
                timeout=10
            )
            
            if response.status_code == 401:
                log_test("GET /api/admin/secure-file/:id without admin cookie", True,
                       "Correctly returned 401")
            else:
                log_test("GET /api/admin/secure-file/:id without admin cookie", False,
                       f"Expected 401, got {response.status_code}")
        except Exception as e:
            log_test("GET /api/admin/secure-file/:id without admin cookie", False, str(e))
        
        # Test 4: GET /api/admin/secure-file/:id with admin cookie
        admin_session = get_admin_session()
        if admin_session:
            try:
                response = admin_session.get(
                    f"{BASE_URL}/admin/secure-file/{file_id}",
                    timeout=10
                )
                
                if response.status_code == 200:
                    content_type = response.headers.get("Content-Type")
                    content = response.content.decode()
                    
                    if content_type == "application/pdf" and content == test_data:
                        log_test("GET /api/admin/secure-file/:id with admin cookie", True,
                               f"File streamed correctly: Content-Type={content_type}, body='{content}'")
                    else:
                        log_test("GET /api/admin/secure-file/:id with admin cookie", False,
                               f"Content-Type={content_type}, body='{content}' (expected 'hello')")
                else:
                    log_test("GET /api/admin/secure-file/:id with admin cookie", False,
                           f"Status {response.status_code}: {response.text}")
            except Exception as e:
                log_test("GET /api/admin/secure-file/:id with admin cookie", False, str(e))
    
    # Test 5: POST /api/upload/chunk with invalid uploadId
    try:
        response = requests.post(
            f"{BASE_URL}/upload/chunk",
            json={
                "uploadId": "../malicious",
                "index": 0,
                "total": 1,
                "data": test_data_base64
            },
            timeout=10
        )
        
        if response.status_code == 400:
            log_test("POST /api/upload/chunk with invalid uploadId", True,
                   "Correctly rejected '../' in uploadId")
        else:
            log_test("POST /api/upload/chunk with invalid uploadId", False,
                   f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_test("POST /api/upload/chunk with invalid uploadId", False, str(e))

def test_diagnostic_consultation():
    """Test Phase 3: Diagnostic Consultation"""
    print("\n" + "="*80)
    print("TESTING: DIAGNOSTIC CONSULTATION")
    print("="*80)
    
    # First, upload a test file to use as reportFileId
    upload_id = "diagtest"
    test_data_base64 = base64.b64encode(b"test report").decode()
    file_id = None
    
    try:
        # Upload chunk
        requests.post(
            f"{BASE_URL}/upload/chunk",
            json={"uploadId": upload_id, "index": 0, "total": 1, "data": test_data_base64},
            timeout=10
        )
        
        # Complete upload
        response = requests.post(
            f"{BASE_URL}/upload/complete",
            json={"uploadId": upload_id, "fileName": "report.pdf", "contentType": "application/pdf"},
            timeout=10
        )
        
        if response.status_code == 200:
            file_id = response.json().get("fileId")
    except:
        pass
    
    # Test 1: POST /api/diagnostic-consultation with valid data
    consultation_id = None
    
    try:
        response = requests.post(
            f"{BASE_URL}/diagnostic-consultation",
            json={
                "fullName": "Jane Doe",
                "phone": "+91 90000",
                "email": "j@d.com",
                "address": "A",
                "bloodGroup": "O+",
                "allergies": "none",
                "currentRoutine": "x",
                "reportFileIds": [file_id] if file_id else [],
                "facePhotoFileIds": [],
                "consent": True
            },
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Check that sensitive fields are NOT echoed
            sensitive_fields = ["fullName", "phone", "email", "address", "bloodGroup", "allergies", "currentRoutine"]
            has_sensitive = any(field in result for field in sensitive_fields)
            
            if has_sensitive:
                log_test("POST /api/diagnostic-consultation - no sensitive echo", False,
                       f"Sensitive fields found in response: {[f for f in sensitive_fields if f in result]}")
            else:
                log_test("POST /api/diagnostic-consultation - no sensitive echo", True,
                       "Response does not echo sensitive fields")
            
            if result.get("success") == True and "id" in result:
                log_test("POST /api/diagnostic-consultation", True,
                       f"Consultation created: id={result['id']}")
                consultation_id = result["id"]
            else:
                log_test("POST /api/diagnostic-consultation", False,
                       f"Expected {{success:true, id}}, got {result}")
        else:
            log_test("POST /api/diagnostic-consultation", False,
                   f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("POST /api/diagnostic-consultation", False, str(e))
    
    # Test 2: POST /api/diagnostic-consultation missing consent
    try:
        response = requests.post(
            f"{BASE_URL}/diagnostic-consultation",
            json={
                "fullName": "Test User",
                "phone": "+91 12345",
                "consent": False  # or absent
            },
            timeout=10
        )
        
        if response.status_code == 400:
            log_test("POST /api/diagnostic-consultation missing consent", True,
                   "Correctly returned 400")
        else:
            log_test("POST /api/diagnostic-consultation missing consent", False,
                   f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_test("POST /api/diagnostic-consultation missing consent", False, str(e))
    
    # Test 3: POST /api/diagnostic-consultation missing fullName
    try:
        response = requests.post(
            f"{BASE_URL}/diagnostic-consultation",
            json={
                "phone": "+91 12345",
                "consent": True
            },
            timeout=10
        )
        
        if response.status_code == 400:
            log_test("POST /api/diagnostic-consultation missing fullName", True,
                   "Correctly returned 400")
        else:
            log_test("POST /api/diagnostic-consultation missing fullName", False,
                   f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_test("POST /api/diagnostic-consultation missing fullName", False, str(e))
    
    # Test 4: POST /api/diagnostic-consultation missing phone
    try:
        response = requests.post(
            f"{BASE_URL}/diagnostic-consultation",
            json={
                "fullName": "Test User",
                "consent": True
            },
            timeout=10
        )
        
        if response.status_code == 400:
            log_test("POST /api/diagnostic-consultation missing phone", True,
                   "Correctly returned 400")
        else:
            log_test("POST /api/diagnostic-consultation missing phone", False,
                   f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_test("POST /api/diagnostic-consultation missing phone", False, str(e))
    
    # Test 5: GET /api/admin/diagnostic-consultations without admin cookie
    try:
        response = requests.get(
            f"{BASE_URL}/admin/diagnostic-consultations",
            timeout=10
        )
        
        if response.status_code == 401:
            log_test("GET /api/admin/diagnostic-consultations without admin cookie", True,
                   "Correctly returned 401")
        else:
            log_test("GET /api/admin/diagnostic-consultations without admin cookie", False,
                   f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_test("GET /api/admin/diagnostic-consultations without admin cookie", False, str(e))
    
    # Test 6: GET /api/admin/diagnostic-consultations with admin cookie
    admin_session = get_admin_session()
    if admin_session:
        try:
            response = admin_session.get(
                f"{BASE_URL}/admin/diagnostic-consultations",
                timeout=10
            )
            
            if response.status_code == 200:
                consultations = response.json()
                
                # Find Jane Doe
                jane = next((c for c in consultations if c.get("fullName") == "Jane Doe"), None)
                
                if jane:
                    # Check that all sensitive fields are present
                    required_fields = ["fullName", "phone", "email", "address", "bloodGroup", 
                                     "allergies", "currentRoutine", "reportFileIds"]
                    missing = [f for f in required_fields if f not in jane]
                    
                    if not missing:
                        log_test("GET /api/admin/diagnostic-consultations with admin cookie", True,
                               f"Found Jane Doe with all sensitive fields")
                        
                        # Check _id leak
                        if "_id" in jane:
                            log_test("GET /api/admin/diagnostic-consultations - no _id leak", False,
                                   "_id found in response")
                        else:
                            log_test("GET /api/admin/diagnostic-consultations - no _id leak", True)
                    else:
                        log_test("GET /api/admin/diagnostic-consultations with admin cookie", False,
                               f"Missing fields: {missing}")
                else:
                    log_test("GET /api/admin/diagnostic-consultations with admin cookie", False,
                           "Jane Doe not found in consultations")
            else:
                log_test("GET /api/admin/diagnostic-consultations with admin cookie", False,
                       f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test("GET /api/admin/diagnostic-consultations with admin cookie", False, str(e))
    
    # Test 7: PUT /api/admin/diagnostic-consultations/:id without admin cookie
    if consultation_id:
        try:
            response = requests.put(
                f"{BASE_URL}/admin/diagnostic-consultations/{consultation_id}",
                json={"status": "In Review"},
                timeout=10
            )
            
            if response.status_code == 401:
                log_test("PUT /api/admin/diagnostic-consultations/:id without admin cookie", True,
                       "Correctly returned 401")
            else:
                log_test("PUT /api/admin/diagnostic-consultations/:id without admin cookie", False,
                       f"Expected 401, got {response.status_code}")
        except Exception as e:
            log_test("PUT /api/admin/diagnostic-consultations/:id without admin cookie", False, str(e))
        
        # Test 8: PUT /api/admin/diagnostic-consultations/:id with admin cookie
        if admin_session:
            try:
                response = admin_session.put(
                    f"{BASE_URL}/admin/diagnostic-consultations/{consultation_id}",
                    json={"status": "In Review"},
                    timeout=10
                )
                
                if response.status_code == 200:
                    result = response.json()
                    
                    if result.get("status") == "In Review":
                        log_test("PUT /api/admin/diagnostic-consultations/:id with admin cookie", True,
                               "Status updated successfully")
                    else:
                        log_test("PUT /api/admin/diagnostic-consultations/:id with admin cookie", False,
                               f"Status not updated: {result.get('status')}")
                else:
                    log_test("PUT /api/admin/diagnostic-consultations/:id with admin cookie", False,
                           f"Status {response.status_code}: {response.text}")
            except Exception as e:
                log_test("PUT /api/admin/diagnostic-consultations/:id with admin cookie", False, str(e))

def main():
    """Run all Phase 3 tests"""
    print("\n" + "="*80)
    print("DERMATICS PHASE 3 BACKEND API TESTS")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin: {ADMIN_EMAIL}")
    
    # Run all test groups
    test_product_variants()
    test_packages()
    test_secure_file_upload()
    test_diagnostic_consultation()
    
    # Print summary
    print_summary()
    
    # Exit with appropriate code
    if test_results["failed"] > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
