/**
 * Feedback Routes
 * Handle user feedback on suggestions and track helpful/unhelpful ratings
 */

const express = require('express');
const router = express.Router();

// In-memory storage for feedback (in production, use database)
let feedbackStore = {};

// Submit feedback on a suggestion
// POST /api/feedback/suggestion
router.post('/suggestion', (req, res) => {
  try {
    const { suggestionId, type, message, context, recipient } = req.body;
    
    if (!suggestionId || !type) {
      return res.status(400).json({ error: 'Missing suggestionId or type' });
    }

    const feedbackKey = `${context || 'general'}_${recipient || 'general'}_${suggestionId}`;
    
    if (!feedbackStore[feedbackKey]) {
      feedbackStore[feedbackKey] = {
        helpful: 0,
        unhelpful: 0,
        notes: [],
        reports: []
      };
    }

    const feedback = feedbackStore[feedbackKey];

    switch(type) {
      case 'helpful':
        feedback.helpful += 1;
        break;
      case 'unhelpful':
        feedback.unhelpful += 1;
        break;
      case 'note':
        feedback.notes.push({
          message,
          timestamp: new Date().toISOString()
        });
        break;
      case 'report':
        feedback.reports.push({
          message,
          timestamp: new Date().toISOString()
        });
        break;
      default:
        return res.status(400).json({ error: 'Invalid feedback type' });
    }

    res.json({
      success: true,
      feedbackKey,
      feedback
    });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// Get feedback stats
// GET /api/feedback/stats
router.get('/stats', (req, res) => {
  try {
    const { context, recipient } = req.query;
    const feedbackKey = `${context || 'general'}_${recipient || 'general'}`;
    
    const contextFeedback = {};
    
    // Filter feedback by context/recipient if specified
    Object.keys(feedbackStore).forEach(key => {
      if (!context || key.includes(context)) {
        contextFeedback[key] = feedbackStore[key];
      }
    });

    res.json({
      success: true,
      feedback: contextFeedback,
      total: Object.keys(contextFeedback).length
    });
  } catch (err) {
    console.error('Get feedback error:', err);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

module.exports = router;
