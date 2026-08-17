# ToolProbe

Full-stack app research platform powered by an LLM agent (Groq / llama-3.3-70b-versatile). Researches 100+ apps, analyzes integration patterns, verifies accuracy, and surfaces deep-dive insights through a React dashboard.

## Architecture

```
toolprobe/
├── backend/                  # FastAPI + SQLAlchemy (async) + Groq API
│   ├── agents/               # research, verification, pattern analysis
│   ├── models/               # SQLAlchemy ORM models
│   ├── schemas/              # Pydantic v2 request/response schemas
│   ├── services/             # metrics, pattern orchestration
│   ├── utils/                # LLM wrappers, retry logic
│   ├── alembic/              # DB migrations
│   ├── main.py               # FastAPI app + all endpoints
│   ├── config.py             # Settings via pydantic-settings
│   ├── database.py           # Async engine + session factory
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React 18 + TypeScript + Vite + Tailwind
│   ├── src/
│   │   ├── components/       # UI components (5 tabs + 4 deep-dive modals)
│   │   └── utils/            # API client, TypeScript types
│   ├── vite.config.ts        # Dev proxy → localhost:8000
│   └── package.json
├── scripts/                  # CLI utilities
│   ├── run_research.py       # Run the full research pipeline
│   ├── seed_apps.py          # Seed apps from JSON
│   ├── verify_sample.py      # Spot-check verification
│   ├── analyze_patterns.py   # Run pattern analysis
│   └── export_to_json.py     # Export results for frontend
└── research_data/
    └── apps_list.json        # 100 apps to research
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| LLM Provider | Groq API (`llama-3.3-70b-versatile`) |
| Backend | Python 3.11+, FastAPI, SQLAlchemy (async), Alembic |
| Database | SQLite (default) / PostgreSQL (switchable) |
| Validation | Pydantic v2 |
| Analysis | Pandas, Scikit-learn (KMeans, Cramér's V) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Charts | Recharts |
| CLI Output | Rich (progress bars, tables) |

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **Groq API key** — get one at [console.groq.com](https://console.groq.com)

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url> && cd toolprobe

# Backend
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt

# Frontend (new terminal)
cd frontend
npm install
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set your Groq API key:

```
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Run backend and frontend in parallel

Open **two terminals** from the project root:

**Terminal 1 — Backend:**

```bash
cd backend
uvicorn backend.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

The frontend runs at **http://localhost:5173** and proxies `/api/*` requests to the backend at `http://localhost:8000`.

### 4. (Alternative) Run both with one command

From the project root, using PowerShell:

```powershell
# Terminal 1
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; uvicorn backend.main:app --reload --port 8000"

# Terminal 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
```

Or with a single bash-compatible shell (Git Bash / WSL):

```bash
(cd backend && uvicorn backend.main:app --reload --port 8000) &
(cd frontend && npm run dev) &
wait
```

## Running the Research Pipeline

After the backend is running, seed apps and run the full research pipeline:

```bash
# Seed 100 apps from research_data/apps_list.json
python -m scripts.seed_apps

# Run the research agent (calls Groq for each app)
python -m scripts.run_research

# Run verification on a sample
python -m scripts.verify_sample

# Run pattern analysis
python -m scripts.analyze_patterns

# Export results for the frontend
python -m scripts.export_to_json
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/apps` | List apps (filterable by category, status) |
| `POST` | `/apps` | Create a new app |
| `GET` | `/apps/{id}` | Get a single app |
| `DELETE` | `/apps/{id}` | Delete an app |
| `GET` | `/apps/{id}/auth-deep-dive` | Deep-dive: authentication architecture |
| `GET` | `/apps/{id}/api-completeness` | Deep-dive: API CRUD coverage, rate limits, webhooks |
| `GET` | `/apps/{id}/competitive-intel` | Deep-dive: market position, competitor APIs, stability |
| `GET` | `/apps/{id}/verification-challenge` | Deep-dive: 3 testable claims with verification steps |
| `GET` | `/results` | All research results (with app data) |
| `POST` | `/research/{id}` | Trigger research for a specific app |
| `GET` | `/patterns` | Pattern analysis (auth distribution, blockers, clusters) |
| `GET` | `/analysis` | Full analysis (all charts combined) |
| `GET` | `/analysis/auth` | Auth method distribution |
| `GET` | `/analysis/access-matrix` | Access model by category |
| `GET` | `/analysis/blockers` | Top integration blockers |
| `GET` | `/analysis/correlations` | Cramér's V correlations |
| `GET` | `/analysis/clusters` | KMeans tech clusters |
| `GET` | `/metrics` | Research + accuracy + output metrics |

## Frontend Tabs

| Tab | What it shows |
|-----|--------------|
| **Summary** | Metrics dashboard, research summary, auth pie chart, 5 deep-dive cards with 4 modal buttons each |
| **All Apps** | Searchable, filterable, sortable table of all researched apps |
| **Patterns** | 6 Recharts visualizations — auth distribution, access matrix, top blockers, correlations, cluster map |
| **Verification** | Accuracy breakdown by category, spot-check results |
| **Agent Log** | Timestamped event log with level filtering |

## Deep-Dive Modals

Each app card on the Summary tab has four buttons that open LLM-powered modals:

| Button | Prompt | Returns |
|--------|--------|---------|
| **Auth →** | Investigate auth architecture in detail | Primary auth method, onboarding flow/time, verification requirements, gotchas |
| **API →** | Evaluate API completeness | CRUD coverage %, rate limits, paid feature gates, webhook support, known gaps |
| **Intel →** | Competitive intelligence | Market position, competitor APIs, stability risk, ecosystem health |
| **Verify →** | Challenge 3 factual claims | Step-by-step verification, proof/disproof criteria, difficulty rating |

## Configuration

All backend config is in `backend/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | — | **Required.** Your Groq API key |
| `DATABASE_URL` | `sqlite:///./research_data/research_db.sqlite` | Database connection string |
| `RESEARCH_MODEL` | `llama-3.3-70b-versatile` | Groq model for research |
| `VERIFICATION_MODEL` | `llama-3.3-70b-versatile` | Groq model for verification |
| `LOG_LEVEL` | `INFO` | Python logging level |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Allowed CORS origins |
| `DB_ECHO` | `false` | Echo SQL queries |

To switch to PostgreSQL, update `DATABASE_URL`:

```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/toolprobe
```

## License

MIT
