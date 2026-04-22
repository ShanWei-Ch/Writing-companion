/**
 * ML API Routes
 * /api/ml/* endpoints for training, prediction, and learning
 */

const express = require('express');
const mlService = require('../services/mlService');

const router = express.Router();

/**
 * Initialize and train models
 * POST /api/ml/init
 */
router.post('/ml/init', async (req, res) => {
  try {
    const force = req.query.force === 'true' || req.body?.force === true;
    console.log(force ? '[API] ML force initialization requested' : '[API] ML initialization requested');
    const result = await mlService.trainModels({ force });
    res.json({
      status: 'success',
      message: result.message,
      skipped: result.skipped,
      initializationStatus: result.initializationStatus,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[API] Training error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to train models',
      error: err.message
    });
  }
});

/**
 * Get model training progress
 * GET /api/ml/progress
 */
router.get('/ml/progress', (req, res) => {
  try {
    const progress = mlService.getTrainingProgress();
    res.json({
      status: 'success',
      data: progress
    });
  } catch (err) {
    console.error('[API] Progress error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get training progress',
      error: err.message
    });
  }
});

/**
 * Record user feedback and trigger online learning
 * POST /api/ml/feedback
 */
router.post('/ml/feedback', async (req, res) => {
  try {
    const { suggestion, feedback, context, recipient, sentiment } = req.body;

    if (!suggestion || !feedback || !context || !recipient) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: suggestion, feedback, context, recipient'
      });
    }

    console.log(`[API] Feedback received: ${context}/${recipient} - ${feedback}`);

    const result = await mlService.recordFeedback(
      suggestion,
      feedback,
      context,
      recipient,
      sentiment || 'neutral'
    );

    res.json({
      status: 'success',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[API] Feedback error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to record feedback',
      error: err.message
    });
  }
});

/**
 * Get model metrics
 * GET /api/ml/metrics
 */
router.get('/ml/metrics', (req, res) => {
  try {
    const result = mlService.getMetrics();
    res.json({
      status: 'success',
      data: result
    });
  } catch (err) {
    console.error('[API] Metrics error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get metrics',
      error: err.message
    });
  }
});

/**
 * Get feedback log
 * GET /api/ml/feedback-log
 */
router.get('/ml/feedback-log', (req, res) => {
  try {
    const result = mlService.getFeedbackLog();
    res.json({
      status: 'success',
      data: result
    });
  } catch (err) {
    console.error('[API] Feedback log error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get feedback log',
      error: err.message
    });
  }
});

/**
 * Health check for ML service
 * GET /api/ml/health
 */
router.get('/ml/health', (req, res) => {
  try {
    const progress = mlService.getTrainingProgress();
    res.json({
      status: 'healthy',
      ml_ready: progress.trained,
      data: progress
    });
  } catch (err) {
    res.status(500).json({
      status: 'unhealthy',
      error: err.message
    });
  }
});

module.exports = router;
