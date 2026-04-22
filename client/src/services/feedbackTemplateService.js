/**
 * Feedback and Template API Service
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// ============ FEEDBACK APIs ============

export const submitSuggestionFeedback = async (suggestionId, type, message, context, recipient) => {
  try {
    const response = await fetch(`${API_BASE}/feedback/suggestion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggestionId,
        type, // 'helpful', 'unhelpful', 'note', 'report'
        message,
        context,
        recipient
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Submit feedback error:', err);
    throw err;
  }
};

export const getFeedbackStats = async (context, recipient) => {
  try {
    const params = new URLSearchParams();
    if (context) params.append('context', context);
    if (recipient) params.append('recipient', recipient);

    const response = await fetch(`${API_BASE}/feedback/stats?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Get feedback stats error:', err);
    throw err;
  }
};

// ============ TEMPLATE APIs ============

export const createTemplate = async (message, name, category, context, recipient, tags) => {
  try {
    const response = await fetch(`${API_BASE}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        name,
        category,
        context,
        recipient,
        tags
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Create template error:', err);
    throw err;
  }
};

export const getTemplates = async (context, category) => {
  try {
    const params = new URLSearchParams();
    if (context) params.append('context', context);
    if (category) params.append('category', category);

    const response = await fetch(`${API_BASE}/templates?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Get templates error:', err);
    throw err;
  }
};

export const getTemplate = async (id) => {
  try {
    const response = await fetch(`${API_BASE}/templates/${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Get template error:', err);
    throw err;
  }
};

export const updateTemplate = async (id, message, name, category, context, recipient, tags) => {
  try {
    const response = await fetch(`${API_BASE}/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        name,
        category,
        context,
        recipient,
        tags
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Update template error:', err);
    throw err;
  }
};

export const deleteTemplate = async (id) => {
  try {
    const response = await fetch(`${API_BASE}/templates/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Delete template error:', err);
    throw err;
  }
};

export const applyTemplate = async (id) => {
  try {
    const response = await fetch(`${API_BASE}/templates/${id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Apply template error:', err);
    throw err;
  }
};
