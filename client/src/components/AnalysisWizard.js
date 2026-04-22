/**
 * AnalysisWizard Component
 * Step-by-step guided analysis mode
 * Steps: 1. Sentiment 2. Conflict 3. Empathy 4. Structure 5. Preview
 */

import React, { useState } from 'react';
import WizardStep from './WizardStep';
import './AnalysisWizard.css';

function AnalysisWizard({ analysis, onClose, onAccept }) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  if (!analysis) {
    return null;
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Finish - close and accept
      onAccept();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Step 1: Sentiment Analysis
  const renderSentimentStep = () => (
    <div className="sentiment-analysis">
      <div className="sentiment-box">
        <div className="sentiment-value">
          {analysis.sentimentDetails.sentiment}
        </div>
        <p className="sentiment-description">
          {analysis.sentimentDetails.sentiment === 'Positive' && 'Your message conveyed a positive tone that encourages receptiveness.'}
          {analysis.sentimentDetails.sentiment === 'Negative' && 'Your message may trigger defensiveness. Consider softening the tone.'}
          {analysis.sentimentDetails.sentiment === 'Neutral' && 'Your message maintains a neutral, professional tone.'}
        </p>
      </div>
      <div className="sentiment-tips">
        <h4>Tips to Improve Sentiment:</h4>
        <ul>
          <li>Use positive language to encourage collaboration</li>
          <li>Express understanding of the recipient's perspective</li>
          <li>Highlight shared goals and mutual benefits</li>
        </ul>
      </div>
    </div>
  );

  // Step 2: Conflict Phrases Detection
  const renderConflictStep = () => (
    <div className="conflict-analysis">
      {analysis.conflictPhrases && analysis.conflictPhrases.length > 0 ? (
        <>
          <p className="conflict-count">Found {analysis.conflictPhrases.length} potential conflict signal(s):</p>
          <ul className="conflict-list">
            {analysis.conflictPhrases.map((phrase, idx) => (
              <li key={idx} className="conflict-item">
                {typeof phrase === 'string' ? phrase : phrase.text}
                {typeof phrase === 'object' && phrase.severity && (
                  <span> - severity {Math.round(phrase.severity * 100)}%</span>
                )}
              </li>
            ))}
          </ul>
          <div className="conflict-tips">
            <h4>How to Address:</h4>
            <ul>
              <li>Replace accusatory language with "I" statements</li>
              <li>Avoid absolute words like "always" or "never"</li>
              <li>Focus on behaviors, not character attacks</li>
            </ul>
          </div>
        </>
      ) : (
        <div className="no-conflicts">
          <p className="success-message">[OK] No obvious conflict signals detected!</p>
          <p>Your message avoids accusatory or dismissive language.</p>
        </div>
      )}
    </div>
  );

  // Step 3: Empathy Check
  const renderEmpathyStep = () => (
    <div className="empathy-analysis">
      <div className="empathy-score">
        <div className="score-bar">
          <div className="score-fill" style={{ width: `${analysis.reactionPrediction?.effectivenessScores?.empathy || 50}%` }}></div>
        </div>
        <p className="score-label">Empathy Score: {analysis.reactionPrediction?.effectivenessScores?.empathy || 50}/100</p>
      </div>
      <p className="empathy-feedback">{analysis.reactionPrediction?.empathyDetails}</p>
      <div className="empathy-tips">
        <h4>Ways to Show More Empathy:</h4>
        <ul>
          <li>Acknowledge the recipient's feelings or concerns</li>
          <li>Show you understand their perspective</li>
          <li>Use empathetic phrases like "I understand..." or "I can see why..."</li>
          <li>Offer solutions that benefit both sides</li>
        </ul>
      </div>
    </div>
  );

  // Step 4: Message Structure
  const renderStructureStep = () => (
    <div className="structure-analysis">
      <div className="structure-guide">
        <div className="structure-item">
          <h5>Opening</h5>
          <p>Is your greeting appropriate for this recipient?</p>
        </div>
        <div className="structure-item">
          <h5>Main Point</h5>
          <p>Is your core message clear and concise?</p>
        </div>
        <div className="structure-item">
          <h5>Supporting Details</h5>
          <p>Do you provide context or evidence?</p>
        </div>
        <div className="structure-item">
          <h5>Call to Action</h5>
          <p>Is it clear what you want the recipient to do?</p>
        </div>
        <div className="structure-item">
          <h5>Closing</h5>
          <p>Is your closing appropriate to your relationship?</p>
        </div>
      </div>
      <div className="structure-tips">
        <h4>Structure Best Practices:</h4>
        <ul>
          <li>Start with a warm greeting</li>
          <li>State your main point early</li>
          <li>Use short paragraphs for clarity</li>
          <li>Include specific requests or next steps</li>
          <li>End with an appropriate closing</li>
        </ul>
      </div>
    </div>
  );

  // Step 5: Preview & Accept
  const renderPreviewStep = () => (
    <div className="preview-analysis">
      <div className="preview-summary">
        <h4>Analysis Summary</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Sentiment</span>
            <span className="summary-value">{analysis.sentimentDetails.sentiment}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Clarity</span>
            <span className="summary-value">{analysis.reactionPrediction?.effectivenessScores?.clarity || 'N/A'}/100</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Empathy</span>
            <span className="summary-value">{analysis.reactionPrediction?.effectivenessScores?.empathy || 'N/A'}/100</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Risk Level</span>
            <span className={`summary-value risk-${analysis.riskLevel || analysis.reactionPrediction?.riskLevel || 'medium'}`}>
              {(analysis.riskLevel || analysis.reactionPrediction?.riskLevel)?.toUpperCase() || 'N/A'}
            </span>
          </div>
        </div>
      </div>
      <p className="preview-message">Ready to proceed with your message? You can still apply suggestions from the main screen.</p>
    </div>
  );

  // Get current step content
  const getStepContent = (step) => {
    switch (step) {
      case 1:
        return {
          title: '1. Sentiment Analysis',
          description: 'How does your message sound?',
          content: renderSentimentStep()
        };
      case 2:
        return {
          title: '2. Conflict Detection',
          description: 'Identifying potential triggers',
          content: renderConflictStep()
        };
      case 3:
        return {
          title: '3. Empathy Check',
          description: 'Does your message show understanding?',
          content: renderEmpathyStep()
        };
      case 4:
        return {
          title: '4. Structure Review',
          description: 'Is your message well-organized?',
          content: renderStructureStep()
        };
      case 5:
        return {
          title: '5. Final Preview',
          description: 'Review everything before sending',
          content: renderPreviewStep()
        };
      default:
        return { title: '', description: '', content: null };
    }
  };

  const stepContent = getStepContent(currentStep);

  return (
    <div className="analysis-wizard">
      <div className="wizard-container">
        <div className="wizard-header">
          <h2>Step-by-Step Analysis Guide</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <WizardStep
          step={currentStep}
          totalSteps={totalSteps}
          title={stepContent.title}
          description={stepContent.description}
          content={stepContent.content}
          isActive={true}
          isPassed={false}
          onNext={handleNext}
          onPrev={handlePrev}
        />
      </div>
    </div>
  );
}

export default AnalysisWizard;
