/**
 * ReactionPrediction Component
 * Displays recipient reaction prediction and communication effectiveness scores
 */

import React from 'react';
import './ReactionPrediction.css';

function ReactionPrediction({ reactionPrediction }) {
  if (!reactionPrediction || !reactionPrediction.success) {
    return null;
  }

  const {
    likelyReaction,
    reactionExplanation,
    effectivenessScores = {},
    clarityDetails,
    empathyDetails,
    actionabilityDetails,
    recipientSpecificTips,
    riskLevel,
    riskFactors = []
  } = reactionPrediction;

  const getReactionColor = (reaction) => {
    const map = {
      'positive': 'positive',
      'neutral': 'neutral',
      'defensive': 'warning',
      'negative': 'negative'
    };
    return map[reaction] || 'neutral';
  };

  const getRiskColor = (risk) => {
    const map = {
      'low': 'positive',
      'medium': 'warning',
      'high': 'negative'
    };
    return map[risk] || 'warning';
  };

  const clarity = effectivenessScores.clarity || 0;
  const empathy = effectivenessScores.empathy || 0;
  const actionability = effectivenessScores.actionability || 0;
  const average = Math.round((clarity + empathy + actionability) / 3);

  return (
    <div className="reaction-prediction-container">
      <h3>Recipient Reaction Prediction</h3>

      {/* Likely Reaction Card */}
      <div className={`reaction-card reaction-${getReactionColor(likelyReaction)}`}>
        <div className="reaction-header">
          <div className="reaction-info">
            <h4 className="reaction-title">Likely Reaction</h4>
            <p className="reaction-type">{likelyReaction.toUpperCase()}</p>
          </div>
        </div>
        <p className="reaction-explanation">{reactionExplanation}</p>
      </div>

      {/* Effectiveness Scores */}
      <div className="effectiveness-scores">
        <h4>Communication Effectiveness Scores</h4>
        
        <div className="scores-grid">
          {/* Clarity Score */}
          <div className="score-item">
            <div className="score-header">
              <span className="score-label">Clarity</span>
              <span className="score-value">{clarity}/100</span>
            </div>
            <div className="score-bar">
              <div className="score-fill" style={{ width: `${clarity}%` }}></div>
            </div>
            <p className="score-detail">{clarityDetails}</p>
          </div>

          {/* Empathy Score */}
          <div className="score-item">
            <div className="score-header">
              <span className="score-label">Empathy</span>
              <span className="score-value">{empathy}/100</span>
            </div>
            <div className="score-bar">
              <div className="score-fill" style={{ width: `${empathy}%` }}></div>
            </div>
            <p className="score-detail">{empathyDetails}</p>
          </div>

          {/* Actionability Score */}
          <div className="score-item">
            <div className="score-header">
              <span className="score-label">Actionability</span>
              <span className="score-value">{actionability}/100</span>
            </div>
            <div className="score-bar">
              <div className="score-fill" style={{ width: `${actionability}%` }}></div>
            </div>
            <p className="score-detail">{actionabilityDetails}</p>
          </div>

          {/* Overall Score */}
          <div className="score-item overall">
            <div className="score-header">
              <span className="score-label">Overall Effectiveness</span>
              <span className="score-value">{average}/100</span>
            </div>
            <div className="score-bar">
              <div className="score-fill" style={{ width: `${average}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      <div className={`risk-assessment risk-${getRiskColor(riskLevel)}`}>
        <div className="risk-header">
          <h4>Communication Risk Level</h4>
          <span className={`risk-badge risk-${getRiskColor(riskLevel)}`}>
            {riskLevel.toUpperCase()}
          </span>
        </div>
        
        {riskFactors && riskFactors.length > 0 && (
          <div className="risk-factors">
            <p className="risk-label">Identified Risk Factors:</p>
            <ul className="risk-list">
              {riskFactors.map((factor, idx) => (
                <li key={idx}>{factor}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recipient-Specific Tips */}
      {recipientSpecificTips && (
        <div className="recipient-tips">
          <h4>Recipient-Specific Tip</h4>
          <p>{recipientSpecificTips}</p>
        </div>
      )}
    </div>
  );
}

export default ReactionPrediction;
