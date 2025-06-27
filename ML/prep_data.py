"""
Heat Hazard Risk Prediction Data Preparation Pipeline

USAGE EXAMPLE (Bengaluru):

# Prepare features from pre-downloaded Bangalore weather CSVs
python prep_data.py \
  --weather_dir ./weather_csvs \
  --incidents data/incidents.csv \
  --landcover data/landcover.geojson \
  --output data/features.csv

NOTE: Place all required weather CSVs for Bangalore in the --weather_dir folder. The script will join and process these with incidents and landcover data.
"""

import argparse
import os
import pandas as pd
import geopandas as gpd
import numpy as np
from shapely.geometry import Point

def load_weather_data(weather_dir):
    dfs = []
    for fname in os.listdir(weather_dir):
        if fname.endswith(".csv"):
            dfs.append(pd.read_csv(os.path.join(weather_dir, fname)))
    all_weather = pd.concat(dfs, ignore_index=True)
    print(f"Loaded {len(all_weather)} weather records from {len(dfs)} CSV files.")
    return all_weather

def load_incidents(incidents_path):
    if incidents_path.endswith(".json"):
        df = pd.read_json(incidents_path)
    elif incidents_path.endswith(".csv"):
        df = pd.read_csv(incidents_path)
    else:
        raise ValueError("Incidents file must be .json or .csv")
    print(f"Loaded {len(df)} incident records from {incidents_path}.")
    return df

def load_landcover(landcover_path):
    gdf = gpd.read_file(landcover_path)
    print(f"Loaded {len(gdf)} landcover polygons from {landcover_path}.")
    return gdf

def preprocess(weather, incidents, landcover):
    weather['timestamp'] = pd.to_datetime(weather['timestamp'])
    incidents['timestamp'] = pd.to_datetime(incidents['timestamp'])

    weather_gdf = gpd.GeoDataFrame(
        weather,
        geometry=gpd.points_from_xy(weather['lon'], weather['lat']),
        crs='EPSG:4326'
    )
    incidents_gdf = gpd.GeoDataFrame(
        incidents,
        geometry=gpd.points_from_xy(incidents['lon'], incidents['lat']),
        crs='EPSG:4326'
    )
    print("Joining incidents to nearest weather grid point...")
    incidents_gdf = incidents_gdf.sjoin_nearest(weather_gdf[['geometry', 'timestamp', 'temp', 'humidity', 'wind']], how='left', distance_col='weather_dist', max_distance=0.05)
    print("Joining incidents to landcover polygons...")
    incidents_gdf = gpd.sjoin(incidents_gdf, landcover, how='left', predicate='intersects')
    weather = weather.sort_values('timestamp')
    weather['temp_roll3'] = weather['temp'].rolling(window=72, min_periods=1).mean()
    weather['humidity_roll3'] = weather['humidity'].rolling(window=72, min_periods=1).mean()
    weather['wind_roll3'] = weather['wind'].rolling(window=72, min_periods=1).mean()
    incidents_gdf['incident_hour'] = incidents_gdf['timestamp'].dt.floor('H')
    weather['weather_hour'] = weather['timestamp'].dt.floor('H')
    merged = pd.merge_asof(
        incidents_gdf.sort_values('incident_hour'),
        weather[['weather_hour', 'temp_roll3', 'humidity_roll3', 'wind_roll3']].sort_values('weather_hour'),
        left_on='incident_hour', right_on='weather_hour', direction='backward'
    )
    merged['hour'] = merged['incident_hour'].dt.hour
    merged['dayofweek'] = merged['incident_hour'].dt.dayofweek
    feature_cols = ['lat', 'lon', 'timestamp', 'type', 'temp', 'humidity', 'wind',
                    'temp_roll3', 'humidity_roll3', 'wind_roll3', 'hour', 'dayofweek']
    for col in landcover.columns:
        if col not in feature_cols and col != 'geometry':
            feature_cols.append(col)
    features = merged[feature_cols].copy()
    print(f"Final feature set has {len(features)} rows and {len(features.columns)} columns.")
    return features

def main():
    parser = argparse.ArgumentParser(description="Prepare data for heat hazard risk prediction using pre-downloaded Bangalore weather CSVs.\n\n"
        "See script top for usage example.")
    parser.add_argument("--weather_dir", required=True,
                        help="Directory containing Bangalore weather CSVs")
    parser.add_argument("--incidents", required=True, help="Path to incidents JSON or CSV")
    parser.add_argument("--landcover", required=True, help="Path to land cover GeoJSON or shapefile")
    parser.add_argument("--output", required=True, help="Output CSV for features")
    args = parser.parse_args()

    print("Loading weather, incidents, and landcover data for feature engineering...")
    weather = load_weather_data(args.weather_dir)
    incidents = load_incidents(args.incidents)
    landcover = load_landcover(args.landcover)
    features = preprocess(weather, incidents, landcover)
    features.to_csv(args.output, index=False)
    print(f"Features written to {args.output}")
    print("--- SUMMARY ---")
    print(f"Weather points: {len(weather)} | Incidents: {len(incidents)} | Output features: {len(features)}")

if __name__ == "__main__":
    main() 