/**
 * SaveAsTemplate Component
 * Dialog to save current message as a reusable template
 */

import React, { useState } from 'react';
import { createTemplate } from '../services/feedbackTemplateService';
import './SaveAsTemplate.css';

function SaveAsTemplate({ message, context, recipient, isOpen, onClose, onSaved }) {
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('general');
  const [templateTags, setTemplateTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!templateName.trim()) {
      setError('Please enter a template name');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const tags = templateTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);

      const result = await createTemplate(
        message,
        templateName,
        templateCategory,
        context,
        recipient,
        tags
      );

      setSuccess(true);
      
      // Reset form
      setTemplateName('');
      setTemplateCategory('general');
      setTemplateTags('');

      if (onSaved) {
        onSaved(result.template);
      }

      // Close after 2 seconds
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError('Failed to save template. Please try again.');
      console.error('Save template error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="save-template-overlay">
      <div className="save-template-dialog">
        <div className="dialog-header">
          <h3>Save as Template</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        {success ? (
          <div className="save-success">
            <div className="success-icon">OK</div>
            <p>Template saved successfully!</p>
            <p className="success-hint">Use it anytime for similar messages</p>
          </div>
        ) : (
          <div className="dialog-content">
            <div className="form-group">
              <label>Template Name *</label>
              <input
                type="text"
                placeholder="e.g., Workplace apology template"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                className="form-input"
              >
                <option value="general">General</option>
                <option value="opening">Opening</option>
                <option value="apology">Apology</option>
                <option value="request">Request</option>
                <option value="complaint">Complaint</option>
                <option value="praise">Praise</option>
                <option value="negotiation">Negotiation</option>
                <option value="follow-up">Follow-up</option>
              </select>
            </div>

            <div className="form-group">
              <label>Tags (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g., formal, professional, apology"
                value={templateTags}
                onChange={(e) => setTemplateTags(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Context</label>
              <div className="context-display">{context || 'general'}</div>
            </div>

            <div className="form-group">
              <label>Recipient</label>
              <div className="context-display">{recipient || 'general'}</div>
            </div>

            <div className="form-group">
              <label>Message Preview</label>
              <div className="message-preview">
                {message.substring(0, 200)}
                {message.length > 200 ? '...' : ''}
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="dialog-footer">
              <button 
                className="btn-cancel"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="btn-save"
                onClick={handleSave}
                disabled={!templateName.trim() || loading}
              >
                {loading ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SaveAsTemplate;
