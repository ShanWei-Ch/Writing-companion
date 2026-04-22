/**
 * P1: Apply Suggestion Route
 * Handles applying selected suggestions to the original text
 */

const express = require('express');
const router = express.Router();

/**
 * Calculate similarity score between two strings (0-1)
 * Using Levenshtein distance algorithm
 */
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Get edit distance (Levenshtein distance) between two strings
 */
function getEditDistance(str1, str2) {
  const costs = [];
  
  for (let i = 0; i <= str1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= str2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[str2.length] = lastValue;
  }
  
  return costs[str2.length];
}

/**
 * POST /api/apply-suggestion
 * Applies a single suggestion to the text
 * 
 * Request body:
 * {
 *   originalText: "full message text",
 *   suggestion: {
 *     original: "phrase to replace",
 *     improved: "improved phrase",
 *     explanation: "why this is better"
 *   }
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   updatedText: "message with applied suggestion"
 * }
 */
router.post('/apply-suggestion', (req, res) => {
  try {
    const { originalText, suggestion } = req.body;

    // Validate input
    if (!originalText || typeof originalText !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'originalText is required and must be a string'
      });
    }

    if (!suggestion || !suggestion.original || !suggestion.improved) {
      return res.status(400).json({
        success: false,
        error: 'suggestion with original and improved fields is required'
      });
    }

    // Replace the original text with improved version
    // Use a multi-strategy matching approach
    let updatedText = originalText;
    let found = false;

    // Strategy 1: Exact match
    if (originalText.includes(suggestion.original)) {
      updatedText = originalText.replace(suggestion.original, suggestion.improved);
      found = true;
    } 
    
    // Strategy 2: Case-insensitive match
    if (!found) {
      const regex = new RegExp(
        suggestion.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i'
      );
      
      if (regex.test(originalText)) {
        updatedText = originalText.replace(regex, suggestion.improved);
        found = true;
      }
    }
    
    // Strategy 3: Normalize whitespace (multiple spaces become single space)
    if (!found) {
      const normalizedOriginal = suggestion.original.replace(/\s+/g, ' ').trim();
      const normalizedText = originalText.replace(/\s+/g, ' ');
      
      if (normalizedText.includes(normalizedOriginal)) {
        // Find and replace with proper whitespace handling
        const regex = new RegExp(
          normalizedOriginal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          'i'
        );
        updatedText = normalizedText.replace(regex, suggestion.improved);
        found = true;
      }
    }
    
    // Strategy 4: Fuzzy matching with partial words
    // Find long substrings that match (handles paraphrasing)
    if (!found && suggestion.original.length > 10) {
      const words = suggestion.original.split(/\s+/);
      const keyWords = words.filter(w => w.length > 3); // Words with 3+ chars
      
      if (keyWords.length > 0) {
        // Check if at least 70% of keywords are in the text
        const matchingKeywords = keyWords.filter(kw => 
          new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(originalText)
        );
        
        if (matchingKeywords.length / keyWords.length >= 0.7) {
          // Try to find and replace the closest match
          const regex = new RegExp(
            suggestion.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'),
            'i'
          );
          
          if (regex.test(originalText)) {
            updatedText = originalText.replace(regex, suggestion.improved);
            found = true;
          }
        }
      }
    }

    // If still not found, provide detailed debugging info
    if (!found) {
      // Extract potential matches from the text for debugging
      const originalWords = suggestion.original.split(/\s+/);
      const suggestions_ = [];
      
      for (let i = 0; i < originalText.length - 50; i++) {
        const snippet = originalText.substring(i, i + suggestion.original.length + 50);
        const similarity = calculateSimilarity(suggestion.original, snippet);
        if (similarity > 0.5) {
          suggestions_.push({
            snippet: snippet.substring(0, 50) + '...',
            similarity: (similarity * 100).toFixed(0) + '%'
          });
        }
      }

      return res.status(400).json({
        success: false,
        error: 'The suggestion text was not found in the original message',
        details: `Could not find: "${suggestion.original}" in the text.`,
        suggestion: suggestion.original,
        textLength: originalText.length,
        originalLength: suggestion.original.length,
        potentialMatches: suggestions_.slice(0, 3)
      });
    }

    res.json({
      success: true,
      updatedText,
      appliedSuggestion: suggestion
    });

  } catch (error) {
    console.error('Apply suggestion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply suggestion'
    });
  }
});

/**
 * POST /api/apply-suggestions-batch
 * Applies multiple suggestions to the text in sequence
 * 
 * Request body:
 * {
 *   originalText: "full message text",
 *   suggestions: [
 *     { original: "...", improved: "..." },
 *     { original: "...", improved: "..." }
 *   ]
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   updatedText: "message with all applied suggestions",
 *   appliedCount: 2,
 *   failedSuggestions: []
 * }
 */
router.post('/apply-suggestions-batch', (req, res) => {
  try {
    const { originalText, suggestions } = req.body;

    // Validate input
    if (!originalText || typeof originalText !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'originalText is required and must be a string'
      });
    }

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'suggestions must be a non-empty array'
      });
    }

    let updatedText = originalText;
    let appliedCount = 0;
    const failedSuggestions = [];

    // Apply each suggestion in sequence
    suggestions.forEach((suggestion, index) => {
      if (!suggestion.original || !suggestion.improved) {
        failedSuggestions.push({
          index,
          reason: 'Missing original or improved field'
        });
        return;
      }

      const regex = new RegExp(
        suggestion.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i'
      );

      if (regex.test(updatedText)) {
        updatedText = updatedText.replace(regex, suggestion.improved);
        appliedCount++;
      } else {
        failedSuggestions.push({
          index,
          original: suggestion.original,
          reason: 'Text not found in current message'
        });
      }
    });

    res.json({
      success: true,
      updatedText,
      appliedCount,
      failedSuggestions,
      totalAttempted: suggestions.length
    });

  } catch (error) {
    console.error('Apply batch suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply batch suggestions'
    });
  }
});

module.exports = router;
