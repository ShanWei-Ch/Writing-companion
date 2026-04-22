/**
 * Utility functions for text processing
 */

/**
 * Extract sentences from text
 * @param {string} text - Input text
 * @returns {array} Array of sentences
 */
function getSentences(text) {
  return text
    .split(/[。！？!?.\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Calculate text readability score (simplified version)
 * @param {string} text - Input text
 * @returns {number} Readability score 0-100
 */
function getReadabilityScore(text) {
  const sentences = getSentences(text);
  const words = text.split(/\s+/).length;
  const avgWordsPerSentence = words / (sentences.length || 1);

  // Simple readability algorithm
  // Ideal sentence length is 10-20 words
  if (avgWordsPerSentence < 5) return 80; // Too concise
  if (avgWordsPerSentence < 15) return 95; // Ideal
  if (avgWordsPerSentence < 25) return 80; // Slightly long
  return 60; // Too long and complex
}

/**
 * Detect excessive uppercase letters (may indicate anger)
 * @param {string} text - Input text
 * @returns {boolean} Whether excessive caps are used
 */
function hasExcessiveCaps(text) {
  const capsWords = text.match(/\b[A-Z]{2,}\b/g) || [];
  const totalWords = text.split(/\s+/).length;
  return (capsWords.length / totalWords) > 0.1; // More than 10%
}

/**
 * Detect excessive exclamation marks
 * @param {string} text - Input text
 * @returns {number} Number of exclamation marks
 */
function countExclamations(text) {
  return (text.match(/!/g) || []).length;
}

/**
 * Detect excessive periods (may indicate coldness)
 * @param {string} text - Input text
 * @returns {number} Number of consecutive periods
 */
function countConsecutivePeriods(text) {
  const matches = text.match(/\.{2,}/g) || [];
  return matches.length;
}

module.exports = {
  getSentences,
  getReadabilityScore,
  hasExcessiveCaps,
  countExclamations,
  countConsecutivePeriods
};
