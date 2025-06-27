"""
Heat Hazard Risk Prediction API
FastAPI service for real-time heat hazard risk assessment
"""

import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Optional, Dict, Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI app
app = FastAPI(
    title="Heat Hazard Risk Prediction API",
    description="Real-time heat hazard risk assessment for Bangalore",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://heat-hazard-assistant-2-lpp1.vercel.app",
        "http://heat-hazard-assistant-2.vercel.app",
        "https://heat-hazard-assistant-2.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for loaded models
model = None
feature_list = None
threshold = None
scaler = None

class PredictionRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lon: float = Field(..., ge=-180, le=180, description="Longitude")
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    hour: int = Field(..., ge=0, le=23, description="Hour of day (0-23)")
    
    # Weather features
    temp: float = Field(..., description="Temperature in Celsius")
    tavg: float = Field(..., description="Average temperature in Celsius")
    tmin: float = Field(..., description="Minimum temperature in Celsius")
    prcp: float = Field(0.0, description="Precipitation in mm")
    
    # Optional rolling features (if not provided, will be computed)
    temp_roll3: Optional[float] = None
    temp_roll7: Optional[float] = None
    tavg_roll3: Optional[float] = None
    tavg_roll7: Optional[float] = None

class PredictionResponse(BaseModel):
    risk_score: float = Field(..., ge=0, le=1, description="Heat hazard risk probability")
    risk_level: str = Field(..., description="Risk level category")
    threshold: float = Field(..., description="Optimal threshold used")
    features_used: int = Field(..., description="Number of features used")

def load_models():
    """Load the trained model and metadata"""
    global model, feature_list, threshold, scaler
    
    try:
        # Load the best model
        model = joblib.load("models/heat_hazard_best_v4.joblib")
        print("✅ Model loaded successfully")
        
        # Load feature list
        feature_list = joblib.load("models/feature_list_v4.joblib")
        print(f"✅ Feature list loaded: {len(feature_list)} features")
        
        # Load threshold
        threshold = joblib.load("models/threshold_v4.joblib")
        print(f"✅ Threshold loaded: {threshold}")
        
        # Try to load scaler (if it exists)
        try:
            scaler = joblib.load("models/scaler_v4.joblib")
            print("✅ Scaler loaded successfully")
        except:
            print("⚠️ No scaler found, will use StandardScaler")
            scaler = None
            
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        raise

def prepare_features(request: PredictionRequest) -> np.ndarray:
    """Prepare features for prediction"""
    # Parse date
    try:
        date_obj = datetime.strptime(request.date, "%Y-%m-%d")
        dayofweek = date_obj.weekday()
        month = date_obj.month
        dayofyear = date_obj.timetuple().tm_yday
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Calculate derived features
    temp_range = request.temp - request.tmin
    heat_index = request.temp + 0.5 * request.tavg
    is_peak = 1 if 10 <= request.hour <= 17 else 0
    is_weekend = 1 if dayofweek in [5, 6] else 0
    dist_center = np.hypot(request.lat - 12.9716, request.lon - 77.5946)
    
    # Cyclical encoding
    hour_sin = np.sin(2 * np.pi * request.hour / 24)
    hour_cos = np.cos(2 * np.pi * request.hour / 24)
    month_sin = np.sin(2 * np.pi * month / 12)
    month_cos = np.cos(2 * np.pi * month / 12)
    
    # Use provided rolling features or defaults
    temp_roll3 = request.temp_roll3 if request.temp_roll3 is not None else request.temp
    temp_roll7 = request.temp_roll7 if request.temp_roll7 is not None else request.temp
    tavg_roll3 = request.tavg_roll3 if request.tavg_roll3 is not None else request.tavg
    tavg_roll7 = request.tavg_roll7 if request.tavg_roll7 is not None else request.tavg
    
    # Create feature vector in the same order as training
    features = [
        request.temp, request.tavg, request.tmin, request.prcp,
        temp_roll3, temp_roll7, tavg_roll3, tavg_roll7,
        temp_range, heat_index, is_peak, is_weekend,
        dist_center, hour_sin, hour_cos, month_sin, month_cos
    ]
    
    return np.array(features).reshape(1, -1)

def get_risk_level(risk_score: float) -> str:
    """Convert risk score to risk level"""
    if risk_score < 0.3:
        return "LOW"
    elif risk_score < 0.6:
        return "MEDIUM"
    elif risk_score < 0.8:
        return "HIGH"
    else:
        return "EXTREME"

@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    print("🚀 Starting Heat Hazard Risk Prediction API...")
    load_models()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Heat Hazard Risk Prediction API",
        "version": "1.0.0",
        "status": "healthy",
        "model_loaded": model is not None
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "features_count": len(feature_list) if feature_list else 0,
        "threshold": threshold
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict_risk(request: PredictionRequest):
    """Predict heat hazard risk for given location and conditions"""
    
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        # Prepare features
        features = prepare_features(request)
        
        # Scale features if scaler is available
        if scaler is not None:
            features = scaler.transform(features)
        
        # Make prediction
        risk_score = float(model.predict_proba(features)[0, 1])
        
        # Determine risk level
        risk_level = get_risk_level(risk_score)
        
        return PredictionResponse(
            risk_score=risk_score,
            risk_level=risk_level,
            threshold=threshold,
            features_used=len(feature_list)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/model-info")
async def model_info():
    """Get information about the loaded model"""
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    return {
        "model_type": type(model).__name__,
        "features": feature_list,
        "threshold": threshold,
        "scaler_available": scaler is not None
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=False
    ) 