/**
 * TemplateLibrary Component
 * Display and manage saved message templates
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getTemplates, deleteTemplate, applyTemplate } from '../services/feedbackTemplateService';
import './TemplateLibrary.css';

function TemplateLibrary({ isOpen, onClose, onApplyTemplate, context, recipient }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await getTemplates(
        context && context !== 'all' ? context : undefined,
        filterCategory && filterCategory !== 'all' ? filterCategory : undefined
      );

      setTemplates(result.templates || []);
    } catch (err) {
      setError('Failed to load templates');
      console.error('Load templates error:', err);
    } finally {
      setLoading(false);
    }
  }, [context, filterCategory]);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, loadTemplates]);

  const handleApplyTemplate = async (template) => {
    try {
      await applyTemplate(template.id);
      
      if (onApplyTemplate) {
        onApplyTemplate(template);
      }

      onClose();
    } catch (err) {
      console.error('Apply template error:', err);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await deleteTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
    } catch (err) {
      console.error('Delete template error:', err);
      setError('Failed to delete template');
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="template-library-overlay">
      <div className="template-library-modal">
        <div className="library-header">
          <h2>Message Template Library</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="library-filters">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="category-filter"
          >
            <option value="all">All Categories</option>
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

        <div className="library-content">
          {loading ? (
            <div className="library-loading">Loading templates...</div>
          ) : error ? (
            <div className="library-error">{error}</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="library-empty">
              <p>No templates found</p>
              <p className="empty-hint">Create and save your first template from an analysis</p>
            </div>
          ) : (
            <ul className="templates-list">
              {filteredTemplates.map(template => (
                <li key={template.id} className="template-item">
                  <div className="template-header" onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}>
                    <div className="template-info">
                      <h4 className="template-name">{template.name}</h4>
                      <div className="template-meta">
                        <span className="template-category">{template.category}</span>
                        <span className="template-context">{template.context}</span>
                        {template.usageCount > 0 && (
                          <span className="template-usage">Used {template.usageCount}x</span>
                        )}
                      </div>
                    </div>
                    <span className="expand-icon">
                      {expandedId === template.id ? '[−]' : '[+]'}
                    </span>
                  </div>

                  {expandedId === template.id && (
                    <div className="template-details">
                      <div className="template-preview">
                        <p className="preview-label">Preview:</p>
                        <p className="preview-text">
                          {template.message.substring(0, 300)}
                          {template.message.length > 300 ? '...' : ''}
                        </p>
                      </div>

                      {template.tags && template.tags.length > 0 && (
                        <div className="template-tags">
                          {template.tags.map((tag, idx) => (
                            <span key={idx} className="tag">{tag}</span>
                          ))}
                        </div>
                      )}

                      <div className="template-actions">
                        <button
                          className="btn-apply"
                          onClick={() => handleApplyTemplate(template)}
                        >
                          Use Template
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default TemplateLibrary;
