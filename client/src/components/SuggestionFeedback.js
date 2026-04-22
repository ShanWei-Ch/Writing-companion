/**
 * SuggestionFeedback Component
 * Allows users to rate suggestions as helpful/unhelpful, add notes, or report issues
 */

import React, { useState } from 'react';
import { submitSuggestionFeedback } from '../services/feedbackTemplateService';
import { submitMLFeedback } from '../services/mlService';
import './SuggestionFeedback.css';

function SuggestionFeedback({ suggestionId, context, recipient, suggestion, onFeedbackSubmitted }) {
  const [feedbackMode, setFeedbackMode] = useState(null);
  const [customNote, setCustomNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = async (type) => {
    try {
      setLoading(true);
      
      await submitSuggestionFeedback(
        suggestionId,
        type,
        type === 'note' ? customNote : type === 'report' ? customNote : '',
        context,
        recipient
      );

      // Also record feedback to ML system if helpful/unhelpful
      if ((type === 'helpful' || type === 'unhelpful') && suggestion) {
        try {
          await submitMLFeedback(
            suggestion,
            type === 'helpful' ? 'helpful' : 'not_helpful',
            context,
            recipient
          );
          console.log('[Feedback] ML model feedback recorded');
        } catch (err) {
          console.error('[Feedback] Failed to record ML feedback:', err);
        }
      }

      setSubmitted(true);
      setFeedbackMode(null);
      setCustomNote('');
      
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(type);
      }

      // Reset submitted state after 2 seconds
      setTimeout(() => setSubmitted(false), 2000);
    } catch (err) {
      console.error('Feedback submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="suggestion-feedback-submitted">
        Feedback submitted
      </div>
    );
  }

  return (
    <div className="suggestion-feedback">
      {feedbackMode === null && (
        <div className="feedback-buttons">
          <button
            className="feedback-btn feedback-helpful"
            onClick={() => handleFeedback('helpful')}
            disabled={loading}
            title="This suggestion helped me"
          >
            Helpful
          </button>
          <button
            className="feedback-btn feedback-unhelpful"
            onClick={() => handleFeedback('unhelpful')}
            disabled={loading}
            title="This suggestion doesn't apply"
          >
            Not helpful
          </button>
          <button
            className="feedback-btn feedback-note"
            onClick={() => setFeedbackMode('note')}
            disabled={loading}
            title="Add a note about this suggestion"
          >
            Note
          </button>
          <button
            className="feedback-btn feedback-report"
            onClick={() => setFeedbackMode('report')}
            disabled={loading}
            title="Report an issue"
          >
            Report
          </button>
        </div>
      )}

      {feedbackMode === 'note' && (
        <div className="feedback-input-section">
          <input
            type="text"
            placeholder="e.g., This works better for formal emails..."
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            className="feedback-input"
          />
          <div className="feedback-actions">
            <button 
              onClick={() => handleFeedback('note')}
              disabled={!customNote.trim() || loading}
              className="btn-submit"
            >
              Save Note
            </button>
            <button 
              onClick={() => {
                setFeedbackMode(null);
                setCustomNote('');
              }}
              className="btn-cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {feedbackMode === 'report' && (
        <div className="feedback-input-section">
          <input
            type="text"
            placeholder="e.g., This suggestion contradicts the recipient preference..."
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            className="feedback-input"
          />
          <div className="feedback-actions">
            <button 
              onClick={() => handleFeedback('report')}
              disabled={!customNote.trim() || loading}
              className="btn-submit"
            >
              Report Issue
            </button>
            <button 
              onClick={() => {
                setFeedbackMode(null);
                setCustomNote('');
              }}
              className="btn-cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuggestionFeedback;
