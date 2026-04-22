import React, { useState, useEffect } from 'react';
import './MLLearningProgress.css';
import { getMLProgress, checkMLHealth } from '../services/mlService';

function MLLearningProgress() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const checkProgress = async () => {
      try {
        const progressData = await getMLProgress();
        const healthData = await checkMLHealth();
        
        if (progressData) {
          setProgress(progressData);
        }
        if (healthData) {
          setHealth(healthData);
        }
      } catch (error) {
        console.error('Failed to fetch ML progress:', error);
      } finally {
        setLoading(false);
      }
    };

    checkProgress();
    // Refresh every 10 seconds
    window.addEventListener('ml-feedback-recorded', checkProgress);
    const interval = setInterval(checkProgress, 10000);
    return () => {
      window.removeEventListener('ml-feedback-recorded', checkProgress);
      clearInterval(interval);
    };
  }, []);

  if (loading || !progress || !health) {
    return null;
  }

  if (!progress.trained) {
    return (
      <div className="ml-learning-progress">
        <div className="ml-status initializing">
          <span className="ml-status-dot"></span>
          <span className="ml-status-text">Initializing ML system...</span>
        </div>
      </div>
    );
  }

  const percentage = progress.progress_percentage || 0;
  const trainedCount = progress.models_trained || 0;
  const totalCount = progress.models_total || 0;
  const metricsEntries = Object.entries(progress.metrics || {});
  const scenarioModels = metricsEntries.filter(([key]) => !key.endsWith('_general') || key === 'general_general')
    .filter(([key]) => key !== 'general_general');
  const fallbackModels = metricsEntries.filter(([key]) => key.endsWith('_general') || key === 'general_general');

  const formatModelName = (key) => key
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' / ');

  const renderModelCard = ([key, metric]) => (
    <div key={key} className={`ml-model-item ${metric.status}`}>
      <span className="ml-model-name">{formatModelName(key)}</span>
      <span className="ml-model-key">{key}</span>
      <span className="ml-model-status">
        {metric.status === 'trained' && 'Trained'}
        {metric.status === 'updated' && 'Updated'}
        {metric.status === 'failed' && 'Failed'}
      </span>
      {metric.samples && (
        <span className="ml-model-samples">{metric.samples} seed samples</span>
      )}
      {metric.feedback_samples && (
        <span className="ml-model-samples">{metric.feedback_samples} feedback samples</span>
      )}
      {typeof metric.f1 === 'number' && (
        <span className="ml-model-score">Seed fit: {metric.f1.toFixed(2)}</span>
      )}
      {typeof metric.accuracy === 'number' && (
        <span className="ml-model-score">Online accuracy: {(metric.accuracy * 100).toFixed(0)}%</span>
      )}
    </div>
  );

  return (
    <div className="ml-learning-progress">
      <div className="ml-header">
        <button
          className="ml-toggle-btn"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <span className="ml-toggle-icon">{expanded ? '▼' : '▶'}</span>
          <span className="ml-title">Model Learning Progress</span>
        </button>
        <span className="ml-status-badge">
          {health?.ml_ready ? 'Active' : 'Loading'}
        </span>
      </div>

      <div className="ml-progress-bar-container">
        <div className="ml-progress-bar">
          <div
            className="ml-progress-fill"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <span className="ml-progress-text">
          {trainedCount}/{totalCount} models trained ({percentage}%)
        </span>
      </div>

      {expanded && (
        <div className="ml-models-detail">
          <div className="ml-model-group">
            <h4>Scenario Models ({scenarioModels.length})</h4>
            <div className="ml-models-grid">
              {scenarioModels.map(renderModelCard)}
            </div>
          </div>

          <div className="ml-model-group">
            <h4>Fallback Models ({fallbackModels.length})</h4>
            <div className="ml-models-grid">
              {fallbackModels.map(renderModelCard)}
            </div>
          </div>
        </div>
      )}

      {expanded && (
        <div className="ml-info">
          <p className="ml-info-text">
            Scenario models handle valid context/recipient pairs. Fallback models are used when an exact model is unavailable. Seed fit is measured on initialization data; user feedback updates these models over time.
          </p>
        </div>
      )}
    </div>
  );
}

export default MLLearningProgress;
