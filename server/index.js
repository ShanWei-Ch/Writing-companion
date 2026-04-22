const express = require('express');
const cors = require('cors');
require('dotenv').config();

const analysisRoutes = require('./routes/analysis');
const applySuggestionRoutes = require('./routes/apply-suggestion');
const generateImprovedRoutes = require('./routes/generate-improved');
const feedbackRoutes = require('./routes/feedback');
const templateRoutes = require('./routes/templates');
const mlRoutes = require('./routes/ml');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Analysis routes
app.use('/api', analysisRoutes);

// P1: Apply suggestion routes
app.use('/api', applySuggestionRoutes);

// P2: Generate improved version routes
app.use('/api', generateImprovedRoutes);

// P4: User feedback routes
app.use('/api/feedback', feedbackRoutes);

// P4: Message template routes
app.use('/api/templates', templateRoutes);

// P5: ML routes (model training, prediction, online learning)
app.use('/api', mlRoutes);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Writing Companion Server running on port ${PORT}`);
});
