# Heat Hazard Risk Prediction API

A FastAPI service for real-time heat hazard risk assessment in Bangalore.

## 🚀 Features

- **Real-time predictions**: Get heat hazard risk scores for any location and time
- **RESTful API**: Easy-to-use HTTP endpoints
- **Docker support**: Containerized deployment
- **Health checks**: Built-in monitoring endpoints
- **Input validation**: Robust request validation with Pydantic
- **Risk categorization**: Automatic risk level classification

## 📋 Prerequisites

- Python 3.9+
- Docker (for containerized deployment)
- Trained model files from the ML pipeline

## 🛠️ Setup

### Local Development

1. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Copy model files**:
   ```bash
   # Copy from ML/models/ to inference/models/
   cp -r ../ML/models/ ./models/
   ```

4. **Run the API**:
   ```bash
   python main.py
   ```

### Docker Deployment

1. **Build the image**:
   ```bash
   docker build -t heat-hazard-api .
   ```

2. **Run the container**:
   ```bash
   docker run -p 8000:8000 heat-hazard-api
   ```

## 📡 API Endpoints

### Health Check
```http
GET /
GET /health
```

### Model Information
```http
GET /model-info
```

### Risk Prediction
```http
POST /predict
```

#### Request Body:
```json
{
  "lat": 12.9716,
  "lon": 77.5946,
  "date": "2024-06-15",
  "hour": 14,
  "temp": 38.5,
  "tavg": 75.0,
  "tmin": 25.0,
  "prcp": 0.0
}
```

#### Response:
```json
{
  "risk_score": 0.75,
  "risk_level": "HIGH",
  "threshold": 0.493,
  "features_used": 17
}
```

## 🧪 Testing

Run the test script to verify API functionality:

```bash
python test_api.py
```

## 🚀 Deployment on Render

1. **Connect your repository** to Render
2. **Create a new Web Service**
3. **Configure the service**:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python 3.9

4. **Add environment variables** (if needed):
   - `PORT`: 8000 (usually set automatically)

5. **Deploy** and get your API URL

## 📊 Risk Levels

- **LOW**: Risk score < 0.3
- **MEDIUM**: Risk score 0.3 - 0.6
- **HIGH**: Risk score 0.6 - 0.8
- **EXTREME**: Risk score > 0.8

## 🔧 Configuration

The API automatically loads:
- `models/heat_hazard_best_v4.joblib` - Trained model
- `models/feature_list_v4.joblib` - Feature list
- `models/threshold_v4.joblib` - Optimal threshold
- `models/scaler_v4.joblib` - Feature scaler (optional)

## 📝 Example Usage

### Python
```python
import requests

url = "https://your-api.onrender.com/predict"
data = {
    "lat": 12.9716,
    "lon": 77.5946,
    "date": "2024-06-15",
    "hour": 14,
    "temp": 38.5,
    "tavg": 75.0,
    "tmin": 25.0,
    "prcp": 0.0
}

response = requests.post(url, json=data)
result = response.json()
print(f"Risk Level: {result['risk_level']}")
```

### cURL
```bash
curl -X POST "https://your-api.onrender.com/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 12.9716,
    "lon": 77.5946,
    "date": "2024-06-15",
    "hour": 14,
    "temp": 38.5,
    "tavg": 75.0,
    "tmin": 25.0,
    "prcp": 0.0
  }'
```

## 🔍 Monitoring

- **Health check**: `GET /health`
- **Model status**: `GET /model-info`
- **Logs**: Check application logs for errors

## 🛡️ Error Handling

The API includes comprehensive error handling:
- Input validation with Pydantic
- Model loading errors
- Prediction errors
- HTTP status codes for different error types

## 📈 Performance

- **Response time**: < 100ms for predictions
- **Concurrent requests**: Handles multiple simultaneous requests
- **Memory usage**: Optimized for containerized deployment

## 🔄 Updates

To update the model:
1. Retrain the model in the ML pipeline
2. Copy new model files to `models/`
3. Redeploy the API

## 📞 Support

For issues or questions:
1. Check the logs for error messages
2. Verify model files are present
3. Test with the provided test script 