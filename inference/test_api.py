"""
Test script for Heat Hazard Risk Prediction API
"""

import requests
import json
from datetime import datetime

# API base URL (change this for your deployment)
BASE_URL = "http://localhost:8000"

def test_health():
    """Test health check endpoint"""
    print("🔍 Testing health check...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_root():
    """Test root endpoint"""
    print("🔍 Testing root endpoint...")
    response = requests.get(f"{BASE_URL}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_model_info():
    """Test model info endpoint"""
    print("🔍 Testing model info...")
    response = requests.get(f"{BASE_URL}/model-info")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_prediction():
    """Test prediction endpoint"""
    print("🔍 Testing prediction...")
    
    # Sample prediction request
    payload = {
        "lat": 12.9716,
        "lon": 77.5946,
        "date": "2024-06-15",
        "hour": 14,
        "temp": 38.5,
        "tavg": 75.0,
        "tmin": 25.0,
        "prcp": 0.0
    }
    
    response = requests.post(f"{BASE_URL}/predict", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Request: {json.dumps(payload, indent=2)}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_multiple_predictions():
    """Test multiple prediction scenarios"""
    print("🔍 Testing multiple prediction scenarios...")
    
    scenarios = [
        {
            "name": "High Risk - Hot Summer Day",
            "payload": {
                "lat": 12.9716,
                "lon": 77.5946,
                "date": "2024-06-15",
                "hour": 14,
                "temp": 42.0,
                "tavg": 80.0,
                "tmin": 28.0,
                "prcp": 0.0
            }
        },
        {
            "name": "Low Risk - Cool Evening",
            "payload": {
                "lat": 12.9716,
                "lon": 77.5946,
                "date": "2024-01-15",
                "hour": 20,
                "temp": 22.0,
                "tavg": 60.0,
                "tmin": 15.0,
                "prcp": 5.0
            }
        },
        {
            "name": "Medium Risk - Peak Hours",
            "payload": {
                "lat": 12.9716,
                "lon": 77.5946,
                "date": "2024-05-20",
                "hour": 12,
                "temp": 35.0,
                "tavg": 70.0,
                "tmin": 22.0,
                "prcp": 0.0
            }
        }
    ]
    
    for scenario in scenarios:
        print(f"📊 {scenario['name']}")
        response = requests.post(f"{BASE_URL}/predict", json=scenario['payload'])
        if response.status_code == 200:
            result = response.json()
            print(f"  Risk Score: {result['risk_score']:.3f}")
            print(f"  Risk Level: {result['risk_level']}")
        else:
            print(f"  Error: {response.status_code} - {response.text}")
        print()

if __name__ == "__main__":
    print("🚀 Testing Heat Hazard Risk Prediction API")
    print("=" * 50)
    
    try:
        test_health()
        test_root()
        test_model_info()
        test_prediction()
        test_multiple_predictions()
        
        print("✅ All tests completed!")
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to API. Make sure the server is running on localhost:8000")
    except Exception as e:
        print(f"❌ Test failed: {e}") 