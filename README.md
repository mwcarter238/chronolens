# ChronoLens — Timesheet Calculator

Precision time tracking with a liquid glass UI. Tap to start, tap to stop.

## Quick Start

```bash
cd ~/chronolens
./start.sh
```

Then open **http://localhost:5173** in your browser.

---

## Architecture

```
chronolens/
├── backend/         # FastAPI (Python) REST API
│   ├── app/
│   │   ├── main.py          # App + CORS + routing
│   │   ├── models.py        # SQLAlchemy ORM models
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   ├── auth.py          # JWT + bcrypt utilities
│   │   ├── deps.py          # FastAPI dependency injection
│   │   └── routers/
│   │       ├── auth.py      # /api/v1/auth/*
│   │       ├── paycodes.py  # /api/v1/paycodes/*
│   │       ├── entries.py   # /api/v1/entries/*
│   │       └── reports.py   # /api/v1/reports/*
│   └── requirements.txt
└── frontend/        # React 18 + TypeScript + Tailwind CSS
    └── src/
        ├── pages/
        │   ├── Login.tsx      # Auth (login + register)
        │   ├── Dashboard.tsx  # Paycode list + live timer
        │   ├── Reports.tsx    # Daily / Weekly / Monthly
        │   └── Paycodes.tsx   # Paycode management
        ├── hooks/useTimer.ts  # Live elapsed time hook
        └── stores/            # Zustand auth store
```

## Manual Setup

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API explorer: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Login, get token |
| GET | `/api/v1/auth/me` | Current user |
| GET | `/api/v1/paycodes` | List paycodes |
| POST | `/api/v1/paycodes` | Create paycode |
| PATCH | `/api/v1/paycodes/{id}` | Update paycode |
| DELETE | `/api/v1/paycodes/{id}` | Archive paycode |
| POST | `/api/v1/entries/start` | Start timer |
| POST | `/api/v1/entries/stop` | Stop active timer |
| GET | `/api/v1/entries/active` | Get running entry |
| GET | `/api/v1/entries` | List entries |
| GET | `/api/v1/reports/daily` | Daily report |
| GET | `/api/v1/reports/weekly` | Weekly report |
| GET | `/api/v1/reports/monthly` | Monthly report |

## Configuration

Edit `backend/.env` to change settings:

```env
DATABASE_URL=sqlite:///./chronolens.db   # or postgres://...
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=10080        # 7 days
CORS_ORIGINS=http://localhost:5173
```

## Free Deployment

Deploy the backend on **Render** and the frontend on **Vercel** — both are free.

### 1 · Push to GitHub

Make sure your repo is on GitHub (private is fine for both services).

### 2 · Deploy the backend on Render

1. Go to [render.com](https://render.com) → **New → Blueprint**
2. Connect your GitHub repo — Render will detect `render.yaml` automatically
3. Click **Apply** — this creates a **Python web service** (`chronolens-api`) running FastAPI with SQLite
4. Once deployed, open the service → **Environment** and add:
   - `CORS_ORIGINS` → your Vercel URL (e.g. `https://chronolens.vercel.app`)
   - `APP_URL` → same Vercel URL (used in invite email links)
5. Copy the service URL (e.g. `https://chronolens-api.onrender.com`) — you'll need it for step 3.

> **Free tier note:** The service spins down after 15 minutes of inactivity. The first request after that takes ~30 seconds to warm up.

### 3 · Deploy the frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
2. Set **Root Directory** to `frontend`
3. Add an **Environment Variable**:
   - `VITE_API_URL` → your Render service URL (e.g. `https://chronolens-api.onrender.com`)
4. Click **Deploy** — Vercel will run `npm run build` and serve the `dist/` folder

That's it. Your app will be live at `https://your-project.vercel.app`.

---

## Key UX Behaviours

- **Tap to start** a paycode timer — zero modals
- **Tap again** the active paycode to stop it
- **Auto-stop** — tapping a different paycode stops the current one
- **Reports default to Weekly** — the most useful view
- **All timestamps** stored and calculated in UTC

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.12 · FastAPI · SQLAlchemy 2.0 · SQLite |
| Auth | JWT (python-jose) · bcrypt |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS 3 |
| State | Zustand (auth) · TanStack Query v5 (server state) |
| Routing | React Router v6 |
