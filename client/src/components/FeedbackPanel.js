import React from 'react';
import './FeedbackPanel.css';
import ComparisonView from './ComparisonView';
import ReactionPrediction from './ReactionPrediction';
import SuggestionFeedback from './SuggestionFeedback';

const CONTEXT_COACHING = {
  work_boss: {
    title: 'For Your Boss',
    guidance: 'Lead with impact, keep the request specific, and avoid emotional escalation.',
    focus: ['Business impact', 'Clear next step', 'Professional tone']
  },
  work_colleague: {
    title: 'For a Colleague',
    guidance: 'Keep the tone collaborative and make the next step easy to respond to.',
    focus: ['Shared goal', 'Specific ask', 'Respectful wording']
  },
  relationship_partner: {
    title: 'For Your Partner',
    guidance: 'Name the feeling, soften blame, and invite a conversation instead of a verdict.',
    focus: ['Warmth', 'I-statements', 'Room to respond']
  },
  friend_friend: {
    title: 'For a Friend',
    guidance: 'Stay honest and warm. Be direct without making the message feel like a judgment.',
    focus: ['Honesty', 'Warmth', 'Low pressure']
  },
  customer_service_customer: {
    title: 'For a Customer',
    guidance: 'Acknowledge the frustration, give a realistic next step, and avoid assigning blame.',
    focus: ['Acknowledgment', 'Timeline', 'Next step']
  },
  family_parent: {
    title: 'For a Parent',
    guidance: 'Show respect while naming your boundary or need clearly.',
    focus: ['Respect', 'Boundary', 'Calm wording']
  },
  family_child: {
    title: 'For a Child',
    guidance: 'Use simple language, explain the reason, and focus on behavior rather than character.',
    focus: ['Simple words', 'Reassurance', 'Clear expectation']
  },
  other_other: {
    title: 'For This Message',
    guidance: 'Keep the message clear, respectful, and specific enough for the recipient to act on.',
    focus: ['Clarity', 'Respect', 'Specific request']
  }
};

function formatStrategy(strategy) {
  return strategy ? strategy.replace(/_/g, ' ') : 'preserve tone and improve clarity';
}

function getCoachCard(context, recipient) {
  return CONTEXT_COACHING[`${context}_${recipient}`] || CONTEXT_COACHING.other_other;
}

function getSuggestionFitLabel(value) {
  if (typeof value !== 'number') return null;
  if (value >= 0.75) return 'Strong match';
  if (value >= 0.5) return 'Good match';
  return 'Light match';
}

function getSuggestionFitSummary(suggestion, analysis) {
  const combinedLabel = getSuggestionFitLabel(suggestion.combinedScore);
  const localFitLabel = getSuggestionFitLabel(suggestion.localFitScore);
  const mlFitLabel = suggestion.mlStatus === 'success' ? getSuggestionFitLabel(suggestion.mlScore) : null;
  const score = typeof suggestion.combinedScore === 'number'
    ? `${Math.round(suggestion.combinedScore * 100)}/100`
    : null;
  const model = suggestion.mlModelKey ? suggestion.mlModelKey.replace(/_/g, ' / ') : null;
  const risk = analysis.localTone?.topRisks?.[0]?.replace(/_/g, ' ');

  if (combinedLabel && score) {
    return `${combinedLabel} fit - ${score}${model ? ` - ${model}` : ''}`;
  }

  if (mlFitLabel) {
    return `${mlFitLabel} from feedback history${model ? ` - ${model}` : ''}`;
  }

  if (localFitLabel) {
    return `${localFitLabel} for the main tone risk${risk ? `: ${risk}` : ''}`;
  }

  if (risk) {
    return `Targets the main tone risk: ${risk}`;
  }

  return 'Baseline fit for this message';
}

function FeedbackPanel({ analysis, originalText, onApplySuggestion, onShowComparison, selectedSuggestions, setSelectedSuggestions, expandedSuggestion, setExpandedSuggestion, onPreviewImproved, context, recipient }) {
  // Use props passed from App.js instead of local state
  const getDimensionStatus = (name, value) => {
    const score = Math.round(value * 100);
    const statusMap = {
      blame: value >= 0.5 ? 'needs attention' : null,
      warmth: value <= 0.5 ? 'needs warmth' : null,
      respect: value <= 0.55 ? 'needs respect' : null,
      clarity: value <= 0.55 ? 'needs clarity' : null,
      directness: value >= 0.75 ? 'too direct' : null,
      intensity: value >= 0.65 ? 'high intensity' : null
    };

    return statusMap[name] ? { name, score, label: statusMap[name] } : null;
  };

  const notableDimensions = analysis.localTone
    ? Object.entries(analysis.localTone.dimensions)
      .map(([name, value]) => getDimensionStatus(name, value))
      .filter(Boolean)
    : [];
  const coachCard = getCoachCard(context, recipient);
  const topSuggestion = analysis.llmAnalysis?.suggestions?.[0] || analysis.suggestions?.[0];
  const topRisks = analysis.localTone?.topRisks || [];
  
  const toggleSuggestionSelection = (index) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSuggestions(newSelected);
  };

  const toggleComparisonExpanded = (index) => {
    setExpandedSuggestion(expandedSuggestion === index ? null : index);
  };

  return (
    <div className="feedback-panel">
      <h2>Analysis Results</h2>

      <div className="feedback-section coach-section">
        <h3>Communication Coach</h3>
        <div className="coach-card">
          <div>
            <p className="coach-title">{coachCard.title}</p>
            <p className="coach-guidance">{coachCard.guidance}</p>
          </div>
          <div className="coach-focus-list">
            {coachCard.focus.map(item => (
              <span key={item} className="coach-focus-chip">{item}</span>
            ))}
          </div>
        </div>
      </div>

      {analysis.localTone && (
        <div className="feedback-section journey-section">
          <h3>Message Journey</h3>
          <div className="journey-steps">
            <div className="journey-step">
              <span className="journey-marker">1</span>
              <span className="journey-kicker">Original Tone</span>
              <strong>{analysis.localTone.riskLevel} risk</strong>
              <span>{analysis.localTone.riskScore}/100</span>
            </div>
            <div className="journey-step">
              <span className="journey-marker">2</span>
              <span className="journey-kicker">Main Shift</span>
              <strong>{formatStrategy(analysis.localTone.recommendedStrategy)}</strong>
              <span>{topRisks.length > 0 ? topRisks.join(', ').replace(/_/g, ' ') : 'clarity'}</span>
            </div>
            <div className="journey-step">
              <span className="journey-marker">3</span>
              <span className="journey-kicker">Suggested Move</span>
              <strong>{topSuggestion ? topSuggestion.improved : 'Keep the current tone steady'}</strong>
              <span>{topSuggestion ? `From: ${topSuggestion.original}` : 'No major rewrite needed'}</span>
            </div>
          </div>
          {originalText && (
            <p className="journey-note">
              Current draft: {originalText.length > 120 ? `${originalText.slice(0, 120)}...` : originalText}
            </p>
          )}
        </div>
      )}

      {/* Reaction Prediction Component */}
      {analysis.reactionPrediction && (
        <ReactionPrediction reactionPrediction={analysis.reactionPrediction} />
      )}

      {analysis.localTone && (
        <div className="feedback-section">
          <h3>Local Tone Analysis</h3>
          <div className="llm-row">
            <strong>Risk:</strong> {analysis.localTone.riskLevel} ({analysis.localTone.riskScore}/100)
          </div>
          <div className="llm-row">
            <strong>Recommended strategy:</strong> {analysis.localTone.recommendedStrategy.replace(/_/g, ' ')}
          </div>
          <div className="llm-row">
            <strong>Needs attention:</strong>{' '}
            {notableDimensions.length === 0 ? (
              <span>No major tone dimension is out of range.</span>
            ) : (
              <ul className="llm-list">
                {notableDimensions.map(({ name, score, label }) => (
                  <li key={name}>{name}: {score}/100 ({label})</li>
                ))}
              </ul>
            )}
          </div>
          {analysis.localTone.signals && analysis.localTone.signals.length > 0 && (
            <div className="llm-row">
              <strong>Local conflict signals:</strong>
              <ul className="llm-list">
                {analysis.localTone.signals.map((signal, idx) => (
                  <li key={idx}>
                    {signal.matchedText || signal.text} - {signal.category}, severity {Math.round(signal.severity * 100)}%
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* LLM (Ollama) 分析區塊 */}
      {analysis.llmAnalysis && (
        <div className="feedback-section llm-analysis-section">
          <h3>AI Deep Analysis (Ollama)</h3>
          {/* LLM 總結 explanation 放在建議區塊上方 */}
          {analysis.llmAnalysis.explanation && (
            <div className="llm-summary-explanation">
              <strong>Summary:</strong> <span>
                {typeof analysis.llmAnalysis.explanation === 'string' 
                  ? analysis.llmAnalysis.explanation 
                  : (typeof analysis.llmAnalysis.explanation === 'object' && analysis.llmAnalysis.explanation.explanation)
                    ? analysis.llmAnalysis.explanation.explanation
                    : 'Analysis complete. Check suggestions above.'}
              </span>
            </div>
          )}
          {analysis.llmAnalysis.sentiment && (
            <div className="llm-row">
              <strong>Sentiment:</strong> {analysis.llmAnalysis.sentiment}
            </div>
          )}
          {analysis.llmAnalysis.conflictPhrases && analysis.llmAnalysis.conflictPhrases.length > 0 && (
            <div className="llm-row">
              <strong>Conflict Phrases:</strong>
              <ul className="llm-list">
                {analysis.llmAnalysis.conflictPhrases.map((phrase, idx) => (
                  <li key={idx}>{phrase}</li>
                ))}
              </ul>
            </div>
          )}
          {analysis.llmAnalysis.suggestions && analysis.llmAnalysis.suggestions.length > 0 && (
            <div className="llm-row">
              <strong>Suggestions:</strong>
              
              {/* Batch apply section */}
              {selectedSuggestions.size > 0 && (
                <div className="batch-action-section">
                  <p className="batch-info">
                    {selectedSuggestions.size} suggestion{selectedSuggestions.size > 1 ? 's' : ''} selected
                  </p>
                  <div className="batch-buttons">
                    <button className="btn-batch-apply" onClick={() => onShowComparison('batch')}>
                      Apply All Selected ({selectedSuggestions.size})
                    </button>
                    <button className="btn btn-preview" onClick={() => onPreviewImproved(Array.from(selectedSuggestions).map(idx => analysis.llmAnalysis.suggestions[idx]))}>
                      Preview
                    </button>
                  </div>
                </div>
              )}

              <ul className="llm-list">
                  {analysis.llmAnalysis.suggestions.map((s, idx) => (
                    <li key={idx} className="llm-suggestion-item">
                      {/* Checkbox for batch selection */}
                      <div className="suggestion-header">
                        <label className="checkbox-container">
                          <input
                            type="checkbox"
                            checked={selectedSuggestions.has(idx)}
                            onChange={() => toggleSuggestionSelection(idx)}
                            className="suggestion-checkbox"
                          />
                          <span className="checkbox-label">Select</span>
                        </label>
                        <button 
                          className="compare-btn"
                          onClick={() => toggleComparisonExpanded(idx)}
                        >
                          {expandedSuggestion === idx ? '[-] Hide' : '[+] Compare'}
                        </button>
                      </div>

                      {/* Inline summary */}
                      <div className="suggestion-summary">
                        <span className="original-text">{s.original}</span>
                        <span className="arrow">→</span>
                        <span className="improved-text">{s.improved}</span>
                      </div>

                      <div className="suggestion-fit">
                        <strong>Fit:</strong> {getSuggestionFitSummary(s, analysis)}
                      </div>
                      
                      {/* Context tag */}
                      {s.contextType && (
                        <div className="context-tag-wrapper">
                          <span className={`context-tag context-tag-${s.contextType}`}>
                            For {s.contextType === 'work' ? 'Workplace' : s.contextType === 'personal' ? 'Personal' : s.contextType === 'relationship' ? 'Relationship' : s.contextType}
                          </span>
                        </div>
                      )}

                      {/* Expanded comparison view */}
                      {expandedSuggestion === idx && (
                        <div className="suggestion-expanded">
                          <ComparisonView
                            original={s.original}
                            improved={s.improved}
                            explanation={s.explanation}
                            onApply={() => onApplySuggestion(s)}
                            suggestion={s}
                          />
                          
                          {/* P4: Suggestion Feedback */}
                          <SuggestionFeedback
                            suggestionId={`${s.original}-${idx}`}
                            context={context}
                            recipient={recipient}
                            suggestion={s.improved}
                            sentiment={analysis.llmAnalysis.sentiment}
                          />
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 只要有 LLM suggestions 就隱藏本地建議區塊 */}
      {!(analysis.llmAnalysis && analysis.llmAnalysis.suggestions && analysis.llmAnalysis.suggestions.length > 0) && (
        <div className="feedback-section">
          <h3>Suggestions for Improvement</h3>
          {analysis.suggestions && analysis.suggestions.length > 0 ? (
            <ul className="suggestions-list">
              {analysis.suggestions.map((suggestion, idx) => (
                <li key={idx} className="suggestion-item">
                  <strong>Instead of:</strong> {suggestion.original}
                  <br />
                  <strong>Try:</strong> {suggestion.improved}
                  <button
                    className="apply-suggestion-btn"
                    onClick={() => onApplySuggestion && onApplySuggestion(suggestion)}
                  >
                    Apply
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-issues">Your message looks good!</p>
          )}
        </div>
      )}
    </div>
  );
}

export default FeedbackPanel;
