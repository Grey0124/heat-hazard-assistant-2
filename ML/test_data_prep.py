"""
Test script for data preparation
"""
import subprocess
import sys
import os

def test_data_preparation():
    """Test the data preparation script"""
    print("Testing data preparation script...")
    
    # Check if the weather CSV exists
    weather_csv = "Bangalore_1990_2022_BangaloreCity.csv"
    if not os.path.exists(weather_csv):
        print(f"Error: {weather_csv} not found!")
        return False
    
    # Run the data preparation script
    try:
        cmd = [sys.executable, "data_preparation.py", "--output", "test_features.csv"]
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=".")
        
        if result.returncode == 0:
            print("✅ Data preparation completed successfully!")
            print("Output:")
            print(result.stdout)
            
            # Check if output file was created
            if os.path.exists("test_features.csv"):
                print(f"✅ Features file created: test_features.csv")
                return True
            else:
                print("❌ Features file was not created")
                return False
        else:
            print("❌ Data preparation failed!")
            print("Error output:")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"❌ Error running data preparation: {e}")
        return False

if __name__ == "__main__":
    success = test_data_preparation()
    if success:
        print("\n🎉 All tests passed! Data preparation is working correctly.")
    else:
        print("\n💥 Tests failed. Please check the errors above.") 