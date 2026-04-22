# Writing Companion

Writing Companion is a web-based AI communication coach that helps users revise emotionally sensitive messages for different contexts and recipients. The system analyzes tone, highlights risky phrasing, suggests rewrites, predicts recipient reaction, and learns from user feedback over time.

## Problem

People often know what they want to say, but not how to say it. Tone mistakes can create unnecessary conflict in workplace, family, friendship, and relationship communication. This project focuses on communication strategy rather than grammar alone.

## What the Application Does

- Lets users write or paste a message draft in a web interface
- Lets users choose a communication context and recipient type
- Runs local tone analysis to identify conflict signals and communication risk
- Uses an LLM through Ollama to generate rewrite suggestions
- Predicts likely recipient reaction
- Lets users compare, preview, and apply suggestions
- Records `Helpful / Not Helpful` feedback and updates suggestion ranking models

## Tech Stack

- Frontend: React
- Backend: Node.js / Express
- LLM: Ollama with Llama 2
- ML: feedback-based suggestion ranking models
- Local analysis: rule-based tone analysis and risk scoring
- ML training scripts: Python + scikit-learn

## Repository Structure

```text
writing-companion/
├── client/
│   ├── public/                # Static public assets
│   ├── src/
│   │   ├── components/        # UI components
│   │   │   ├── AnalysisWizard
│   │   │   ├── ComparisonView
│   │   │   ├── FeedbackPanel
│   │   │   ├── ImprovedPreview
│   │   │   ├── MLLearningProgress
│   │   │   ├── ReactionPrediction
│   │   │   ├── SaveAsTemplate
│   │   │   ├── SuggestionFeedback
│   │   │   ├── TemplateLibrary
│   │   │   ├── TextEditor
│   │   │   └── WizardStep
│   │   ├── services/          # Frontend API helpers
│   │   │   ├── api.js
│   │   │   ├── feedbackTemplateService.js
│   │   │   ├── mlService.js
│   │   │   └── suggestionService.js
│   │   ├── App.js             # Main app
│   │   └── App.css            # Main styles
│   ├── build/                 # Production build output (generated)
│   └── package.json
├── server/
│   ├── routes/                # Express routes
│   ├── services/              # Analysis, ML, and reaction services
│   ├── utils/                 # Text processing helpers
│   ├── ml/
│   │   ├── ML_SYSTEM.md       # ML system documentation
│   │   ├── training_data.json # Seed training data
│   │   ├── train_models.py    # Initial model training
│   │   ├── online_learner.py  # Online feedback updates
│   │   └── models/            # Saved model artifacts and metrics
│   ├── index.js
│   └── package.json
└── README.md
```

## Open-Source Code / Libraries Imported

This project does not reuse a full open-source application as a finished template. Instead, it uses standard open-source frameworks, packages, and local model tooling:

- React and `react-scripts` for the frontend
- Express for the backend API
- Axios for HTTP requests from the frontend
- CORS and dotenv for backend configuration
- Nodemon for development
- Ollama for local LLM inference
- Python + scikit-learn for feedback-based ML ranking models

> I used standard open-source frameworks and libraries rather than importing a complete open-source product. The application logic, analysis pipeline, ML ranking flow, prompts, routes, components, and training data were implemented and customized for this project.

## What I Changed from the Initial Version / Prototype

The initial version was a basic text-analysis prototype. I made the following nontrivial changes:

- Added a context-aware local tone analysis layer instead of only simple keyword flags
- Added multi-dimensional tone scoring:
  - blame
  - warmth
  - respect
  - clarity
  - directness
  - intensity
- Added risk scoring and recommended communication strategy
- Added LLM-based rewrite suggestions using Ollama
- Added recipient reaction prediction
- Added context and recipient selection in the UI
- Added suggestion comparison, preview, and apply flows
- Added a feedback panel so users can mark suggestions as helpful or not helpful
- Added ML ranking models that learn from seed data and online feedback
- Added exact and fallback ranking models by context-recipient pair
- Improved the interface to support a polished end-to-end demo workflow

## New Code I Implemented

The main original logic implemented for this project includes:

- Local tone analysis pipeline in:
  - `server/services/analysisService.js`
- Recipient reaction prediction logic in:
  - `server/services/reactionPredictionService.js`
- ML service wrapper and ranking integration in:
  - `server/services/mlService.js`
- Seed data design and training workflow in:
  - `server/ml/training_data.json`
  - `server/ml/train_models.py`
  - `server/ml/online_learner.py`
- Express API routes for:
  - analysis
  - feedback
  - templates
  - ML progress and updates
- React frontend components for:
  - text editing
  - feedback display
  - suggestion comparison
  - preview workflow
  - template library
  - ML learning progress

## ML / AI Components

This application includes multiple AI / ML components:

1. LLM-based suggestion generation
   - Llama 2 via Ollama generates rewrite suggestions and deep analysis

2. Feedback-based ranking models
   - Ranking models learn which suggestions are more helpful for different context-recipient pairs

3. Seed training data
   - Manually created context-recipient feedback examples are used to initialize models

4. Online learning
   - User `Helpful / Not Helpful` feedback updates the ranking models over time

## Data Used

### Seed Training Data

- File: `server/ml/training_data.json`
- Type: manually created context-recipient feedback examples
- Purpose: initialize ranking models before live user feedback is collected

### Online Feedback Data

- Collected from the app interface through user `Helpful / Not Helpful` interactions
- Used to update ranking models incrementally

## Prompts Used

This project uses foundation / generative models, so the prompts are included in code as required by the assignment.

Main prompt locations:

- `server/services/analysisService.js`
  - prompt for LLM-based rewrite suggestion generation
- `server/services/reactionPredictionService.js`
  - prompt for recipient reaction prediction
- `server/routes/generate-improved.js`
  - prompt for polishing improved message text

## How to Run the Application

### Prerequisites

- Node.js
- Python 3
- Ollama installed locally
- Ollama model available locally, for example:

```bash
ollama pull llama2
```

### 1. Install frontend dependencies

```bash
cd client
npm install
```

### 2. Install backend dependencies

```bash
cd ../server
npm install
```

### 3. Start Ollama

```bash
ollama serve
```

### 4. Train initial ML models

From the `server` directory:

```bash
python3 ml/train_models.py
```

### 5. Start the backend

From the `server` directory:

```bash
npm run dev
```

### 6. Start the frontend

From the `client` directory:

```bash
npm start
```

The app should open in the browser at:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5001` (depending on your local server config)

## Notes for Course Submission

For the course submission, this repository includes:

- all application code
- ML training scripts
- seed training data
- prompt locations in code
- frontend and backend resources needed to run the system
