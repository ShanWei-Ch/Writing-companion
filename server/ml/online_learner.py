#!/usr/bin/env python3
"""
Online Learning: Incremental Model Updates
Updates models when user provides feedback
"""

import json
import pickle
import os
import argparse
import sys
from datetime import datetime
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
FEEDBACK_LOG = MODELS_DIR / "feedback_log.json"
METRICS_PATH = MODELS_DIR / "metrics.json"

def ensure_files():
    """Ensure models directory and log file exist"""
    os.makedirs(MODELS_DIR, exist_ok=True)
    if not os.path.exists(FEEDBACK_LOG):
        with open(FEEDBACK_LOG, 'w') as f:
            json.dump([], f)

def resolve_model_path(context, recipient):
    """Find the best available model using exact, context, then global fallback."""
    candidates = [
        f"{context}_{recipient}",
        f"{context}_general",
        "general_general"
    ]

    for key in candidates:
        model_path = os.path.join(MODELS_DIR, f"{key}.pkl")
        if os.path.exists(model_path):
            return model_path, key

    return None, None

def load_model(context, recipient):
    """Load model for (context, recipient) pair with fallbacks."""
    model_path, _ = resolve_model_path(context, recipient)

    if model_path is None:
        return None
    with open(model_path, 'rb') as f:
        return pickle.load(f)

def save_model(model, context, recipient):
    """Save model for (context, recipient) pair"""
    model_path = os.path.join(MODELS_DIR, f"{context}_{recipient}.pkl")
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)

def load_feedback_log():
    """Load feedback history"""
    ensure_files()
    with open(FEEDBACK_LOG, 'r') as f:
        return json.load(f)

def save_feedback_log(log):
    """Save feedback history"""
    with open(FEEDBACK_LOG, 'w') as f:
        json.dump(log, f, indent=2)

def update_feedback_metrics(context, recipient, feedback_log):
    """Keep progress metrics in sync even when model retraining is not triggered."""
    key = f"{context}_{recipient}"
    relevant_feedback = [
        f for f in feedback_log
        if f['context'] == context and f['recipient'] == recipient
    ]

    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH, 'r') as f:
            metrics = json.load(f)
    else:
        metrics = {}

    existing_metric = metrics.get(key, {})
    metrics[key] = {
        **existing_metric,
        "feedback_samples": len(relevant_feedback),
        "total_feedback": len(feedback_log),
        "last_feedback_at": datetime.utcnow().isoformat() + "Z"
    }

    with open(METRICS_PATH, 'w') as f:
        json.dump(metrics, f, indent=2)

    return len(relevant_feedback)

def add_feedback(suggestion, feedback, context, recipient, sentiment="neutral"):
    """
    Record user feedback and potentially trigger model update
    feedback: "helpful" or "not_helpful"
    """
    print(f"\n📊 Processing feedback: {context}/{recipient}")
    print(f"   Suggestion: {suggestion}")
    print(f"   Feedback: {feedback}")
    
    ensure_files()
    
    # Load and update feedback log
    feedback_log = load_feedback_log()
    
    feedback_entry = {
        "suggestion": suggestion,
        "feedback": feedback,
        "context": context,
        "recipient": recipient,
        "sentiment": sentiment,
        "helpful": feedback == "helpful"
    }
    feedback_log.append(feedback_entry)
    save_feedback_log(feedback_log)
    relevant_feedback_count = update_feedback_metrics(context, recipient, feedback_log)
    
    # Check if we should retrain (every 5 new feedback items)
    if len(feedback_log) % 5 == 0:
        print(f"   Trigger: Feedback threshold reached ({len(feedback_log)} total)")
        update_model(context, recipient, feedback_log)
    else:
        print(f"   Status: Feedback logged ({len(feedback_log)}/5 before next update)")
    
    return {
        "status": "recorded",
        "total_feedback": len(feedback_log),
        "feedback_samples": relevant_feedback_count,
        "next_update": 5 - (len(feedback_log) % 5)
    }

def update_model(context, recipient, feedback_log):
    """Retrain model with accumulated feedback"""
    print(f"\n   🔄 Retraining model for {context}/{recipient}...")
    
    # Filter feedback for this context/recipient
    relevant_feedback = [
        f for f in feedback_log 
        if f['context'] == context and f['recipient'] == recipient
    ]
    
    if len(relevant_feedback) < 2:
        print(f"   ⚠️  Insufficient feedback to retrain ({len(relevant_feedback)} samples)")
        return
    
    # Prepare data
    X = [f['suggestion'] for f in relevant_feedback]
    y = [1 if f['helpful'] else 0 for f in relevant_feedback]
    
    # Load existing model or create new one
    model = load_model(context, recipient)
    if model is None:
        print(f"   Creating new model...")
        model = Pipeline([
            ('tfidf', TfidfVectorizer(lowercase=True, stop_words='english', max_features=50)),
            ('classifier', MultinomialNB(alpha=0.1))
        ])
        model.fit(X, y)
    else:
        # Incremental update using partial_fit
        print(f"   Updating existing model...")
        model.named_steps['classifier'].partial_fit(
            model.named_steps['tfidf'].transform(X),
            y,
            classes=[0, 1]
        )
    
    # Save updated model
    save_model(model, context, recipient)
    
    # Evaluate and update metrics
    y_pred = model.predict(X)
    accuracy = sum(1 for i in range(len(y)) if y[i] == y_pred[i]) / len(y)
    
    # Update metrics
    metrics_path = METRICS_PATH
    if os.path.exists(metrics_path):
        with open(metrics_path, 'r') as f:
            metrics = json.load(f)
    else:
        metrics = {}
    
    key = f"{context}_{recipient}"
    existing_metric = metrics.get(key, {})
    metrics[key] = {
        **existing_metric,
        "status": "updated",
        "feedback_samples": len(relevant_feedback),
        "accuracy": float(accuracy),
        "total_feedback": len(feedback_log),
        "last_updated": datetime.utcnow().isoformat() + "Z"
    }
    
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    
    print(f"   ✅ Model updated! Accuracy: {accuracy:.2f}")

def predict_suggestion_helpfulness(suggestion, context, recipient):
    """Predict if a suggestion will be helpful for given context/recipient"""
    model_path, model_key = resolve_model_path(context, recipient)
    
    if model_path is None:
        # No model trained for this combination yet
        return {
            "prediction": None,
            "confidence": None,
            "status": "no_model",
            "message": f"No model trained for {context}/{recipient} yet"
        }
    
    try:
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        # Predict
        prediction = model.predict([suggestion])[0]
        probabilities = model.predict_proba([suggestion])[0]
        confidence = float(max(probabilities))
        
        return {
            "prediction": "helpful" if prediction == 1 else "not_helpful",
            "confidence": confidence,
            "status": "success",
            "model_key": model_key,
            "score": float(probabilities[1]) if len(probabilities) > 1 else float(prediction),
            "helpful": bool(prediction == 1)
        }
    except Exception as e:
        return {
            "prediction": None,
            "confidence": None,
            "status": "error",
            "message": str(e)
        }

def rank_suggestions(suggestions, context, recipient):
    """Rank generated suggestions using the context/recipient model."""
    ranked = []

    for index, suggestion in enumerate(suggestions):
        suggestion_text = suggestion.get("improved") or suggestion.get("suggestion") or ""
        prediction = predict_suggestion_helpfulness(suggestion_text, context, recipient)
        score = prediction.get("score")

        ranked.append({
            **suggestion,
            "mlScore": score,
            "mlPrediction": prediction.get("prediction"),
            "mlConfidence": prediction.get("confidence"),
            "mlStatus": prediction.get("status"),
            "mlModelKey": prediction.get("model_key"),
            "_originalIndex": index
        })

    # Preserve LLM order when no model exists or prediction fails. Otherwise,
    # move likely helpful suggestions upward and likely unhelpful suggestions down.
    def sort_key(item):
        if item.get("mlStatus") != "success" or item.get("mlScore") is None:
            return (1, item["_originalIndex"])
        return (0, -item["mlScore"], item["_originalIndex"])

    ranked.sort(key=sort_key)

    for item in ranked:
        item.pop("_originalIndex", None)

    return {
        "status": "success",
        "context": context,
        "recipient": recipient,
        "suggestions": ranked
    }

def print_json(payload):
    """Write machine-readable output for the Node.js wrapper."""
    print(json.dumps(payload, ensure_ascii=False))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Online learning helper")
    parser.add_argument("--action", choices=["add-feedback", "predict", "rank-suggestions"], required=True)
    parser.add_argument("--payload", required=True, help="JSON payload for the selected action")
    args = parser.parse_args()

    try:
        payload = json.loads(args.payload)

        if args.action == "add-feedback":
            result = add_feedback(
                suggestion=payload["suggestion"],
                feedback=payload["feedback"],
                context=payload["context"],
                recipient=payload["recipient"],
                sentiment=payload.get("sentiment", "neutral")
            )
        elif args.action == "predict":
            result = predict_suggestion_helpfulness(
                suggestion=payload["suggestion"],
                context=payload["context"],
                recipient=payload["recipient"]
            )
        else:
            result = rank_suggestions(
                suggestions=payload.get("suggestions", []),
                context=payload["context"],
                recipient=payload["recipient"]
            )

        print_json(result)
    except Exception as exc:
        print_json({"status": "error", "message": str(exc)})
        sys.exit(1)
