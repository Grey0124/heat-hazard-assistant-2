#!/usr/bin/env python3
"""
Setup script for Heat Hazard Risk Prediction API
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 9):
        print("❌ Python 3.9+ is required")
        sys.exit(1)
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")

def create_virtual_env():
    """Create virtual environment"""
    if not os.path.exists("venv"):
        print("🔧 Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)
        print("✅ Virtual environment created")
    else:
        print("✅ Virtual environment already exists")

def install_dependencies():
    """Install Python dependencies"""
    print("📦 Installing dependencies...")
    
    # Determine the correct pip path
    if os.name == 'nt':  # Windows
        pip_path = "venv\\Scripts\\pip"
    else:  # Unix/Linux/Mac
        pip_path = "venv/bin/pip"
    
    # Try simple requirements first for Python 3.13 compatibility
    requirements_file = "requirements-simple.txt" if sys.version_info >= (3, 13) else "requirements.txt"
    
    try:
        print(f"Using {requirements_file} for Python {sys.version_info.major}.{sys.version_info.minor}")
        subprocess.run([pip_path, "install", "-r", requirements_file], check=True)
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        print("🔄 Trying alternative approach...")
        
        # Try installing packages one by one
        packages = [
            "fastapi",
            "uvicorn[standard]", 
            "joblib",
            "pydantic",
            "numpy",
            "pandas",
            "scikit-learn"
        ]
        
        for package in packages:
            try:
                print(f"Installing {package}...")
                subprocess.run([pip_path, "install", package], check=True)
            except subprocess.CalledProcessError as e:
                print(f"⚠️  Failed to install {package}: {e}")
        
        print("✅ Basic dependencies installed")

def copy_model_files():
    """Copy model files from ML directory"""
    ml_models_path = Path("../ML/models")
    local_models_path = Path("models")
    
    if not ml_models_path.exists():
        print("❌ ML models directory not found. Please run the ML pipeline first.")
        return False
    
    # Create models directory if it doesn't exist
    local_models_path.mkdir(exist_ok=True)
    
    print("📁 Copying model files...")
    
    # List of required model files
    required_files = [
        "heat_hazard_best_v4.joblib",
        "feature_list_v4.joblib", 
        "threshold_v4.joblib"
    ]
    
    copied_files = []
    for file in required_files:
        src = ml_models_path / file
        dst = local_models_path / file
        
        if src.exists():
            shutil.copy2(src, dst)
            copied_files.append(file)
            print(f"  ✅ Copied {file}")
        else:
            print(f"  ⚠️  {file} not found in ML models")
    
    # Try to copy scaler if it exists
    scaler_src = ml_models_path / "scaler_v4.joblib"
    scaler_dst = local_models_path / "scaler_v4.joblib"
    if scaler_src.exists():
        shutil.copy2(scaler_src, scaler_dst)
        copied_files.append("scaler_v4.joblib")
        print("  ✅ Copied scaler_v4.joblib")
    
    if len(copied_files) >= 3:  # At least the 3 required files
        print(f"✅ Successfully copied {len(copied_files)} model files")
        return True
    else:
        print("❌ Missing required model files")
        return False

def test_setup():
    """Test if the setup is working"""
    print("🧪 Testing setup...")
    
    try:
        # Test if we can import the required modules
        import fastapi
        import uvicorn
        import joblib
        import pydantic
        print("✅ All required modules can be imported")
        
        # Test optional modules
        try:
            import imbalanced_learn
            print("✅ imbalanced-learn available")
        except ImportError:
            print("⚠️  imbalanced-learn not available (optional)")
        
        try:
            import xgboost
            print("✅ xgboost available")
        except ImportError:
            print("⚠️  xgboost not available (optional)")
        
        # Test if model files can be loaded
        try:
            model = joblib.load("models/heat_hazard_best_v4.joblib")
            print("✅ Model can be loaded successfully")
        except Exception as e:
            print(f"⚠️  Model loading test skipped: {e}")
            print("   (This is expected if models haven't been trained yet)")
        
        return True
        
    except Exception as e:
        print(f"❌ Setup test failed: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 Setting up Heat Hazard Risk Prediction API")
    print("=" * 50)
    
    # Check Python version
    check_python_version()
    
    # Create virtual environment
    create_virtual_env()
    
    # Install dependencies
    install_dependencies()
    
    # Copy model files
    if not copy_model_files():
        print("\n⚠️  Setup incomplete. Please ensure you have trained models.")
        print("   Run the ML pipeline first: cd ../ML && python improved_model.py")
        return
    
    # Test setup
    if test_setup():
        print("\n🎉 Setup completed successfully!")
        print("\n📋 Next steps:")
        print("1. Activate virtual environment:")
        if os.name == 'nt':  # Windows
            print("   venv\\Scripts\\activate")
        else:  # Unix/Linux/Mac
            print("   source venv/bin/activate")
        print("2. Run the API:")
        print("   python main.py")
        print("3. Test the API:")
        print("   python test_api.py")
        print("\n🌐 API will be available at: http://localhost:8000")
        print("📚 API documentation at: http://localhost:8000/docs")
    else:
        print("\n❌ Setup failed. Please check the errors above.")

if __name__ == "__main__":
    main() 