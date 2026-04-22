/**
 * Templates Routes
 * Handle saving, retrieving, and applying message templates
 */

const express = require('express');
const router = express.Router();

// In-memory storage for templates (in production, use database)
let templateStore = [];
let templateIdCounter = 1;

// Create/Save a new template
// POST /api/templates
router.post('/', (req, res) => {
  try {
    const { message, name, category, context, recipient, tags } = req.body;
    
    if (!message || !name) {
      return res.status(400).json({ error: 'Missing message or name' });
    }

    const template = {
      id: templateIdCounter++,
      message,
      name,
      category: category || 'general',
      context: context || 'general',
      recipient: recipient || 'general',
      tags: tags || [],
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    templateStore.push(template);

    res.json({
      success: true,
      template,
      message: `Template "${name}" saved successfully`
    });
  } catch (err) {
    console.error('Template creation error:', err);
    res.status(500).json({ error: 'Failed to save template' });
  }
});

// Get all templates
// GET /api/templates
router.get('/', (req, res) => {
  try {
    const { context, category } = req.query;
    
    let filtered = templateStore;

    if (context && context !== 'all') {
      filtered = filtered.filter(t => t.context === context);
    }

    if (category && category !== 'all') {
      filtered = filtered.filter(t => t.category === category);
    }

    res.json({
      success: true,
      templates: filtered,
      total: filtered.length
    });
  } catch (err) {
    console.error('Get templates error:', err);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Get a specific template
// GET /api/templates/:id
router.get('/:id', (req, res) => {
  try {
    const template = templateStore.find(t => t.id === parseInt(req.params.id));
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({
      success: true,
      template
    });
  } catch (err) {
    console.error('Get template error:', err);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// Apply a template (increment usage count)
// POST /api/templates/:id/apply
router.post('/:id/apply', (req, res) => {
  try {
    const template = templateStore.find(t => t.id === parseInt(req.params.id));
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    template.usageCount += 1;
    template.lastUsedAt = new Date().toISOString();

    res.json({
      success: true,
      template,
      message: 'Template applied'
    });
  } catch (err) {
    console.error('Apply template error:', err);
    res.status(500).json({ error: 'Failed to apply template' });
  }
});

// Update a template
// PUT /api/templates/:id
router.put('/:id', (req, res) => {
  try {
    const template = templateStore.find(t => t.id === parseInt(req.params.id));
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const { message, name, category, context, recipient, tags } = req.body;
    
    if (message) template.message = message;
    if (name) template.name = name;
    if (category) template.category = category;
    if (context) template.context = context;
    if (recipient) template.recipient = recipient;
    if (tags) template.tags = tags;
    
    template.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      template,
      message: 'Template updated'
    });
  } catch (err) {
    console.error('Update template error:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete a template
// DELETE /api/templates/:id
router.delete('/:id', (req, res) => {
  try {
    const index = templateStore.findIndex(t => t.id === parseInt(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const deleted = templateStore.splice(index, 1)[0];

    res.json({
      success: true,
      message: `Template "${deleted.name}" deleted`,
      template: deleted
    });
  } catch (err) {
    console.error('Delete template error:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

module.exports = router;
