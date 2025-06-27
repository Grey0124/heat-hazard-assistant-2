# Heat Hazard Risk Prediction - Data Preparation

This directory contains scripts and data for preparing features to train a machine learning model for heat hazard risk prediction in Bangalore, India.

## Overview

The data preparation pipeline processes:
- **Weather Data**: Historical temperature and precipitation data for Bangalore (1990-2022)
- **Incidents Data**: Heat-related incidents (heat stroke, fires, drought)
- **Landcover Data**: Geographic land cover information (urban, vegetation, water, etc.)

## Files

### Core Scripts
- `data_preparation.py` - Main data preparation script
- `test_data_prep.py` - Test script to verify data preparation
- `prep_data.py` - Original data preparation script (legacy)

### Data Files
- `Bangalore_1990_2022_BangaloreCity.csv` - Historical weather data
- `sample_incidents.csv` - Sample incidents data for testing
- `sample_landcover.geojson` - Sample landcover data for testing

### Configuration
- `requirements.txt` - Python dependencies
- `README.md` - This documentation

## Quick Start

### 1. Install Dependencies
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

### 2. Run Data Preparation
```bash
# Basic usage with default settings
python data_preparation.py --output features.csv

# With custom data files
python data_preparation.py \
  --weather_csv Bangalore_1990_2022_BangaloreCity.csv \
  --incidents sample_incidents.csv \
  --landcover sample_landcover.geojson \
  --output features.csv
```

### 3. Test the Setup
```bash
python test_data_prep.py
```

## Data Preparation Process

The `data_preparation.py` script performs the following steps:

### 1. Weather Data Processing
- Loads Bangalore weather CSV (1990-2022)
- Parses time column to datetime format
- Filters to last 365 days from current date
- Renames `tmax` → `temp` as requested
- Keeps columns: `temp`, `tavg`, `tmin`, `prcp`

### 2. Feature Engineering
- Computes 3-day rolling averages for:
  - `temp_roll3` (temperature)
  - `tavg_roll3` (average temperature)
  - `tmin_roll3` (minimum temperature)

### 3. Spatial-Temporal Joins
- Loads incidents data (JSON/CSV) or creates sample data
- Loads landcover data (GeoJSON) or creates sample data
- Performs spatial joins between incidents and weather/landcover
- Joins incidents to nearest weather timestamp (floored to day)

### 4. Temporal Features
- Adds `dayofweek` (0=Monday, 6=Sunday)
- Adds `month` (1-12)
- Adds `dayofyear` (1-366)
- Adds `season` (winter, spring, summer, autumn)

### 5. Data Cleaning & Export
- Handles missing values (mean imputation for numeric, drop for categorical)
- Selects relevant features for modeling
- Exports cleaned dataset to CSV

## Output Features

The final `features.csv` contains:

### Weather Features
- `temp`, `tavg`, `tmin`, `prcp` - Daily weather values
- `temp_roll3`, `tavg_roll3`, `tmin_roll3` - 3-day rolling averages

### Incident Features
- `timestamp` - Incident occurrence time
- `lat`, `lon` - Geographic coordinates
- `incident_type` - Type of incident (heat_stroke, fire, drought)
- `severity` - Incident severity (1-5 scale)

### Temporal Features
- `dayofweek` - Day of week (0-6)
- `month` - Month (1-12)
- `dayofyear` - Day of year (1-366)
- `season` - Season (winter, spring, summer, autumn)

### Landcover Features
- `landcover_type` - Land cover classification
- `urban_density` - Urban development density (0-1)
- `vegetation_cover` - Vegetation coverage (0-1)
- `water_bodies` - Water body coverage (0-1)

## Command Line Options

```bash
python data_preparation.py [OPTIONS]

Options:
  --weather_csv PATH    Path to Bangalore weather CSV (default: Bangalore_1990_2022_BangaloreCity.csv)
  --incidents PATH      Path to incidents JSON/CSV file (optional, creates sample if not provided)
  --landcover PATH      Path to landcover GeoJSON file (optional, creates sample if not provided)
  --output PATH         Output CSV file for features (default: features.csv)
  --help               Show help message
```

## Sample Data

If you don't have incidents or landcover data, the script will create sample data:

### Sample Incidents
- 30 realistic heat-related incidents
- Types: heat_stroke, fire, drought
- Severity levels: 1-5
- Geographic distribution around Bangalore center

### Sample Landcover
- 8 landcover polygons covering Bangalore area
- Types: urban, vegetation, water, agriculture, bare_soil
- Attributes: urban_density, vegetation_cover, water_bodies

## Troubleshooting

### Common Issues

1. **Missing Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Weather CSV Not Found**
   - Ensure `Bangalore_1990_2022_BangaloreCity.csv` is in the ML directory
   - Check file permissions

3. **Geopandas Installation Issues**
   ```bash
   # On Windows, try:
   conda install -c conda-forge geopandas
   
   # Or install wheels:
   pip install --only-binary=all geopandas
   ```

4. **Memory Issues**
   - The script filters to last 365 days to reduce memory usage
   - If still having issues, modify the filter period in `filter_last_12_months()`

### Testing

Run the test script to verify everything works:
```bash
python test_data_prep.py
```

## Next Steps

After running data preparation:

1. **Model Training**: Use the generated `features.csv` to train your ML model
2. **Feature Analysis**: Analyze feature importance and correlations
3. **Model Evaluation**: Test model performance on validation data
4. **Deployment**: Integrate the model into your heat hazard prediction system

## Contributing

To add new features or improve the data preparation:

1. Modify `data_preparation.py` to add new processing steps
2. Update `test_data_prep.py` to test new functionality
3. Update this README with new documentation
4. Test with both sample and real data

## License

This project is part of the Heat Hazard Assistant system. 