const express = require('express');
const router = express.Router();
const { analyzeMessage, analyzeWithOllama } = require('../services/analysisService');
const { predictReaction } = require('../services/reactionPredictionService');
const mlService = require('../services/mlService');

/**
 * POST /api/analyze
 * Analyzes user's input message
 * 
 * Request body:
 * {
 *   text: "User input text"
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   analysis: {
 *     sentimentScore: "Positive/Negative/Neutral",
 *     conflictPhrases: [],
 *     suggestions: [],
 *     messageLength: number,
 *     wordCount: number
 *   }
 * }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { text, context, recipient } = req.body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string'
      });
    }
    if (!context || !recipient) {
      return res.status(400).json({
        success: false,
        error: 'Context and recipient are required'
      });
    }

    // Prevent excessively long inputs (max 5000 characters)
    if (text.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Message too long. Maximum 5000 characters allowed.'
      });
    }

    const analysis = analyzeMessage(text, context, recipient);

    // Call LLM and reaction prediction after local analysis so the LLM can use local tone guidance.
    const [llmAnalysis, reactionPrediction] = await Promise.all([
      analyzeWithOllama(text, context, recipient, analysis.localTone),
      predictReaction(text, context, recipient)
    ]);

    if (llmAnalysis && Array.isArray(llmAnalysis.suggestions) && llmAnalysis.suggestions.length > 0) {
      const ranked = await mlService.rankSuggestions(llmAnalysis.suggestions, context, recipient, analysis.localTone);
      llmAnalysis.suggestions = ranked.suggestions;
      llmAnalysis.mlRanking = {
        status: ranked.status,
        mode: ranked.rankingMode,
        context,
        recipient,
        message: ranked.message
      };
    }

    analysis.llmAnalysis = llmAnalysis;
    analysis.reactionPrediction = reactionPrediction;

    // Return success response
    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze message'
    });
  }
});

module.exports = router;
