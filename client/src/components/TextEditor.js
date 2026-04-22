
import React, { useEffect, useMemo } from 'react';
import './TextEditor.css';

const CONTEXT_OPTIONS = [
  { value: 'work', label: 'Workplace' },
  { value: 'relationship', label: 'Relationship' },
  { value: 'friend', label: 'Friend' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'family', label: 'Family' },
  { value: 'other', label: 'Other' }
];

const RECIPIENT_OPTIONS_BY_CONTEXT = {
  work: [
    { value: 'boss', label: 'Boss' },
    { value: 'colleague', label: 'Colleague' }
  ],
  relationship: [
    { value: 'partner', label: 'Partner' }
  ],
  friend: [
    { value: 'friend', label: 'Friend' }
  ],
  customer_service: [
    { value: 'customer', label: 'Customer' }
  ],
  family: [
    { value: 'parent', label: 'Parent' },
    { value: 'child', label: 'Child' }
  ],
  other: [
    { value: 'other', label: 'Other' }
  ]
};

function TextEditor({ message, setMessage, context, setContext, recipient, setRecipient, loading, onAnalyze, onAnalyzeWizard, onSaveAsTemplate, onUseTemplate }) {
  const recipientOptions = useMemo(
    () => RECIPIENT_OPTIONS_BY_CONTEXT[context] || [],
    [context]
  );

  useEffect(() => {
    if (recipient && !recipientOptions.some(option => option.value === recipient)) {
      setRecipient('');
    }
  }, [context, recipient, recipientOptions, setRecipient]);

  return (
    <div className="text-editor">
      <h2>Compose Your Message</h2>
      <div className="editor-meta-row">
        <div className="editor-meta-group">
          <label htmlFor="context-select">Context:</label>
          <select
            id="context-select"
            value={context}
            onChange={e => setContext(e.target.value)}
            className="editor-meta-select"
            disabled={loading}
          >
            <option value="">Select</option>
            {CONTEXT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="editor-meta-group">
          <label htmlFor="recipient-select">Recipient:</label>
          <select
            id="recipient-select"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            className="editor-meta-select"
            disabled={loading || !context}
          >
            <option value="">Select</option>
            {recipientOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>  
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write your message here..."
        className="editor-textarea"
        disabled={loading}
      />
      <div className="editor-footer">
        <div className="editor-info">
          <span>{message.length} characters</span>
        </div>
        <div className="editor-actions">
          {/* P4: Template Buttons */}
          <div className="template-buttons">
            <button
              className="template-btn save-template"
              onClick={onSaveAsTemplate}
              disabled={loading || message.trim().length === 0}
              title="Save this message as a reusable template"
            >
              Save Template
            </button>
            <button
              className="template-btn use-template"
              onClick={onUseTemplate}
              disabled={loading}
              title="Browse and use saved templates"
            >
              My Templates
            </button>
          </div>

          {/* Analysis Buttons */}
          <div className="analyze-buttons">
            <button
              className="analyze-button analyze-quick"
              onClick={onAnalyze}
              disabled={loading || message.trim().length === 0}
              title="Quick analysis - see all suggestions at once"
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
            <button
              className="analyze-button analyze-wizard"
              onClick={onAnalyzeWizard}
              disabled={loading || message.trim().length === 0}
              title="Step-by-step guided analysis"
            >
              {loading ? 'Analyzing...' : 'Step-by-Step'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TextEditor;
