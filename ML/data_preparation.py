"""
Heat Hazard Risk Prediction - Data Preparation Script

This script prepares data for the heat hazard risk prediction model by:
1. Loading Bangalore weather data (1990-2022)
2. Filtering to last 365 days
3. Computing rolling averages
4. Joining with incidents and landcover data
5. Creating temporal features
6. Exporting cleaned features for modeling

Usage:
    python data_preparation.py --output features.csv
"""

import pandas as pd
import geopandas as gpd
import numpy as np
from datetime import datetime, timedelta
import argparse
import os
from shapely.geometry import Point
import warnings
warnings.filterwarnings('ignore')

def load_bangalore_weather(csv_path):
    """
    Load Bangalore weather data and parse datetime
    """
    print(f"Loading weather data from {csv_path}...")
    
    # Load the CSV file
    df = pd.read_csv(csv_path)
    
    # Parse the time column to datetime
    df['time'] = pd.to_datetime(df['time'], format='%d-%m-%Y')
    
    # Rename tmax to temp as requested
    df = df.rename(columns={'tmax': 'temp'})
    
    # Keep only required columns: temp, tavg, tmin, prcp
    required_cols = ['time', 'temp', 'tavg', 'tmin', 'prcp']
    df = df[required_cols]
    
    print(f"Loaded {len(df)} weather records from {df['time'].min()} to {df['time'].max()}")
    return df

def filter_last_12_months(df):
    """
    Filter data to last 365 days from the most recent data available
    """
    print("Filtering to last 365 days from most recent data...")
    
    # Get the most recent date in the dataset
    max_date = df['time'].max()
    
    # Calculate cutoff date (365 days before the most recent date)
    cutoff_date = max_date - timedelta(days=365)
    
    # Filter the dataframe
    filtered_df = df[df['time'] >= cutoff_date].copy()
    
    print(f"Filtered to {len(filtered_df)} records from {filtered_df['time'].min()} to {filtered_df['time'].max()}")
    return filtered_df

def compute_rolling_averages(df):
    """
    Compute 3-day rolling averages for temp, tavg, tmin
    """
    print("Computing 3-day rolling averages...")
    
    # Sort by time to ensure proper rolling calculation
    df = df.sort_values('time').reset_index(drop=True)
    
    # Compute 3-day rolling averages (3 days = 3 records for daily data)
    df['temp_roll3'] = df['temp'].rolling(window=3, min_periods=1).mean()
    df['tavg_roll3'] = df['tavg'].rolling(window=3, min_periods=1).mean()
    df['tmin_roll3'] = df['tmin'].rolling(window=3, min_periods=1).mean()
    
    print("Rolling averages computed successfully")
    return df

def load_incidents_data(incidents_path=None):
    """
    Load incidents data from JSON/CSV or create sample data if not available
    """
    if incidents_path and os.path.exists(incidents_path):
        print(f"Loading incidents from {incidents_path}...")
        if incidents_path.endswith('.json'):
            incidents = pd.read_json(incidents_path)
        elif incidents_path.endswith('.csv'):
            incidents = pd.read_csv(incidents_path)
        else:
            raise ValueError("Incidents file must be .json or .csv")
    else:
        print("No incidents file found, creating sample incidents data...")
        # Create sample incidents data for demonstration
        np.random.seed(42)
        n_incidents = 100
        
        # Generate random dates within the last year of available weather data
        # Use 2021-2022 range to match the weather data
        end_date = datetime(2022, 7, 25)  # Last date in weather data
        start_date = end_date - timedelta(days=365)
        dates = pd.date_range(start=start_date, end=end_date, periods=n_incidents)
        
        # Bangalore coordinates (approximate center)
        bangalore_lat = 12.9716
        bangalore_lon = 77.5946
        
        incidents = pd.DataFrame({
            'timestamp': dates,
            'lat': np.random.normal(bangalore_lat, 0.1, n_incidents),
            'lon': np.random.normal(bangalore_lon, 0.1, n_incidents),
            'incident_type': np.random.choice(['heat_stroke', 'fire', 'drought'], n_incidents),
            'severity': np.random.randint(1, 6, n_incidents)
        })
    
    print(f"Loaded {len(incidents)} incident records")
    return incidents

def load_landcover_data(landcover_path=None):
    """
    Load landcover data from GeoJSON or create sample data if not available
    """
    if landcover_path and os.path.exists(landcover_path):
        print(f"Loading landcover from {landcover_path}...")
        landcover = gpd.read_file(landcover_path)
    else:
        print("No landcover file found, creating sample landcover data...")
        # Create sample landcover data for demonstration
        bangalore_lat = 12.9716
        bangalore_lon = 77.5946
        
        # Create a simple grid of landcover types
        lats = np.linspace(bangalore_lat - 0.2, bangalore_lat + 0.2, 5)
        lons = np.linspace(bangalore_lon - 0.2, bangalore_lon + 0.2, 5)
        
        landcover_data = []
        landcover_types = ['urban', 'vegetation', 'water', 'agriculture', 'bare_soil']
        
        for i, lat in enumerate(lats):
            for j, lon in enumerate(lons):
                # Create a small polygon for each grid cell
                from shapely.geometry import box
                cell = box(lon - 0.02, lat - 0.02, lon + 0.02, lat + 0.02)
                
                landcover_data.append({
                    'geometry': cell,
                    'landcover_type': landcover_types[(i + j) % len(landcover_types)],
                    'urban_density': np.random.uniform(0, 1),
                    'vegetation_cover': np.random.uniform(0, 1),
                    'water_bodies': np.random.uniform(0, 0.3)
                })
        
        landcover = gpd.GeoDataFrame(landcover_data, crs='EPSG:4326')
    
    print(f"Loaded {len(landcover)} landcover polygons")
    return landcover

def spatial_temporal_join(weather_df, incidents_df, landcover_gdf):
    """
    Perform spatial and temporal joins between weather, incidents, and landcover
    """
    print("Performing spatial and temporal joins...")
    
    # Convert weather data to GeoDataFrame
    weather_gdf = gpd.GeoDataFrame(
        weather_df,
        geometry=gpd.points_from_xy(
            [12.9716] * len(weather_df),  # Bangalore center lat
            [77.5946] * len(weather_df)   # Bangalore center lon
        ),
        crs='EPSG:4326'
    )
    
    # Convert incidents to GeoDataFrame
    incidents_gdf = gpd.GeoDataFrame(
        incidents_df,
        geometry=gpd.points_from_xy(incidents_df['lon'], incidents_df['lat']),
        crs='EPSG:4326'
    )
    
    # Spatial join: incidents to nearest weather point
    print("Joining incidents to weather data...")
    incidents_weather = gpd.sjoin_nearest(
        incidents_gdf, 
        weather_gdf[['geometry', 'time', 'temp', 'tavg', 'tmin', 'prcp', 
                    'temp_roll3', 'tavg_roll3', 'tmin_roll3']], 
        how='left', 
        distance_col='weather_dist'
    )
    
    # Drop the index_right column that was created by sjoin_nearest
    if 'index_right' in incidents_weather.columns:
        incidents_weather = incidents_weather.drop(columns=['index_right'])
    
    # Reset index to avoid any conflicts
    incidents_weather = incidents_weather.reset_index(drop=True)
    
    # Spatial join: incidents to landcover
    print("Joining incidents to landcover data...")
    incidents_landcover = gpd.sjoin(
        incidents_weather, 
        landcover_gdf, 
        how='left', 
        predicate='intersects'
    )
    
    # Drop the index_right column from the second join
    if 'index_right' in incidents_landcover.columns:
        incidents_landcover = incidents_landcover.drop(columns=['index_right'])
    
    # Reset index again
    incidents_landcover = incidents_landcover.reset_index(drop=True)
    
    # Temporal join: floor timestamps to day for better matching
    incidents_landcover['date'] = incidents_landcover['timestamp'].dt.floor('D')
    weather_gdf['date'] = weather_gdf['time'].dt.floor('D')
    
    # Merge on date
    final_df = pd.merge(
        incidents_landcover,
        weather_gdf[['date', 'temp', 'tavg', 'tmin', 'prcp', 
                    'temp_roll3', 'tavg_roll3', 'tmin_roll3']],
        on='date',
        how='left',
        suffixes=('', '_weather')
    )
    
    print(f"Spatial-temporal join completed. Final dataset has {len(final_df)} records")
    return final_df

def add_temporal_features(df):
    """
    Add dayofweek, month, and other temporal features
    """
    print("Adding temporal features...")
    
    # Add day of week (0=Monday, 6=Sunday)
    df['dayofweek'] = df['timestamp'].dt.dayofweek
    
    # Add month (1-12)
    df['month'] = df['timestamp'].dt.month
    
    # Add day of year
    df['dayofyear'] = df['timestamp'].dt.dayofyear
    
    # Add hour (if available)
    if 'timestamp' in df.columns:
        df['hour'] = df['timestamp'].dt.hour
    
    # Add season
    df['season'] = df['month'].map({
        12: 'winter', 1: 'winter', 2: 'winter',
        3: 'spring', 4: 'spring', 5: 'spring',
        6: 'summer', 7: 'summer', 8: 'summer',
        9: 'autumn', 10: 'autumn', 11: 'autumn'
    })
    
    print("Temporal features added successfully")
    return df

def clean_and_export_features(df, output_path):
    """
    Clean the dataset and export to CSV
    """
    print("Cleaning and preparing final features...")
    
    # Select relevant features for modeling
    feature_columns = [
        'timestamp', 'lat', 'lon', 'incident_type', 'severity',
        'temp', 'tavg', 'tmin', 'prcp',
        'temp_roll3', 'tavg_roll3', 'tmin_roll3',
        'dayofweek', 'month', 'dayofyear', 'season',
        'landcover_type', 'urban_density', 'vegetation_cover', 'water_bodies'
    ]
    
    # Filter to available columns
    available_columns = [col for col in feature_columns if col in df.columns]
    final_features = df[available_columns].copy()
    
    # Handle missing values
    numeric_columns = final_features.select_dtypes(include=[np.number]).columns
    final_features[numeric_columns] = final_features[numeric_columns].fillna(final_features[numeric_columns].mean())
    
    # Drop rows with missing categorical data
    categorical_columns = final_features.select_dtypes(include=['object']).columns
    final_features = final_features.dropna(subset=categorical_columns)
    
    # Export to CSV
    final_features.to_csv(output_path, index=False)
    
    print(f"Features exported to {output_path}")
    print(f"Final dataset: {len(final_features)} rows, {len(final_features.columns)} columns")
    
    # Print summary statistics
    print("\n--- DATASET SUMMARY ---")
    print(f"Date range: {final_features['timestamp'].min()} to {final_features['timestamp'].max()}")
    print(f"Incident types: {final_features['incident_type'].value_counts().to_dict()}")
    print(f"Landcover types: {final_features['landcover_type'].value_counts().to_dict()}")
    
    return final_features

def main():
    parser = argparse.ArgumentParser(description="Prepare data for heat hazard risk prediction")
    parser.add_argument("--weather_csv", default="Bangalore_1990_2022_BangaloreCity.csv",
                        help="Path to Bangalore weather CSV file")
    parser.add_argument("--incidents", default=None,
                        help="Path to incidents JSON/CSV file (optional)")
    parser.add_argument("--landcover", default=None,
                        help="Path to landcover GeoJSON file (optional)")
    parser.add_argument("--output", default="features.csv",
                        help="Output CSV file for features")
    
    args = parser.parse_args()
    
    print("=== Heat Hazard Risk Prediction - Data Preparation ===")
    
    # Step 1: Load and process weather data
    weather_df = load_bangalore_weather(args.weather_csv)
    weather_df = filter_last_12_months(weather_df)
    weather_df = compute_rolling_averages(weather_df)
    
    # Step 2: Load incidents and landcover data
    incidents_df = load_incidents_data(args.incidents)
    landcover_gdf = load_landcover_data(args.landcover)
    
    # Step 3: Perform spatial and temporal joins
    joined_df = spatial_temporal_join(weather_df, incidents_df, landcover_gdf)
    
    # Step 4: Add temporal features
    final_df = add_temporal_features(joined_df)
    
    # Step 5: Clean and export
    features = clean_and_export_features(final_df, args.output)
    
    print("\n=== Data Preparation Complete ===")
    print(f"Features saved to: {args.output}")
    print("Ready for model training!")

if __name__ == "__main__":
    main() 