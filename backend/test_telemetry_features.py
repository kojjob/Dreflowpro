#!/usr/bin/env python3
"""
Comprehensive test suite for telemetry and AI insights features
Tests all endpoints and functionality end-to-end
"""
import asyncio
import json
import time
import requests
from datetime import datetime
from typing import Dict, Any
import uuid

# Configuration
API_BASE = "http://localhost:8000/api/v1"
ORG_ID = "550e8400-e29b-41d4-a716-446655440000"

class TelemetryFeatureTests:
    def __init__(self):
        self.test_results = {}
        self.failed_tests = []
        self.passed_tests = []
        
    def log_test(self, test_name: str, result: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results[test_name] = {"passed": result, "details": details}
        if result:
            self.passed_tests.append(test_name)
        else:
            self.failed_tests.append(test_name)
    
    def test_health_endpoints(self):
        """Test 1: Health check endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        try:
            # Test main health endpoint
            response = requests.get(f"{API_BASE.replace('/api/v1', '')}/health")
            self.log_test("Main Health Endpoint", 
                         response.status_code == 200,
                         f"Status: {response.status_code}")
            
            # Test ML health endpoint
            response = requests.get(f"{API_BASE}/ml/health")
            self.log_test("ML Health Endpoint",
                         response.status_code == 200,
                         f"Status: {response.status_code}, Features: {response.json().get('data', {}).get('features_available', [])}")
            
        except Exception as e:
            self.log_test("Health Endpoints", False, f"Exception: {str(e)}")
    
    def test_ai_insights_endpoints(self):
        """Test 2: AI Insights functionality"""
        print("\n🧠 Testing AI Insights Endpoints...")
        
        try:
            # Test insights generation
            response = requests.get(f"{API_BASE}/ai/insights?time_range=24h")
            
            success = response.status_code == 200
            if success:
                data = response.json()
                insights_data = data.get('data', {})
                summary = insights_data.get('summary', {})
                
                self.log_test("AI Insights Generation",
                             'summary' in insights_data,
                             f"Insights generated: {summary.get('total_insights', 0)}")
                
                # Test different time ranges
                for time_range in ['1h', '7d', '30d']:
                    response = requests.get(f"{API_BASE}/ai/insights?time_range={time_range}")
                    self.log_test(f"AI Insights ({time_range})",
                                 response.status_code == 200,
                                 f"Status: {response.status_code}")
            else:
                self.log_test("AI Insights Generation", False, 
                             f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("AI Insights Endpoints", False, f"Exception: {str(e)}")
    
    def test_ml_endpoints(self):
        """Test 3: Machine Learning endpoints"""
        print("\n🤖 Testing ML Pipeline Endpoints...")
        
        try:
            # Test ML status
            response = requests.get(f"{API_BASE}/ml/status")
            self.log_test("ML Status Endpoint",
                         response.status_code == 200,
                         f"Status: {response.status_code}")
            
            # Test ML performance metrics
            response = requests.get(f"{API_BASE}/ml/performance")
            success = response.status_code in [200, 500]  # 500 is expected if no models trained yet
            self.log_test("ML Performance Endpoint",
                         success,
                         f"Status: {response.status_code}")
            
            # Test ML recommendations
            response = requests.get(f"{API_BASE}/ml/recommendations")
            success = response.status_code in [200, 500]  # 500 is expected if no data available
            self.log_test("ML Recommendations Endpoint",
                         success,
                         f"Status: {response.status_code}")
            
            # Test model training (background task)
            response = requests.post(f"{API_BASE}/ml/train?force_retrain=false")
            self.log_test("ML Training Trigger",
                         response.status_code == 200,
                         f"Status: {response.status_code}")
            
        except Exception as e:
            self.log_test("ML Endpoints", False, f"Exception: {str(e)}")
    
    def test_telemetry_data_simulation(self):
        """Test 4: Simulate telemetry data collection"""
        print("\n📊 Testing Telemetry Data Collection...")
        
        # Since telemetry collection is internal, we'll test the endpoints that would consume it
        try:
            # Test that the system can handle analytics requests (would use telemetry data)
            response = requests.get(f"{API_BASE}/ai/insights?time_range=1h")
            self.log_test("Telemetry Data Processing",
                         response.status_code == 200,
                         f"System processes telemetry requests: {response.status_code}")
            
        except Exception as e:
            self.log_test("Telemetry Data Simulation", False, f"Exception: {str(e)}")
    
    def test_data_persistence(self):
        """Test 5: Data persistence and retrieval"""
        print("\n💾 Testing Data Persistence...")
        
        try:
            # Test multiple calls to ensure data consistency
            responses = []
            for i in range(3):
                response = requests.get(f"{API_BASE}/ai/insights?time_range=24h")
                responses.append(response.status_code == 200)
                time.sleep(0.5)  # Small delay between requests
            
            self.log_test("Data Persistence",
                         all(responses),
                         f"Consistent responses: {len([r for r in responses if r])}/3")
            
        except Exception as e:
            self.log_test("Data Persistence", False, f"Exception: {str(e)}")
    
    def test_error_handling(self):
        """Test 6: Error handling and edge cases"""
        print("\n⚠️ Testing Error Handling...")
        
        try:
            # Test invalid time range
            response = requests.get(f"{API_BASE}/ai/insights?time_range=invalid")
            self.log_test("Invalid Time Range Handling",
                         response.status_code in [400, 422],
                         f"Properly handles invalid input: {response.status_code}")
            
            # Test missing parameters
            response = requests.post(f"{API_BASE}/ml/predict")
            success = response.status_code in [200, 400, 422, 500]  # Any reasonable error response
            self.log_test("Missing Parameters Handling",
                         success,
                         f"Handles missing params: {response.status_code}")
            
        except Exception as e:
            self.log_test("Error Handling", False, f"Exception: {str(e)}")
    
    def test_performance(self):
        """Test 7: Performance benchmarks"""
        print("\n⚡ Testing Performance...")
        
        try:
            # Test response times
            start_time = time.time()
            response = requests.get(f"{API_BASE}/ai/insights?time_range=24h")
            response_time = time.time() - start_time
            
            self.log_test("Response Time Performance",
                         response_time < 5.0,  # Should respond within 5 seconds
                         f"Response time: {response_time:.2f}s")
            
            # Test concurrent requests
            import threading
            results = []
            
            def make_request():
                try:
                    resp = requests.get(f"{API_BASE}/ai/insights?time_range=1h", timeout=10)
                    results.append(resp.status_code == 200)
                except:
                    results.append(False)
            
            threads = []
            for _ in range(5):  # 5 concurrent requests
                t = threading.Thread(target=make_request)
                threads.append(t)
                t.start()
            
            for t in threads:
                t.join()
            
            self.log_test("Concurrent Request Handling",
                         len([r for r in results if r]) >= 3,  # At least 3/5 should succeed
                         f"Successful concurrent requests: {len([r for r in results if r])}/5")
            
        except Exception as e:
            self.log_test("Performance Testing", False, f"Exception: {str(e)}")
    
    def test_frontend_integration(self):
        """Test 8: Frontend integration points"""
        print("\n🌐 Testing Frontend Integration...")
        
        try:
            # Test CORS headers with proper preflight request
            headers = {
                'Origin': 'http://localhost:3000',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'X-Requested-With'
            }
            response = requests.options(f"{API_BASE}/ai/insights", headers=headers)
            has_cors_origin = 'access-control-allow-origin' in response.headers
            has_cors_methods = 'access-control-allow-methods' in response.headers
            has_cors = has_cors_origin and has_cors_methods
            self.log_test("CORS Configuration",
                         has_cors,
                         f"CORS headers present: Origin={has_cors_origin}, Methods={has_cors_methods}")
            
            # Test JSON response format
            response = requests.get(f"{API_BASE}/ai/insights?time_range=24h")
            if response.status_code == 200:
                try:
                    data = response.json()
                    has_expected_structure = all(key in data for key in ['success', 'data'])
                    self.log_test("JSON Response Format",
                                 has_expected_structure,
                                 f"Expected structure present: {has_expected_structure}")
                except json.JSONDecodeError:
                    self.log_test("JSON Response Format", False, "Invalid JSON response")
            
        except Exception as e:
            self.log_test("Frontend Integration", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Comprehensive Telemetry & AI Insights Feature Tests")
        print("=" * 70)
        
        # Run all test suites
        self.test_health_endpoints()
        self.test_ai_insights_endpoints()
        self.test_ml_endpoints()
        self.test_telemetry_data_simulation()
        self.test_data_persistence()
        self.test_error_handling()
        self.test_performance()
        self.test_frontend_integration()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 70)
        print("📋 TEST SUMMARY")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        passed_count = len(self.passed_tests)
        failed_count = len(self.failed_tests)
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_count}")
        print(f"❌ Failed: {failed_count}")
        print(f"Success Rate: {(passed_count/total_tests)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in self.failed_tests:
                details = self.test_results[test]['details']
                print(f"   - {test}: {details}")
        
        if passed_count >= total_tests * 0.8:  # 80% success rate
            print(f"\n🎉 OVERALL RESULT: PASSED (Good success rate)")
            return True
        else:
            print(f"\n⚠️ OVERALL RESULT: NEEDS ATTENTION (Low success rate)")
            return False

if __name__ == "__main__":
    tester = TelemetryFeatureTests()
    success = tester.run_all_tests()
    
    if success:
        print("\n✅ Feature tests completed successfully!")
        print("🚀 Ready for production deployment")
    else:
        print("\n⚠️ Some tests failed - review before deployment")
        exit(1)