#!/usr/bin/env python3
"""
Context-Aware Suggestion Model Training
Trains exact recipient models plus context-level fallback models.
Fallback order at prediction time is:
1. context_recipient
2. context_general
3. general_general
"""

import json
import pickle
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.metrics import precision_score, recall_score, f1_score
from collections import defaultdict

# Configuration
DATA_PATH = "training_data.json"
MODELS_DIR = "./models"
METRICS_PATH = "./models/metrics.json"
FEEDBACK_LOG_PATH = "./models/feedback_log.json"

def ensure_models_dir():
    """Create models directory if it doesn't exist"""
    os.makedirs(MODELS_DIR, exist_ok=True)

def load_training_data():
    """Load training data from JSON"""
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data['data']

def load_existing_metrics():
    """Load existing metrics so online feedback stats survive retraining."""
    if not os.path.exists(METRICS_PATH):
        return {}

    with open(METRICS_PATH, 'r') as f:
        return json.load(f)

def load_feedback_counts():
    """Count online feedback samples per exact model key."""
    if not os.path.exists(FEEDBACK_LOG_PATH):
        return {}

    with open(FEEDBACK_LOG_PATH, 'r') as f:
        feedback_log = json.load(f)

    counts = defaultdict(int)
    for item in feedback_log:
        key = f"{item.get('context')}_{item.get('recipient')}"
        counts[key] += 1

    return counts

def group_by_context_recipient(data):
    """Group training data by exact pair and context fallback."""
    grouped = defaultdict(lambda: {'X': [], 'y': []})
    
    for item in data:
        context = item['context']
        recipient = item['recipient']
        label = 1 if item['helpful'] else 0
        keys = [f"{context}_{recipient}"]

        # Add context-level fallback data for legal UI contexts.
        if context != "general":
            keys.append(f"{context}_general")
        
        for key in keys:
            # Feature: suggestion text
            grouped[key]['X'].append(item['suggestion'])
            # Label: helpful (1) or not helpful (0)
            grouped[key]['y'].append(label)
    
    return grouped

def cleanup_stale_models(active_keys):
    """Remove .pkl files that do not correspond to the current training set."""
    active_files = {f"{key}.pkl" for key in active_keys}
    removed = []

    for filename in os.listdir(MODELS_DIR):
        if not filename.endswith(".pkl"):
            continue
        if filename in active_files:
            continue

        stale_path = os.path.join(MODELS_DIR, filename)
        os.remove(stale_path)
        removed.append(filename)

    return removed

def train_models():
    """Train models for each (context, recipient) combination"""
    print("Loading training data...")
    data = load_training_data()
    
    print("Grouping data by context and recipient...")
    grouped_data = group_by_context_recipient(data)
    
    ensure_models_dir()
    existing_metrics = load_existing_metrics()
    feedback_counts = load_feedback_counts()
    metrics = {}
    
    print(f"\nTraining {len(grouped_data)} models...\n")
    print("-" * 70)
    
    for key, dataset in grouped_data.items():
        if len(dataset['y']) < 2:
            print(f"⚠️  {key}: Skipped (insufficient data: {len(dataset['y'])} samples)")
            continue
        
        # Create pipeline: TF-IDF + Naive Bayes
        pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(lowercase=True, stop_words='english', max_features=50)),
            ('classifier', MultinomialNB())
        ])
        
        # Train
        X = dataset['X']
        y = dataset['y']
        
        try:
            pipeline.fit(X, y)
            
            # Evaluate
            y_pred = pipeline.predict(X)
            precision = precision_score(y, y_pred, zero_division=0)
            recall = recall_score(y, y_pred, zero_division=0)
            f1 = f1_score(y, y_pred, zero_division=0)
            
            # Save model
            model_path = os.path.join(MODELS_DIR, f"{key}.pkl")
            with open(model_path, 'wb') as f:
                pickle.dump(pipeline, f)
            
            # Record metrics
            existing_metric = existing_metrics.get(key, {})
            has_online_metrics = "accuracy" in existing_metric
            migrated_feedback_samples = existing_metric.get("feedback_samples")
            if migrated_feedback_samples is None and has_online_metrics and existing_metric.get("status") == "updated":
                migrated_feedback_samples = existing_metric.get("samples")
            if key in feedback_counts:
                migrated_feedback_samples = feedback_counts[key]

            metrics[key] = {
                "samples": len(y),
                "precision": float(precision),
                "recall": float(recall),
                "f1": float(f1),
                "status": "updated" if has_online_metrics else "trained",
                "model_type": "context_fallback" if key.endswith("_general") and key != "general_general" else "exact_or_global"
            }

            for online_key in ("accuracy", "feedback_samples", "total_feedback", "last_updated"):
                if online_key in existing_metric:
                    metrics[key][online_key] = existing_metric[online_key]
            if migrated_feedback_samples is not None:
                metrics[key]["feedback_samples"] = migrated_feedback_samples
            
            print(f"✅ {key}")
            print(f"   Samples: {len(y)} | Precision: {precision:.2f} | Recall: {recall:.2f} | F1: {f1:.2f}")
        
        except Exception as e:
            print(f"❌ {key}: {str(e)}")
            metrics[key] = {"status": "failed", "error": str(e)}
    
    print("-" * 70)

    stale_models = cleanup_stale_models(metrics.keys())
    if stale_models:
        print(f"Removed stale models: {', '.join(sorted(stale_models))}")
    
    # Save metrics
    with open(METRICS_PATH, 'w') as f:
        json.dump(metrics, f, indent=2)
    
    print(f"\n✨ Training complete!")
    print(f"   Models saved to: {MODELS_DIR}/")
    print(f"   Metrics saved to: {METRICS_PATH}")
    print(f"   Total models available: {len([m for m in metrics.values() if m.get('status') in ('trained', 'updated')])}")

if __name__ == "__main__":
    train_models()
