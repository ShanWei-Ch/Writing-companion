/**
 * P2: Generate Improved Version Route
 * Handles generating an improved version of the message with applied suggestions
 */

const express = require('express');
const router = express.Router();

/**
 * Helper function to apply suggestions to text
 */
function applySuggestionsToText(text, suggestions) {
  let result = text;
  
  for (const suggestion of suggestions) {
    if (!suggestion.original || !suggestion.improved) continue;
    
    // Normalize whitespace for matching
    const normalizedText = result.replace(/\s+/g, ' ');
    const normalizedOriginal = suggestion.original.replace(/\s+/g, ' ');
    
    // Case-insensitive matching and replacement
    const regex = new RegExp(
      normalizedOriginal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i'
    );
    
    if (regex.test(normalizedText)) {
      result = result.replace(regex, suggestion.improved);
    }
  }
  
  return result;
}

/**
 * Helper function to polish text with LLM
 */
async function polishTextWithLLM(text) {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama2',
        prompt: `You are an expert proofreader. Polish the following text for better flow, grammar, and readability. 
Keep the exact meaning and content unchanged. Only improve grammar, flow, and clarity.

Text to polish:
"""${text}"""

Return only the polished text. No explanation or markdown.`
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP error: ${response.status}`);
    }

    // Handle NDJSON stream
    let result = '';
    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let { value, done } = await reader.read();
    let buffer = '';

    while (!done) {
      buffer += decoder.decode(value, { stream: true });
      let lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.trim()) {
          try {
            const json = JSON.parse(line);
            if (json.response) result += json.response;
          } catch (e) {
            // ignore
          }
        }
      }
      ({ value, done } = await reader.read());
    }

    if (buffer.trim()) {
      try {
        const json = JSON.parse(buffer);
        if (json.response) result += json.response;
      } catch (e) {
        // ignore
      }
    }

    return result.trim();
  } catch (err) {
    console.error('Error polishing text with LLM:', err);
    // If LLM fails, return the original text
    return text;
  }
}

/**
 * POST /api/generate-improved-version
 * Generates an improved version of the message with selected suggestions applied
 * 
 * Request body:
 * {
 *   originalText: "full message text",
 *   suggestions: [
 *     { original: "phrase", improved: "better phrase", explanation: "why" },
 *     ...
 *   ],
 *   polish: true  // whether to use LLM to polish the text
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   originalText: "original message",
 *   improvedText: "improved message with suggestions applied and polished"
 * }
 */
router.post('/generate-improved-version', async (req, res) => {
  try {
    const { originalText, suggestions, polish = false } = req.body;

    // Validate input
    if (!originalText || typeof originalText !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'originalText is required and must be a string'
      });
    }

    if (!Array.isArray(suggestions)) {
      return res.status(400).json({
        success: false,
        error: 'suggestions must be an array'
      });
    }

    // Step 1: Apply all suggestions to the text
    let improvedText = applySuggestionsToText(originalText, suggestions);

    // Step 2: Polish with LLM (optional, default false)
    if (polish && suggestions.length > 0) {
      improvedText = await polishTextWithLLM(improvedText);
    }

    res.json({
      success: true,
      originalText,
      improvedText,
      suggestionsApplied: suggestions.length
    });

  } catch (error) {
    console.error('Generate improved version error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate improved version'
    });
  }
});

module.exports = router;
