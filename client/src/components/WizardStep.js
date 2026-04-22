/**
 * Wizard Step Component
 * Displays one step of the step-by-step analysis wizard
 */

import React from 'react';
import './WizardStep.css';

function WizardStep({ step, totalSteps, title, description, content, isActive, isPassed, onNext, onPrev }) {
  return (
    <div className={`wizard-step ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}>
      {/* Step Header */}
      <div className="wizard-step-header">
        <div className="step-number">
          <span className="step-indicator">{step}/{totalSteps}</span>
        </div>
        <div className="step-title-section">
          <h3 className="step-title">{title}</h3>
          <p className="step-description">{description}</p>
        </div>
      </div>

      {/* Step Content */}
      <div className="wizard-step-content">
        {content}
      </div>

      {/* Step Navigation */}
      <div className="wizard-step-nav">
        <button 
          className="btn-prev"
          onClick={onPrev}
          disabled={step === 1}
        >
          Previous
        </button>
        <div className="step-progress">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <div 
              key={idx} 
              className={`progress-dot ${idx + 1 < step ? 'completed' : idx + 1 === step ? 'active' : 'pending'}`}
            />
          ))}
        </div>
        <button 
          className="btn-next"
          onClick={onNext}
          disabled={false}
        >
          {step === totalSteps ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}

export default WizardStep;
