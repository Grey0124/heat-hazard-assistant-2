# Python 3.13 Setup Guide

If you're using Python 3.13 and encountering dependency issues, follow this manual setup guide.

## 🚀 Quick Setup for Python 3.13

### 1. Create Virtual Environment
```bash
python -m venv venv
venv\Scripts\activate  # Windows
# OR
source venv/bin/activate  # Linux/Mac
```

### 2. Install Dependencies Manually
```bash
# Core dependencies (these should work with Python 3.13)
pip install fastapi
pip install "uvicorn[standard]"
pip install joblib
pip install pydantic
pip install numpy
pip install pandas
pip install scikit-learn

# Optional dependencies (may have compatibility issues)
pip install imbalanced-learn  # Skip if it fails
pip install xgboost  # Skip if it fails
```

### 3. Copy Model Files
```bash
# Create models directory
mkdir models

# Copy from ML directory (if models exist)
cp ../ML/models/* ./models/
```

### 4. Test the Setup
```bash
python -c "
import fastapi
import uvicorn
import joblib
import pydantic
print('✅ All core dependencies working!')
"
```

### 5. Run the API
```bash
python main.py
```

## 🔧 Alternative: Use Python 3.11

If you continue to have issues with Python 3.13, consider using Python 3.11:

1. **Install Python 3.11** from python.org
2. **Create virtual environment with Python 3.11**:
   ```bash
   python3.11 -m venv venv311
   venv311\Scripts\activate
   ```
3. **Run the original setup**:
   ```bash
   python setup.py
   ```

## 🐳 Docker Alternative

If dependency issues persist, use Docker:

```bash
# Build and run with Docker
docker build -t heat-hazard-api .
docker run -p 8000:8000 heat-hazard-api
```

## 📝 Troubleshooting

### Common Issues:

1. **"No module named 'distutils'"**
   - Solution: Use Python 3.11 or install packages individually

2. **"BackendUnavailable" errors**
   - Solution: Use the manual installation method above

3. **"ModuleNotFoundError" for optional packages**
   - Solution: Skip optional packages (imbalanced-learn, xgboost)

### Minimal Working Setup:
```bash
pip install fastapi uvicorn joblib pydantic numpy pandas scikit-learn
```

This minimal setup should work with Python 3.13 and provide all core functionality. 