/**
 * Frontend ML Service
 * Calls ML API endpoints
 */

import axios from 'axios';

const API_BASE = '/api/ml';

/**
 * Initialize ML system (train models)
 */
export async function initializeMLSystem() {
  try {
    const response = await axios.post(`${API_BASE}/init`);
    return response.data;
  } catch (error) {
    console.error('Failed to initialize ML system:', error.message);
    throw error;
  }
}

/**
 * Get model training progress
 */
export async function getMLProgress() {
  try {
    const response = await axios.get(`${API_BASE}/progress`);
    return response.data.data;
  } catch (error) {
    console.error('Failed to get ML progress:', error.message);
    return null;
  }
}

/**
 * Submit user feedback (helpful/not helpful)
 */
export async function submitMLFeedback(suggestion, feedback, context, recipient, sentiment = 'neutral') {
  try {
    const response = await axios.post(`${API_BASE}/feedback`, {
      suggestion,
      feedback,
      context,
      recipient,
      sentiment
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ml-feedback-recorded', {
        detail: response.data
      }));
    }

    return response.data;
  } catch (error) {
    console.error('Failed to submit feedback:', error.message);
    throw error;
  }
}

/**
 * Get model metrics
 */
export async function getMLMetrics() {
  try {
    const response = await axios.get(`${API_BASE}/metrics`);
    return response.data.data;
  } catch (error) {
    console.error('Failed to get ML metrics:', error.message);
    return null;
  }
}

/**
 * Get feedback history
 */
export async function getFeedbackHistory() {
  try {
    const response = await axios.get(`${API_BASE}/feedback-log`);
    return response.data.data;
  } catch (error) {
    console.error('Failed to get feedback history:', error.message);
    return null;
  }
}

/**
 * Check ML system health
 */
export async function checkMLHealth() {
  try {
    const response = await axios.get(`${API_BASE}/health`);
    return response.data;
  } catch (error) {
    console.error('Failed to check ML health:', error.message);
    return { status: 'unhealthy' };
  }
}
