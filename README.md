# e-SURVEY — Filipino / Taglish Sentiment Classifier

A desktop application for classifying Filipino and Taglish text sentiment. Built as a research prototype for academic evaluation purposes.

---

## Overview

e-SURVEY provides four classification tools in a single desktop app:

| Tool | Description | Endpoint |
|------|-------------|----------|
| **Single** | Classify one text at a time | `POST /api/sentiment/classify` |
| **Batch** | Classify many texts concurrently | `POST /api/sentiment/classify/batch` |
| **With Category** | Sentiment + best-matching topic | `POST /api/sentiment/classify_category/batch` |
| **Accuracy Test** | Run against a labeled test set | `POST /api/sentiment/accuracy` |

Supports **Filipino**, **Taglish**, and **English** input.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron |
| Frontend | React + TypeScript + Vite |
| Backend | Python + Flask |
| Packaging | PyInstaller (backend), electron-builder (installer) |

---

## Project Structure

```
e-survey/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── sentiment.py        # All classification endpoints
│   │   ├── core/
│   │   │   └── classifier.py       # Inference logic, batching, concurrency
│   │   ├── models/
│   │   │   ├── prompts.py          # Prompt templates (single, batch, category)
│   │   │   └── samples.py          # Sample data models
│   │   ├── utils/
│   │   │   ├── responses.py        # Unified success/error response helpers
│   │   │   └── validators.py       # Request validation decorators
│   │   ├── config.py               # Model, timeout, worker config
│   │   └── static_routes.py        # Serves built frontend
│   ├── resources/
│   │   └── samples.json            # Labeled test samples (up to 2000)
│   ├── dist/
│   │   └── flask_server.exe        # PyInstaller output
│   ├── accuracy_runner.py
│   ├── production_run.py           # Entry point for packaged build
│   ├── run.py                      # Entry point for development
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── routes/                 # Page components (dashboard, batch, etc.)
│       ├── components/             # Shared UI components
│       ├── layout/                 # Nav + header
│       └── lib/                    # Utilities, interfaces, constants
│
├── electron/
│   ├── main.js                     # Main process (window + backend lifecycle)
│   ├── preload.js                  # Context bridge
│   ├── loading.html                # Splash screen while backend starts
│   └── resources/
│       └── backend/
│           └── flask_server.exe
│
├── run.bat                         # Quick dev launcher
└── gen.py                          # Folder tree utility
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+

---

### 1. Backend (Flask)

```bash
cd backend
pip install -r requirements.txt
python run.py
```

The API will be available at `http://127.0.0.1:5000`.

---

### 2. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:5173` in development.

To build and have Flask serve it:

```bash
npm run build
```

---

### 3. Electron (Desktop)

```bash
cd electron
npm install
npm run dev
```

Electron spawns the backend executable on a random free port and loads the frontend from it automatically.

> Make sure `electron/resources/backend/flask_server.exe` exists before running the desktop shell.

---

## Building for Distribution

### Step 1 — Build the Flask backend

```bash
cd backend
pyinstaller flask_server.spec
```

Output: `backend/dist/flask_server.exe` → copy to `electron/resources/backend/`.

### Step 2 — Build the frontend

```bash
cd frontend
npm run build
```

The output is served by Flask via `static_routes.py` — no separate web server needed in production.

### Step 3 — Package the installer

```bash
cd electron
npm run dist
```

Output: `electron/dist/e-SURVEY-Setup-<version>.exe`

---

## API Reference

All endpoints are prefixed with `/api/sentiment` and require an access token (configured in `app/config.py`).

---

### `POST /classify`
Classify a single text.

**Request**
```json
{ "text": "Maganda ang produkto" }
```

**Response**
```json
{
  "predicted": "Positive",
  "elapsed": 0.84,
  "timestamp": "2025-01-01 12:00:00"
}
```

---

### `POST /classify/batch`
Classify multiple texts concurrently using a thread pool.

**Request**
```json
{
  "texts": ["Maganda", "Hindi masarap", "Okay naman"],
  "max_workers": 4,
  "batch_size": 5,
  "min_char_length": 0
}
```

| Field | Default | Range | Description |
|-------|---------|-------|-------------|
| `max_workers` | `Config.MAX_WORKERS` | 1–4 | Concurrent chunk requests |
| `batch_size` | `1` | 1–20 | Texts per inference call |
| `min_char_length` | `0` | 0–9999 | Skip texts at or below this length |

**Response**
```json
{
  "results": [
    { "text": "Maganda", "predicted": "Positive", "elapsed": 0.91, "timestamp": "..." }
  ]
}
```

---

### `POST /classify_category/batch`
Classify texts with sentiment and a best-matching category from a shared list.

**Request**
```json
{
  "texts": ["Maganda ang packaging", "Mahal pero sulit"],
  "categories": ["quality", "price", "delivery"],
  "batch_size": 2,
  "max_workers": 2,
  "min_char_length": 0
}
```

**Response**
```json
{
  "results": [
    { "text": "Maganda ang packaging", "predicted": "Positive", "category": "quality", "elapsed": 1.1 }
  ]
}
```

---

### `POST /accuracy`
Run a randomized accuracy test against `resources/samples.json` (up to 2000 labeled samples).

**Request** *(all fields optional)*
```json
{
  "size": 500,
  "max_workers": 4,
  "batch_size": 5
}
```

**Response**
```json
{
  "total_samples": 500,
  "total_score": 412.5,
  "overall_accuracy": 82.5,
  "results": [
    { "index": 1, "text": "...", "expected": "Positive", "predicted": "Positive", "score": 1.0 }
  ]
}
```

#### Scoring Table

| Expected \ Predicted | Positive | Neutral | Negative |
|----------------------|----------|---------|----------|
| **Positive** | 1.0 | 0.5 | 0.0 |
| **Neutral** | 0.5 | 1.0 | 0.5 |
| **Negative** | 0.0 | 0.5 | 1.0 |

Partial credit is awarded for near-miss predictions (e.g., Neutral when Positive is expected).

---

### `GET /health`
Returns `{ "status": "ok" }` when the service is running.

---

## Model Fallback

The classifier attempts inference using a primary model configured in `Config`. If the primary model fails, it automatically retries using fallback models in order:

```
gemma3:27b-cloud → gemma3:12b-cloud → gemma3:4b-cloud
```

If all models fail, the result is returned as `"Error"`.

---

## CSV / XLSX Import

**Batch** and **Category** tools support file upload in two modes:

- **CSV / XLSX (standard)** — reads the first column as texts; first row treated as header if it contains `"text"`
- **Upload Any XLSX** — opens a column picker modal where you choose any column by letter, set a start row, and preview the first 5 values before importing. Newlines inside cells are automatically replaced with spaces so each row maps to exactly one classification entry.

A downloadable CSV template is available inside each tool.

---

## Disclaimer

e-SURVEY is a **research prototype** developed for academic study. It is not intended for production or commercial use. Classification results may contain errors and should not be used for critical decisions. Submitted texts are processed in real-time and are not stored or logged by the application.

---

## Author

**John Dave Pega**