import React, { useState, useEffect } from 'react';
import './App.css';
import TextEditor from './components/TextEditor';
import FeedbackPanel from './components/FeedbackPanel';
import ImprovedPreview from './components/ImprovedPreview';
import AnalysisWizard from './components/AnalysisWizard';
import SaveAsTemplate from './components/SaveAsTemplate';
import TemplateLibrary from './components/TemplateLibrary';
import MLLearningProgress from './components/MLLearningProgress';
import { analyzeMessage } from './services/api';
import { applySuggestion, applySuggestionsBatch, generateImprovedVersion } from './services/suggestionService';
import { initializeMLSystem } from './services/mlService';

function App() {
  const [message, setMessage] = useState('');
  const [context, setContext] = useState('');
  const [recipient, setRecipient] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
  const [expandedSuggestion, setExpandedSuggestion] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewImprovedVersion, setPreviewImprovedVersion] = useState('');
  const [previewSuggestions, setPreviewSuggestions] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);

  // Initialize ML system on app startup
  useEffect(() => {
    const init = async () => {
      try {
        console.log('[App] Initializing ML system...');
        await initializeMLSystem();
        console.log('[App] ML system initialized');
      } catch (err) {
        console.error('[App] Failed to initialize ML system:', err);
      }
    };
    init();
  }, []);

  const handleAnalyze = async () => {
    if (!message.trim()) {
      setError('Please write a message first');
      return;
    }
    if (!context || !recipient) {
      setError('請選擇情境與對象');
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedSuggestions(new Set()); // Reset selections on new analysis
    setExpandedSuggestion(null); // Reset expanded suggestion

    try {
      const result = await analyzeMessage(message, context, recipient);
      setAnalysis(result.analysis);
    } catch (err) {
      setError('Failed to analyze message. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Step-by-step wizard mode analysis
  const handleAnalyzeWizard = async () => {
    if (!message.trim()) {
      setError('Please write a message first');
      return;
    }
    if (!context || !recipient) {
      setError('請選擇情境與對象');
      return;
    }

    setLoading(true);
    setError(null);
    setShowWizard(false); // Close wizard if open

    try {
      const result = await analyzeMessage(message, context, recipient);
      setAnalysis(result.analysis);
      setShowWizard(true); // Show wizard after analysis
    } catch (err) {
      setError('Failed to analyze message. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  // P1: Apply a single suggestion and show comparison
  const handleApplySuggestion = async (suggestion) => {
    try {
      setError(null); // Clear previous errors
      
      // Call the apply-suggestion API
      const updatedText = await applySuggestion(message, suggestion);
      
      // Update the message
      setMessage(updatedText);
      
      // Clear old analysis
      setAnalysis(null);
      setSelectedSuggestions(new Set());
      setExpandedSuggestion(null);
      setLoading(true);
      
      // Re-analyze the updated message based on actual current text
      const result = await analyzeMessage(updatedText, context, recipient);
      setAnalysis(result.analysis);
      
      // Show success feedback
      console.log('Suggestion applied successfully. New suggestions are based on the updated text.');
      
    } catch (err) {
      setError(`Failed to apply suggestion: ${err.message}`);
      console.error('Apply suggestion error:', err);
    } finally {
      setLoading(false);
    }
  };

  // P1: Apply multiple selected suggestions
  const handleApplyBatchSuggestions = async (suggestionsToApply) => {
    try {
      
      // Call the batch apply API
      const result = await applySuggestionsBatch(message, suggestionsToApply);
      
      if (result.updatedText) {
        setMessage(result.updatedText);
        
        // Clear old analysis
        setAnalysis(null);
        setSelectedSuggestions(new Set()); // Clear selections
        setExpandedSuggestion(null);
        setLoading(true);
        
        // Re-analyze the updated message based on actual current text
        const analysisResult = await analyzeMessage(result.updatedText, context, recipient);
        setAnalysis(analysisResult.analysis);
        
        // Show feedback about applied suggestions
        if (result.failedSuggestions.length > 0) {
          console.warn(
            `Applied ${result.appliedCount} suggestions. Failed: ${result.failedSuggestions.length}. New suggestions are based on the updated text.`
          );
        } else {
          console.log(`Successfully applied ${result.appliedCount} suggestions. New suggestions are based on the updated text.`);
        }
      }
      
      setError(null);
      
    } catch (err) {
      setError(`Failed to apply batch suggestions: ${err.message}`);
      console.error('Batch apply error:', err);
    } finally {
      setLoading(false);
    }
  };

  // P1: Handle comparison view trigger
  const handleShowComparison = async (type) => {
    if (type === 'batch' && selectedSuggestions.size > 0) {
      const suggestionsArray = Array.from(selectedSuggestions).map(idx => 
        analysis.llmAnalysis.suggestions[idx]
      );
      await handleApplyBatchSuggestions(suggestionsArray);
    }
  };

  // P2: Preview improved version with selected suggestions
  const handlePreviewImproved = async (suggestionsToPreview) => {
    try {
      setPreviewLoading(true);
      setError(null);
      
      const result = await generateImprovedVersion(message, suggestionsToPreview);
      setPreviewImprovedVersion(result.improvedText);
      setPreviewSuggestions(suggestionsToPreview);
      setShowPreviewModal(true);
    } catch (err) {
      setError(`Failed to generate preview: ${err.message}`);
      console.error('Preview generation error:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // P2: Accept improved version and replace message
  const handleAcceptImprovedVersion = async (acceptedText) => {
    try {
      // Close modal and clear all preview state FIRST
      setShowPreviewModal(false);
      setPreviewImprovedVersion('');
      setPreviewSuggestions([]);
      setPreviewLoading(false);
      
      // Then update the message and analysis
      setMessage(acceptedText);
      setAnalysis(null);
      setSelectedSuggestions(new Set());
      setExpandedSuggestion(null);
      setLoading(true);
      
      // Re-analyze the accepted improved text
      const result = await analyzeMessage(acceptedText, context, recipient);
      
      // Set analysis and ensure modal stays closed
      setAnalysis(result.analysis);
      // Force modal closed again after analysis is set
      setShowPreviewModal(false);
    } catch (err) {
      setError(`Failed to re-analyze after accepting: ${err.message}`);
      console.error('Re-analyze error:', err);
      // Ensure modal is closed even on error
      setShowPreviewModal(false);
    } finally {
      setLoading(false);
    }
  };

  // P2: Decline preview and return to suggestions
  const handleDeclinePreview = () => {
    setShowPreviewModal(false);
    setPreviewImprovedVersion('');
    setPreviewSuggestions([]);
  };

  // P4: Save current message as template
  const handleSaveAsTemplate = () => {
    if (!message.trim()) {
      setError('Please write a message first');
      return;
    }
    setShowSaveTemplate(true);
  };

  // P4: Handle successful template save
  const handleTemplateSaved = async (template) => {
    console.log('Template saved:', template);
    setShowSaveTemplate(false);
    // Optional: Show success message
  };

  // P4: Show template library
  const handleUseTemplate = () => {
    setShowTemplateLibrary(true);
  };

  // P4: Apply template to message
  const handleApplyTemplate = (template) => {
    setMessage(template.message);
    setContext(template.context || context);
    setRecipient(template.recipient || recipient);
    setShowTemplateLibrary(false);
    setError(null);
    // Template applied - user can now modify or analyze
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Writing Companion</h1>
        <p>Compose emotionally intelligent messages with AI support</p>
      </header>

      <MLLearningProgress />

      <div className="app-container">
        <div className="editor-section">
          <TextEditor
            message={message}
            setMessage={setMessage}
            context={context}
            setContext={setContext}
            recipient={recipient}
            setRecipient={setRecipient}
            loading={loading}
            onAnalyze={handleAnalyze}
            onAnalyzeWizard={handleAnalyzeWizard}
            onSaveAsTemplate={handleSaveAsTemplate}
            onUseTemplate={handleUseTemplate}
          />
          {error && <p className="error-message">{error}</p>}
        </div>

        <div className="feedback-section">
          {showWizard && analysis ? (
            <AnalysisWizard 
              analysis={analysis}
              onClose={() => setShowWizard(false)}
              onAccept={() => setShowWizard(false)}
            />
          ) : analysis && !showWizard ? (
            <FeedbackPanel 
              analysis={analysis} 
              originalText={message}
              onApplySuggestion={handleApplySuggestion}
              onShowComparison={handleShowComparison}
              selectedSuggestions={selectedSuggestions}
              setSelectedSuggestions={setSelectedSuggestions}
              expandedSuggestion={expandedSuggestion}
              setExpandedSuggestion={setExpandedSuggestion}
              onPreviewImproved={handlePreviewImproved}
              context={context}
              recipient={recipient}
            />
          ) : null}
          {loading && <p className="loading">Analyzing...</p>}
          {!analysis && !loading && (
            <div className="feedback-panel empty">
              <p>Analysis results will appear here</p>
            </div>
          )}
        </div>

        {showPreviewModal && (
          <ImprovedPreview
            originalText={message}
            suggestions={previewSuggestions}
            improvedText={previewImprovedVersion}
            onAccept={handleAcceptImprovedVersion}
            onDecline={handleDeclinePreview}
            loading={previewLoading}
          />
        )}
      </div>

      {/* P4: Save As Template Dialog */}
      <SaveAsTemplate
        message={message}
        context={context}
        recipient={recipient}
        isOpen={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        onSaved={handleTemplateSaved}
      />

      {/* P4: Template Library Modal */}
      <TemplateLibrary
        isOpen={showTemplateLibrary}
        onClose={() => setShowTemplateLibrary(false)}
        onApplyTemplate={handleApplyTemplate}
        context={context}
        recipient={recipient}
      />
    </div>
  );
}

export default App;
