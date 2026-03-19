# Multi-Modal Vision-Language Assistant

Current deployment serves a React/Vite frontend from Vercel and routes `/api/*` to a Cloudflare Worker that accepts JSON requests in the shape `{ "question": string }`.

The legacy FastAPI backend remains in this repo for local development and reference, but it is not the current production backend for `vision.blairautomate.co.uk`.

## Current Deployment

- Frontend: `https://vision.blairautomate.co.uk`
- API: `https://vision.blairautomate.co.uk/api/ask`
- Request contract: JSON only

## Project Layout

- `frontend/` - Vite + React app deployed to Vercel
- `backend/` - legacy FastAPI service kept for local development/reference
- `mmvspec.md` - Full specification and design notes

## Architecture

```mermaid
flowchart LR
  A[Frontend (Vercel)] -->|POST /api/ask JSON| B[Cloudflare Worker]
  B --> C[Worker logic]
```

- The custom domain serves the frontend at `/`.
- Cloudflare routes only `/api/*` to the Worker.
- The current API contract is text-only: `{ "question": string }`.

## Legacy Backend (Optional, Local Only)

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

This starts the older FastAPI prototype locally. It is not the backend currently used by the deployed site.

## Frontend Development

```bash
cd frontend
npm install
npm run dev
```

By default the frontend targets `https://vision.blairautomate.co.uk` and posts to `/api/ask`.

## Example API Call

```bash
curl -X POST https://vision.blairautomate.co.uk/api/ask ^
  -H "Content-Type: application/json" ^
  -d "{\"question\":\"What can you help me with?\"}"
```

## Screenshots / Demo

- TODO: add a UI screenshot
- TODO: add a short GIF walkthrough

## Docker

```bash
docker compose up --build
```

This still starts the older local FastAPI + frontend stack for development.
