/**
 * P1: Suggestion Service
 * Handles API calls for applying suggestions
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

/**
 * Apply a single suggestion to the text
 * @param {string} originalText - The full message text
 * @param {object} suggestion - The suggestion object with original and improved
 * @returns {Promise} - Updated text
 */
export const applySuggestion = async (originalText, suggestion) => {
  try {
    const response = await fetch(`${API_BASE}/api/apply-suggestion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        originalText,
        suggestion
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Provide more helpful error message
      let errorMessage = errorData.error || 'Failed to apply suggestion';
      if (errorData.suggestion) {
        errorMessage += `\n\nTip: The text "${errorData.suggestion}" was not found. This often happens when previous suggestions have already modified the text. Try analyzing again to get fresh suggestions.`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.updatedText;

  } catch (error) {
    console.error('Error applying suggestion:', error);
    throw error;
  }
};

/**
 * Apply multiple suggestions to the text in sequence
 * @param {string} originalText - The full message text
 * @param {array} suggestions - Array of suggestion objects
 * @returns {Promise} - Updated text and results
 */
export const applySuggestionsBatch = async (originalText, suggestions) => {
  try {
    const response = await fetch(`${API_BASE}/api/apply-suggestions-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        originalText,
        suggestions
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to apply batch suggestions');
    }

    const data = await response.json();
    return {
      updatedText: data.updatedText,
      appliedCount: data.appliedCount,
      failedSuggestions: data.failedSuggestions
    };

  } catch (error) {
    console.error('Error applying batch suggestions:', error);
    throw error;
  }
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * P2: Generate improved version of the message
 * @param {string} originalText - The original message text
 * @param {array} suggestions - Array of suggestion objects to apply
 * @param {boolean} polish - Whether to polish the text with LLM
 * @returns {Promise} - Improved text
 */
export const generateImprovedVersion = async (originalText, suggestions, polish = true) => {
  try {
    const response = await fetch(`${API_BASE}/api/generate-improved-version`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        originalText,
        suggestions,
        polish
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate improved version');
    }

    const data = await response.json();
    return {
      improvedText: data.improvedText,
      suggestionsApplied: data.suggestionsApplied
    };

  } catch (error) {
    console.error('Error generating improved version:', error);
    throw error;
  }
};
