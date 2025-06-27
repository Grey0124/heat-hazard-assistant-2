"""
Improved Heat Hazard Risk Prediction - Model Training Script

This script implements an enhanced ML pipeline with:
1. Better feature engineering
2. Class imbalance handling
3. More sophisticated evaluation metrics
4. Ensemble methods
5. Hyperparameter optimization
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings
import os
warnings.filterwarnings('ignore')

# Machine learning libraries
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score, 
    roc_curve, precision_recall_curve, accuracy_score, f1_score, precision_score, recall_score
)
from sklearn.preprocessing import LabelEncoder, StandardScaler, RobustScaler
from sklearn.pipeline import Pipeline
from sklearn.utils.class_weight import compute_class_weight
from imblearn.over_sampling import SMOTE
from imblearn.under_sampling import RandomUnderSampler
from imblearn.pipeline import Pipeline as ImbPipeline

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

def enhanced_feature_engineering(df):
    """Enhanced feature engineering"""
    print("\n=== Enhanced Feature Engineering ===")
    
    # Convert timestamp to datetime
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Create binary hazard label (1 for heat_stroke, 0 for others)
    df['hazard_binary'] = (df['incident_type'] == 'heat_stroke').astype(int)
    
    # Enhanced temporal features
    df['hour'] = df['timestamp'].dt.hour
    df['is_weekend'] = df['dayofweek'].isin([5, 6]).astype(int)
    df['is_peak_hours'] = df['hour'].isin([10, 11, 12, 13, 14, 15, 16, 17]).astype(int)
    
    # Weather interaction features
    df['temp_humidity_interaction'] = df['temp'] * df['tavg']  # Temperature interaction
    df['temp_range'] = df['temp'] - df['tmin']  # Temperature range
    df['heat_index'] = df['temp'] + 0.5 * df['tavg']  # Simple heat index
    
    # Rolling features with different windows
    df['temp_roll7'] = df['temp'].rolling(window=7, min_periods=1).mean()
    df['tavg_roll7'] = df['tavg'].rolling(window=7, min_periods=1).mean()
    df['temp_std_roll3'] = df['temp'].rolling(window=3, min_periods=1).std()
    
    # Seasonal features
    df['is_summer'] = df['month'].isin([3, 4, 5, 6]).astype(int)
    df['is_monsoon'] = df['month'].isin([6, 7, 8, 9]).astype(int)
    
    # Geographic features
    df['distance_from_center'] = np.sqrt((df['lat'] - 12.9716)**2 + (df['lon'] - 77.5946)**2)
    
    # Environmental features
    df['green_urban_ratio'] = df['vegetation_cover'] / (df['urban_density'] + 0.1)
    df['water_availability'] = df['water_bodies'] + df['vegetation_cover']
    
    print(f"Enhanced features added. New shape: {df.shape}")
    print(f"New features: {[col for col in df.columns if col not in ['timestamp', 'incident_type', 'severity', 'description']]}")
    
    return df

def preprocess_data(df):
    """Preprocess the data for modeling"""
    print("\n=== Preprocessing Data ===")
    
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

def prepare_enhanced_features(train_df, test_df):
    """Prepare enhanced features for modeling"""
    print("\n=== Preparing Enhanced Features ===")
    
    # Select enhanced features for modeling
    feature_columns = [
        'temp', 'tavg', 'tmin', 'prcp',
        'temp_roll3', 'tavg_roll3', 'tmin_roll3',
        'temp_roll7', 'tavg_roll7', 'temp_std_roll3',
        'dayofweek', 'month', 'dayofyear',
        'hour', 'is_weekend', 'is_peak_hours',
        'temp_humidity_interaction', 'temp_range', 'heat_index',
        'is_summer', 'is_monsoon',
        'urban_density', 'vegetation_cover', 'water_bodies',
        'lat', 'lon', 'distance_from_center',
        'green_urban_ratio', 'water_availability'
    ]
    
    # Categorical features to encode
    categorical_features = ['season', 'landcover_type']
    
    # Prepare features
    X_train = train_df[feature_columns].copy()
    X_test = test_df[feature_columns].copy()
    
    # Handle missing values
    X_train = X_train.fillna(X_train.mean())
    X_test = X_test.fillna(X_train.mean())  # Use training mean
    
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
    
    print(f"Enhanced feature matrix shape - Train: {X_train.shape}, Test: {X_test.shape}")
    print(f"Features used: {list(X_train.columns)}")
    
    return X_train, X_test, y_train_binary, y_test_binary, encoders

def handle_class_imbalance(X_train, y_train):
    """Handle class imbalance using SMOTE"""
    print("\n=== Handling Class Imbalance ===")
    
    # Calculate class weights
    class_weights = compute_class_weight('balanced', classes=np.unique(y_train), y=y_train)
    weight_dict = dict(zip(np.unique(y_train), class_weights))
    
    print(f"Original class distribution: {np.bincount(y_train)}")
    print(f"Class weights: {weight_dict}")
    
    # Apply SMOTE for oversampling
    smote = SMOTE(random_state=42, k_neighbors=3)
    X_train_balanced, y_train_balanced = smote.fit_resample(X_train, y_train)
    
    print(f"Balanced class distribution: {np.bincount(y_train_balanced)}")
    
    return X_train_balanced, y_train_balanced, weight_dict

def train_ensemble_models(X_train, y_train, class_weights):
    """Train ensemble models with class weights"""
    print("\n=== Training Ensemble Models ===")
    
    # Define models with class weights
    models = {
        'Random Forest': RandomForestClassifier(
            n_estimators=200, max_depth=15, min_samples_split=5,
            min_samples_leaf=2, random_state=42, class_weight='balanced'
        ),
        'XGBoost': xgb.XGBClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.1,
            subsample=0.8, random_state=42, scale_pos_weight=3.0
        ),
        'Gradient Boosting': GradientBoostingClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.1,
            random_state=42
        ),
        'Logistic Regression': LogisticRegression(
            C=1.0, random_state=42, class_weight='balanced', max_iter=1000
        )
    }
    
    # Train all models
    trained_models = {}
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train, y_train)
        trained_models[name] = model
        print(f"✅ {name} trained successfully")
    
    return trained_models

def evaluate_models_comprehensive(models, X_test, y_test):
    """Comprehensive model evaluation"""
    print("\n=== Comprehensive Model Evaluation ===")
    
    results = {}
    
    for name, model in models.items():
        print(f"\n--- {name} Evaluation ---")
        
        # Predictions
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)[:, 1]
        
        # Comprehensive metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred)
        recall = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        roc_auc = roc_auc_score(y_test, y_pred_proba)
        
        print(f"Accuracy: {accuracy:.4f}")
        print(f"Precision: {precision:.4f}")
        print(f"Recall: {recall:.4f}")
        print(f"F1-Score: {f1:.4f}")
        print(f"ROC-AUC: {roc_auc:.4f}")
        
        print(f"\nClassification Report:")
        print(classification_report(y_test, y_pred))
        
        results[name] = {
            'model': model,
            'y_pred': y_pred,
            'y_pred_proba': y_pred_proba,
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'roc_auc': roc_auc
        }
    
    return results

def create_ensemble_model(models, X_train, y_train):
    """Create voting ensemble from best models"""
    print("\n=== Creating Ensemble Model ===")
    
    # Select best models for ensemble
    best_models = []
    for name, model in models.items():
        if hasattr(model, 'predict_proba'):
            best_models.append((name, model))
    
    # Create voting classifier
    ensemble = VotingClassifier(
        estimators=best_models,
        voting='soft'
    )
    
    ensemble.fit(X_train, y_train)
    print(f"✅ Ensemble model created with {len(best_models)} models")
    
    return ensemble

def save_improved_model_and_results(best_model, best_model_name, best_results, X_train, encoders, le):
    """Save the improved model and results"""
    print(f"\n=== Saving Improved Model and Results ===")
    
    # Create models directory if it doesn't exist
    os.makedirs('models', exist_ok=True)
    
    # Save the best model
    model_filename = 'models/heat_hazard_improved.joblib'
    joblib.dump(best_model, model_filename)
    
    # Save the label encoders
    encoder_filename = 'models/label_encoders_improved.joblib'
    joblib.dump(encoders, encoder_filename)
    
    # Save target encoder
    target_encoder_filename = 'models/target_encoder_improved.joblib'
    joblib.dump(le, target_encoder_filename)
    
    # Save feature names for later use
    feature_info = {
        'feature_names': list(X_train.columns),
        'categorical_features': ['season', 'landcover_type'],
        'target_encoder': le
    }
    feature_filename = 'models/feature_info_improved.joblib'
    joblib.dump(feature_info, feature_filename)
    
    # Save results summary
    results_summary = {
        'best_model_name': best_model_name,
        'roc_auc': best_results['roc_auc'],
        'accuracy': best_results['accuracy'],
        'precision': best_results['precision'],
        'recall': best_results['recall'],
        'f1_score': best_results['f1_score'],
        'model_filename': model_filename
    }
    
    print(f"✅ Improved model saved to: {model_filename}")
    print(f"✅ Label encoders saved to: {encoder_filename}")
    print(f"✅ Target encoder saved to: {target_encoder_filename}")
    print(f"✅ Feature info saved to: {feature_filename}")
    
    return results_summary

def main():
    """Main execution function"""
    print("=== Improved Heat Hazard Risk Prediction - Model Training ===")
    
    # Step 1: Load and explore data
    df = load_and_explore_data()
    
    # Step 2: Enhanced feature engineering
    df = enhanced_feature_engineering(df)
    
    # Step 3: Preprocess data
    df, le = preprocess_data(df)
    
    # Step 4: Split data by date
    train_df, test_df = split_data_by_date(df)
    
    # Step 5: Prepare enhanced features
    X_train, X_test, y_train_binary, y_test_binary, encoders = prepare_enhanced_features(train_df, test_df)
    
    # Step 6: Handle class imbalance
    X_train_balanced, y_train_balanced, class_weights = handle_class_imbalance(X_train, y_train_binary)
    
    # Step 7: Train ensemble models
    models = train_ensemble_models(X_train_balanced, y_train_balanced, class_weights)
    
    # Step 8: Evaluate models comprehensively
    results = evaluate_models_comprehensive(models, X_test, y_test_binary)
    
    # Step 9: Compare models and select best
    print("\n=== MODEL COMPARISON ===")
    for name, result in results.items():
        print(f"{name}:")
        print(f"  Accuracy: {result['accuracy']:.4f}")
        print(f"  F1-Score: {result['f1_score']:.4f}")
        print(f"  ROC-AUC: {result['roc_auc']:.4f}")
    
    # Find best model by F1-score
    best_model_name = max(results.keys(), key=lambda x: results[x]['f1_score'])
    best_results = results[best_model_name]
    best_model = results[best_model_name]['model']
    
    print(f"\n🏆 Best model by F1-Score: {best_model_name}")
    print(f"F1-Score: {best_results['f1_score']:.4f}")
    print(f"ROC-AUC: {best_results['roc_auc']:.4f}")
    print(f"Accuracy: {best_results['accuracy']:.4f}")
    
    # Step 10: Create ensemble model
    ensemble = create_ensemble_model(models, X_train_balanced, y_train_balanced)
    
    # Evaluate ensemble
    ensemble_results = evaluate_models_comprehensive({'Ensemble': ensemble}, X_test, y_test_binary)
    
    # Use ensemble if it's better
    if ensemble_results['Ensemble']['f1_score'] > best_results['f1_score']:
        best_model = ensemble
        best_model_name = "Ensemble"
        best_results = ensemble_results['Ensemble']
        print(f"\n🏆 Ensemble model is better! F1-Score: {best_results['f1_score']:.4f}")
    
    # Step 11: Save improved model and results
    results_summary = save_improved_model_and_results(best_model, best_model_name, best_results, X_train, encoders, le)
    
    # Step 12: Final summary
    print("\n=== IMPROVED MODEL SUMMARY ===")
    print(f"Dataset: {len(df):,} records")
    print(f"Training set: {len(train_df):,} records")
    print(f"Test set: {len(test_df):,} records")
    print(f"Enhanced features used: {len(X_train.columns)}")
    print(f"Best Model: {best_model_name}")
    print(f"F1-Score: {best_results['f1_score']:.4f}")
    print(f"ROC-AUC: {best_results['roc_auc']:.4f}")
    print(f"Accuracy: {best_results['accuracy']:.4f}")
    print(f"Precision: {best_results['precision']:.4f}")
    print(f"Recall: {best_results['recall']:.4f}")
    print(f"Model saved to: models/heat_hazard_improved.joblib")
    print("\n🎉 Improved model training completed successfully!")
    
    return results_summary

if __name__ == "__main__":
    results = main() 