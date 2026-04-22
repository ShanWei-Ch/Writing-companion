/**
 * ML Service: Node.js wrapper for Python ML models
 * Provides API for model training, prediction, and online learning
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ML_DIR = path.join(__dirname, '../ml');
const MODELS_DIR = path.join(ML_DIR, 'models');
const METRICS_FILE = path.join(MODELS_DIR, 'metrics.json');
const FEEDBACK_LOG = path.join(MODELS_DIR, 'feedback_log.json');
const TRAINING_DATA_FILE = path.join(ML_DIR, 'training_data.json');

const LOCAL_FIT_WEIGHT = 0.3;
const ML_WEIGHT = 0.7;

// Ensure models directory exists
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

/**
 * Run Python script
 */
function runPythonScript(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(ML_DIR, scriptName);
    const pythonProcess = spawn('python3', [scriptPath, ...args], {
      cwd: ML_DIR,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, stdout });
      } else {
        reject(new Error(`Python script failed: ${stderr}`));
      }
    });

    pythonProcess.on('error', (err) => {
      reject(err);
    });
  });
}

function parsePythonJson(stdout) {
  const lines = stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      return JSON.parse(lines[i]);
    } catch {
      // Keep looking; Python helpers may print progress logs first.
    }
  }

  throw new Error(`Python script did not return JSON: ${stdout.substring(0, 300)}`);
}

function getExpectedModelKeys() {
  try {
    const trainingData = JSON.parse(fs.readFileSync(TRAINING_DATA_FILE, 'utf8'));
    const rows = Array.isArray(trainingData.data) ? trainingData.data : [];
    const keys = new Set();

    rows.forEach(row => {
      if (!row.context || !row.recipient) return;

      keys.add(`${row.context}_${row.recipient}`);
      if (row.context !== 'general') {
        keys.add(`${row.context}_general`);
      }
    });

    return [...keys].sort();
  } catch (err) {
    console.error('[ML] Error reading expected model keys:', err.message);
    return [];
  }
}

function getModelInitializationStatus() {
  const expectedKeys = getExpectedModelKeys();

  if (expectedKeys.length === 0) {
    return {
      initialized: false,
      expectedKeys,
      missingModels: [],
      missingMetrics: [],
      message: 'No expected model keys found'
    };
  }

  let metrics = {};
  if (fs.existsSync(METRICS_FILE)) {
    try {
      metrics = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
    } catch (err) {
      return {
        initialized: false,
        expectedKeys,
        missingModels: expectedKeys,
        missingMetrics: expectedKeys,
        message: `Metrics file is invalid: ${err.message}`
      };
    }
  }

  const missingModels = expectedKeys.filter(key => !fs.existsSync(path.join(MODELS_DIR, `${key}.pkl`)));
  const missingMetrics = expectedKeys.filter(key => {
    const status = metrics[key]?.status;
    return status !== 'trained' && status !== 'updated';
  });

  return {
    initialized: missingModels.length === 0 && missingMetrics.length === 0,
    expectedKeys,
    missingModels,
    missingMetrics,
    models_total_expected: expectedKeys.length
  };
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function calculateLocalFitScore(suggestion, localTone) {
  if (!localTone || !Array.isArray(localTone.signals) || localTone.signals.length === 0) {
    return null;
  }

  const original = String(suggestion.original || '').toLowerCase();
  const explanation = String(suggestion.explanation || '').toLowerCase();
  const category = String(suggestion.category || '').toLowerCase();

  const matchingSignals = localTone.signals.filter(signal => {
    const signalText = String(signal.matchedText || signal.text || '').toLowerCase();
    const signalCategory = String(signal.category || '').toLowerCase();

    return (
      (signalText && (original.includes(signalText) || signalText.includes(original))) ||
      (signalCategory && category === signalCategory) ||
      (signalCategory && explanation.includes(signalCategory))
    );
  });

  if (matchingSignals.length === 0) {
    return 0;
  }

  return clamp(Math.max(...matchingSignals.map(signal => signal.severity || 0)));
}

function applyLocalToneRerank(suggestions, localTone) {
  if (!localTone || !Array.isArray(suggestions) || suggestions.length === 0) {
    return suggestions;
  }

  return suggestions
    .map((suggestion, index) => {
      const localFitScore = calculateLocalFitScore(suggestion, localTone);
      const hasMlScore = suggestion.mlStatus === 'success' && typeof suggestion.mlScore === 'number';
      const mlScore = hasMlScore ? suggestion.mlScore : 0.5;
      const combinedScore = localFitScore === null
        ? mlScore
        : clamp((mlScore * ML_WEIGHT) + (localFitScore * LOCAL_FIT_WEIGHT));

      return {
        ...suggestion,
        localFitScore,
        combinedScore,
        rankingSignals: {
          mlWeight: ML_WEIGHT,
          localFitWeight: localFitScore === null ? 0 : LOCAL_FIT_WEIGHT
        },
        _originalIndex: index
      };
    })
    .sort((a, b) => {
      if (b.combinedScore !== a.combinedScore) {
        return b.combinedScore - a.combinedScore;
      }
      return a._originalIndex - b._originalIndex;
    })
    .map(suggestion => {
      const { _originalIndex, ...publicSuggestion } = suggestion;
      return publicSuggestion;
    });
}

/**
 * Train models with initial data
 */
async function trainModels(options = {}) {
  const { force = false } = options;
  const initializationStatus = getModelInitializationStatus();

  if (!force && initializationStatus.initialized) {
    console.log('[ML] Models already initialized. Skipping seed training.');
    return {
      success: true,
      skipped: true,
      message: 'Models already initialized; skipped seed training',
      initializationStatus
    };
  }

  console.log(force ? '[ML] Force training requested...' : '[ML] Starting model training...');
  try {
    const result = await runPythonScript('train_models.py');
    console.log('[ML] Training output:', result.stdout);
    return {
      success: true,
      skipped: false,
      message: 'Models trained successfully',
      initializationStatus: getModelInitializationStatus()
    };
  } catch (err) {
    console.error('[ML] Training error:', err.message);
    throw err;
  }
}

/**
 * Add user feedback and potentially trigger model update
 */
async function recordFeedback(suggestion, feedback, context, recipient, sentiment = 'neutral') {
  console.log(`[ML] Recording feedback: ${context}/${recipient}`);
  
  try {
    const payload = JSON.stringify({ suggestion, feedback, context, recipient, sentiment });
    const result = await runPythonScript('online_learner.py', [
      '--action',
      'add-feedback',
      '--payload',
      payload
    ]);
    const learnerResult = parsePythonJson(result.stdout);
    
    // Also try to load feedback log to return current status
    try {
      const feedbackLog = JSON.parse(fs.readFileSync(FEEDBACK_LOG, 'utf8'));
      return {
        ...learnerResult,
        success: true,
        total_feedback: feedbackLog.length,
        progress: feedbackLog.length
      };
    } catch {
      return { ...learnerResult, success: true, message: 'Feedback recorded' };
    }
  } catch (err) {
    console.error('[ML] Feedback recording error:', err.message);
    throw err;
  }
}

/**
 * Rank generated suggestions by learned helpfulness for a context/recipient.
 */
async function rankSuggestions(suggestions, context, recipient, localTone = null) {
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    return { status: 'success', suggestions: [] };
  }

  try {
    const payload = JSON.stringify({ suggestions, context, recipient });
    const result = await runPythonScript('online_learner.py', [
      '--action',
      'rank-suggestions',
      '--payload',
      payload
    ]);
    const ranked = parsePythonJson(result.stdout);

    if (ranked.status !== 'success' || !Array.isArray(ranked.suggestions)) {
      console.warn('[ML] Ranking skipped:', ranked.message || ranked.status);
      return { status: ranked.status || 'error', suggestions };
    }

    return {
      ...ranked,
      suggestions: applyLocalToneRerank(ranked.suggestions, localTone),
      rankingMode: localTone ? 'ml_and_local_tone' : 'ml_only'
    };
  } catch (err) {
    console.error('[ML] Ranking error:', err.message);
    return {
      status: 'error',
      message: err.message,
      suggestions: applyLocalToneRerank(suggestions, localTone),
      rankingMode: localTone ? 'local_tone_fallback' : 'original_order'
    };
  }
}

/**
 * Get current metrics
 */
function getMetrics() {
  try {
    if (!fs.existsSync(METRICS_FILE)) {
      return { status: 'no_metrics', message: 'Models not trained yet' };
    }
    const metrics = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
    return { status: 'success', metrics };
  } catch (err) {
    console.error('[ML] Error reading metrics:', err.message);
    return { status: 'error', message: err.message };
  }
}

/**
 * Get feedback log
 */
function getFeedbackLog() {
  try {
    if (!fs.existsSync(FEEDBACK_LOG)) {
      return { status: 'success', feedback: [], total: 0 };
    }
    const feedback = JSON.parse(fs.readFileSync(FEEDBACK_LOG, 'utf8'));
    return { status: 'success', feedback, total: feedback.length };
  } catch (err) {
    console.error('[ML] Error reading feedback log:', err.message);
    return { status: 'error', message: err.message };
  }
}

/**
 * Get training progress
 */
function getTrainingProgress() {
  const metrics = getMetrics();
  if (metrics.status !== 'success') {
    return { trained: false, message: 'Models not trained yet' };
  }

  const trained = Object.keys(metrics.metrics || {}).filter(
    k => metrics.metrics[k].status === 'trained' || metrics.metrics[k].status === 'updated'
  ).length;

  const total = Object.keys(metrics.metrics || {}).length;

  return {
    trained: total > 0,
    models_trained: trained,
    models_total: total,
    progress_percentage: total > 0 ? Math.round((trained / total) * 100) : 0,
    metrics: metrics.metrics
  };
}

module.exports = {
  trainModels,
  getModelInitializationStatus,
  recordFeedback,
  rankSuggestions,
  getMetrics,
  getFeedbackLog,
  getTrainingProgress
};
