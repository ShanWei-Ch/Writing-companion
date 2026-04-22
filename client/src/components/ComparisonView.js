/**
 * P1: ComparisonView Component
 * Shows original vs improved text in side-by-side format
 * Allows user to apply or copy the improved version
 */

import React from 'react';
import './ComparisonView.css';

function ComparisonView({ 
  original, 
  improved, 
  explanation, 
  onApply, 
  onCopy,
  suggestion 
}) {
  const handleApplyClick = () => {
    if (onApply) {
      onApply(suggestion);
    }
  };

  return (
    <div className="comparison-view">
      <div className="comparison-container">
        {/* Left side: Original */}
        <div className="comparison-side original">
          <h4>Original</h4>
          <div className="comparison-text">
            {original}
          </div>
        </div>

        {/* Right side: Improved */}
        <div className="comparison-side improved">
          <h4>Improved</h4>
          <div className="comparison-text highlight">
            {improved}
          </div>
        </div>
      </div>

      {/* Explanation */}
      {explanation && (
        <div className="comparison-explanation">
          <strong>Why:</strong> {explanation}
        </div>
      )}

      {/* Action buttons */}
      <div className="comparison-actions">
        <button 
          className="btn-apply"
          onClick={handleApplyClick}
          title="Replace the original text in your message"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

export default ComparisonView;
