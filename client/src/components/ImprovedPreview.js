/**
 * P2: ImprovedPreview Component
 * Shows original message vs improved version with selectable suggestions
 */

import React, { useState, useEffect, useCallback } from 'react';
import './ImprovedPreview.css';

function ImprovedPreview({
  originalText,
  suggestions,
  improvedText,
  onAccept,
  onDecline,
  loading = false
}) {
  const [selectedSuggestions, setSelectedSuggestions] = useState(
    Object.fromEntries(suggestions.map((_, idx) => [idx, true]))
  );
  const [editedImprovedText, setEditedImprovedText] = useState(improvedText);

  // Helper function to apply selected suggestions to original text
  const applySelectedSuggestions = useCallback((text, selected) => {
    let result = text;
    
    for (let idx = 0; idx < suggestions.length; idx++) {
      if (!selected[idx]) continue; // Skip unselected suggestions
      
      const suggestion = suggestions[idx];
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
  }, [suggestions]);

  // Update improved version when selected suggestions change
  useEffect(() => {
    const updatedText = applySelectedSuggestions(originalText, selectedSuggestions);
    setEditedImprovedText(updatedText);
  }, [selectedSuggestions, originalText, applySelectedSuggestions]);

  const toggleSuggestion = (index) => {
    setSelectedSuggestions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleAccept = () => {
    onAccept(editedImprovedText);
  };

  const selectedCount = Object.values(selectedSuggestions).filter(Boolean).length;

  return (
    <div className="improved-preview-overlay">
      <div className="improved-preview-modal">
        <h2>Preview Improved Version</h2>

        <div className="preview-content">
          {/* Left: Original Text */}
          <div className="preview-section original-section">
            <h3>Original</h3>
            <div className="preview-text">
              {originalText}
            </div>
          </div>

          {/* Middle: Suggestions List */}
          <div className="preview-section suggestions-section">
            <h3>Suggestions to Apply ({selectedCount}/{suggestions.length})</h3>
            <div className="suggestions-list">
              {suggestions.length === 0 ? (
                <p className="no-suggestions">No suggestions to apply</p>
              ) : (
                suggestions.map((suggestion, idx) => (
                  <div key={idx} className="suggestion-checkbox-item">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedSuggestions[idx]}
                        onChange={() => toggleSuggestion(idx)}
                        className="suggestion-checkbox"
                      />
                      <div className="checkbox-content">
                        <div className="suggestion-text-pair">
                          <span className="original">{suggestion.original}</span>
                          <span className="arrow">→</span>
                          <span className="improved">{suggestion.improved}</span>
                        </div>
                        <p className="explanation">{suggestion.explanation}</p>
                      </div>
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Improved Text (Editable) */}
          <div className="preview-section improved-section">
            <h3>Improved Version</h3>
            <textarea
              className="preview-text-edit"
              value={editedImprovedText}
              onChange={(e) => setEditedImprovedText(e.target.value)}
              placeholder="Edit the improved text if needed..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="preview-actions">
          <button
            className="btn-decline"
            onClick={onDecline}
            disabled={loading}
          >
            Decline
          </button>
          <button
            className="btn-accept"
            onClick={handleAccept}
            disabled={loading}
          >
            Accept
          </button>
        </div>

        {loading && (
          <div className="preview-loading">
            <p>Generating improved version...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImprovedPreview;
