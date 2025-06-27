"""
Heat Hazard Risk Prediction - Model Training Script

This script implements the complete ML pipeline:
1. Load prepared features from features.csv
2. Split data by date (training on older data, testing on recent)
3. Train RandomForest and XGBoost models
4. Evaluate performance with ROC-AUC
5. Analyze feature importances
6. Save best model to models/heat_hazard_rf.joblib
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings
import os
warnings.filterwarnings('ignore')

# Machine learning libraries
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score, 
    roc_curve, precision_recall_curve, accuracy_score
)
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline

# XGBoost
import xgboost as xgb

# Model serialization
import joblib

# Set random seed for reproducibility
np.random.seed(42)

def load_and_explore_data():
    """Load and explore the prepared features"""
    print("=== Loading and Exploring Data ===")
    
    # Load the prepared features
    df = pd.read_csv('features.csv')
    
    print(f"Dataset shape: {df.shape}")
    print(f"Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")
    print(f"Incident types: {df['incident_type'].value_counts().to_dict()}")
    print(f"Landcover types: {df['landcover_type'].value_counts().to_dict()}")
    
    return df

def preprocess_data(df):
    """Preprocess the data for modeling"""
    print("\n=== Preprocessing Data ===")
    
    # Convert timestamp to datetime
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Create binary hazard label (1 for heat_stroke, 0 for others)
    df['hazard_binary'] = (df['incident_type'] == 'heat_stroke').astype(int)
    
    # Also create multi-class target for comparison
    le = LabelEncoder()
    df['hazard_multi'] = le.fit_transform(df['incident_type'])
    
    print(f"Binary hazard distribution: {df['hazard_binary'].value_counts().to_dict()}")
    print(f"Multi-class mapping: {dict(zip(le.classes_, range(len(le.classes_))))}")
    
    return df, le

def split_data_by_date(df):
    """Split data by date: training up to 3 months ago, test on last 3 months"""
    print("\n=== Splitting Data by Date ===")
    
    max_date = df['timestamp'].max()
    split_date = max_date - timedelta(days=90)  # 3 months ago
    
    print(f"Max date in dataset: {max_date}")
    print(f"Split date (3 months ago): {split_date}")
    
    # Split the data
    train_df = df[df['timestamp'] <= split_date].copy()
    test_df = df[df['timestamp'] > split_date].copy()
    
    print(f"Training set: {len(train_df):,} records ({len(train_df)/len(df)*100:.1f}%)")
    print(f"Test set: {len(test_df):,} records ({len(test_df)/len(df)*100:.1f}%)")
    print(f"Training set target distribution: {train_df['hazard_binary'].value_counts().to_dict()}")
    print(f"Test set target distribution: {test_df['hazard_binary'].value_counts().to_dict()}")
    
    return train_df, test_df

def prepare_features(train_df, test_df):
    """Prepare features for modeling"""
    print("\n=== Preparing Features ===")
    
    # Select features for modeling
    feature_columns = [
        'temp', 'tavg', 'tmin', 'prcp',
        'temp_roll3', 'tavg_roll3', 'tmin_roll3',
        'dayofweek', 'month', 'dayofyear',
        'urban_density', 'vegetation_cover', 'water_bodies',
        'lat', 'lon'
    ]
    
    # Categorical features to encode
    categorical_features = ['season', 'landcover_type']
    
    # Prepare features
    X_train = train_df[feature_columns].copy()
    X_test = test_df[feature_columns].copy()
    
    # Encode categorical features with proper handling of unseen categories
    encoders = {}
    for feature in categorical_features:
        if feature in train_df.columns:
            # Get all unique values from both train and test
            all_values = pd.concat([train_df[feature], test_df[feature]]).unique()
            
            # Create a mapping dictionary
            value_to_int = {val: idx for idx, val in enumerate(all_values)}
            
            # Apply encoding
            X_train[f'{feature}_encoded'] = train_df[feature].map(value_to_int)
            X_test[f'{feature}_encoded'] = test_df[feature].map(value_to_int)
            
            # Store the mapping for later use
            encoders[feature] = value_to_int
            
            print(f"Encoded {feature}: {len(all_values)} unique values")
    
    # Prepare targets
    y_train_binary = train_df['hazard_binary']
    y_test_binary = test_df['hazard_binary']
    
    print(f"Feature matrix shape - Train: {X_train.shape}, Test: {X_test.shape}")
    print(f"Features used: {list(X_train.columns)}")
    
    return X_train, X_test, y_train_binary, y_test_binary, encoders

def train_random_forest(X_train, y_train):
    """Train Random Forest with Grid Search"""
    print("\n=== Training Random Forest ===")
    
    # Define parameter grid for Random Forest
    rf_param_grid = {
        'n_estimators': [50, 100],
        'max_depth': [10, 20, None],
        'min_samples_split': [2, 5],
        'min_samples_leaf': [1, 2],
        'random_state': [42]
    }
    
    # Grid search for Random Forest
    rf_grid = GridSearchCV(
        RandomForestClassifier(),
        rf_param_grid,
        cv=3,  # Reduced for faster execution
        scoring='roc_auc',
        n_jobs=-1,
        verbose=1
    )
    
    rf_grid.fit(X_train, y_train)
    
    print(f"Best Random Forest parameters: {rf_grid.best_params_}")
    print(f"Best CV score: {rf_grid.best_score_:.4f}")
    
    return rf_grid.best_estimator_

def train_xgboost(X_train, y_train):
    """Train XGBoost with Grid Search"""
    print("\n=== Training XGBoost ===")
    
    # Define parameter grid for XGBoost
    xgb_param_grid = {
        'n_estimators': [50, 100],
        'max_depth': [3, 6],
        'learning_rate': [0.1, 0.2],
        'subsample': [0.8, 1.0],
        'random_state': [42]
    }
    
    # Grid search for XGBoost
    xgb_grid = GridSearchCV(
        xgb.XGBClassifier(eval_metric='logloss'),
        xgb_param_grid,
        cv=3,  # Reduced for faster execution
        scoring='roc_auc',
        n_jobs=-1,
        verbose=1
    )
    
    xgb_grid.fit(X_train, y_train)
    
    print(f"Best XGBoost parameters: {xgb_grid.best_params_}")
    print(f"Best CV score: {xgb_grid.best_score_:.4f}")
    
    return xgb_grid.best_estimator_

def evaluate_model(model, X_test, y_test, model_name):
    """Evaluate model and return metrics"""
    print(f"\n=== {model_name} Evaluation ===")
    
    # Predictions
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    # Metrics
    accuracy = accuracy_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_pred_proba)
    
    print(f"Accuracy: {accuracy:.4f}")
    print(f"ROC-AUC: {roc_auc:.4f}")
    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    return {
        'model': model,
        'y_pred': y_pred,
        'y_pred_proba': y_pred_proba,
        'accuracy': accuracy,
        'roc_auc': roc_auc
    }

def analyze_feature_importance(model, feature_names, model_name):
    """Analyze and plot feature importance"""
    print(f"\n=== {model_name} Feature Importance ===")
    
    if hasattr(model, 'feature_importances_'):
        importances = model.feature_importances_
    else:
        importances = model.named_steps['classifier'].feature_importances_
    
    # Create feature importance dataframe
    feature_importance_df = pd.DataFrame({
        'feature': feature_names,
        'importance': importances
    }).sort_values('importance', ascending=False)
    
    # Print top features
    print(f"Top 10 Most Important Features - {model_name}:")
    print(feature_importance_df.head(10))
    
    return feature_importance_df

def save_model_and_results(best_model, best_model_name, best_results, X_train, encoders, le):
    """Save the best model and related information"""
    print(f"\n=== Saving Model and Results ===")
    
    # Create models directory if it doesn't exist
    os.makedirs('models', exist_ok=True)
    
    # Save the best model
    model_filename = 'models/heat_hazard_rf.joblib'
    joblib.dump(best_model, model_filename)
    
    # Save the label encoders
    encoder_filename = 'models/label_encoders.joblib'
    joblib.dump(encoders, encoder_filename)
    
    # Save target encoder
    target_encoder_filename = 'models/target_encoder.joblib'
    joblib.dump(le, target_encoder_filename)
    
    # Save feature names for later use
    feature_info = {
        'feature_names': list(X_train.columns),
        'categorical_features': ['season', 'landcover_type'],
        'target_encoder': le
    }
    feature_filename = 'models/feature_info.joblib'
    joblib.dump(feature_info, feature_filename)
    
    # Save results summary
    results_summary = {
        'best_model_name': best_model_name,
        'roc_auc': best_results['roc_auc'],
        'accuracy': best_results['accuracy'],
        'model_filename': model_filename
    }
    
    print(f"✅ Best model saved to: {model_filename}")
    print(f"✅ Label encoders saved to: {encoder_filename}")
    print(f"✅ Target encoder saved to: {target_encoder_filename}")
    print(f"✅ Feature info saved to: {feature_filename}")
    
    return results_summary

def main():
    """Main execution function"""
    print("=== Heat Hazard Risk Prediction - Model Training ===")
    
    # Step 1: Load and explore data
    df = load_and_explore_data()
    
    # Step 2: Preprocess data
    df, le = preprocess_data(df)
    
    # Step 3: Split data by date
    train_df, test_df = split_data_by_date(df)
    
    # Step 4: Prepare features
    X_train, X_test, y_train_binary, y_test_binary, encoders = prepare_features(train_df, test_df)
    
    # Step 5: Train Random Forest
    best_rf = train_random_forest(X_train, y_train_binary)
    
    # Step 6: Train XGBoost
    best_xgb = train_xgboost(X_train, y_train_binary)
    
    # Step 7: Evaluate models
    rf_results = evaluate_model(best_rf, X_test, y_test_binary, "Random Forest")
    xgb_results = evaluate_model(best_xgb, X_test, y_test_binary, "XGBoost")
    
    # Step 8: Compare models and select best
    print("\n=== MODEL COMPARISON ===")
    print(f"Random Forest ROC-AUC: {rf_results['roc_auc']:.4f}")
    print(f"XGBoost ROC-AUC: {xgb_results['roc_auc']:.4f}")
    
    if rf_results['roc_auc'] > xgb_results['roc_auc']:
        best_model = best_rf
        best_model_name = "Random Forest"
        best_results = rf_results
    else:
        best_model = best_xgb
        best_model_name = "XGBoost"
        best_results = xgb_results
    
    print(f"\n🏆 Best model: {best_model_name} (ROC-AUC: {best_results['roc_auc']:.4f})")
    
    # Step 9: Analyze feature importance
    rf_importance = analyze_feature_importance(best_rf, X_train.columns, "Random Forest")
    xgb_importance = analyze_feature_importance(best_xgb, X_train.columns, "XGBoost")
    
    # Step 10: Save model and results
    results_summary = save_model_and_results(best_model, best_model_name, best_results, X_train, encoders, le)
    
    # Step 11: Final summary
    print("\n=== FINAL SUMMARY ===")
    print(f"Dataset: {len(df):,} records")
    print(f"Training set: {len(train_df):,} records")
    print(f"Test set: {len(test_df):,} records")
    print(f"Features used: {len(X_train.columns)}")
    print(f"Best Model: {best_model_name}")
    print(f"ROC-AUC Score: {best_results['roc_auc']:.4f}")
    print(f"Accuracy Score: {best_results['accuracy']:.4f}")
    print(f"Model saved to: models/heat_hazard_rf.joblib")
    print("\n🎉 Model training completed successfully!")
    
    return results_summary

if __name__ == "__main__":
    results = main() 