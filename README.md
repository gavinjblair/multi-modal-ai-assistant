# Multi-Modal Vision-Language Assistant

Starter implementation that follows the provided multimodal assistant specification. It includes a FastAPI backend with a swap-friendly vision-language model wrapper and a React/Vite frontend for image upload plus chat.

## Quickstart (No Key)

```bash
docker compose up --build
```

Open `http://localhost:3000` in your browser. The default Docker setup uses the local Ollama backend and will pull the `moondream:1.8b` model on first run.

## Project Layout

- `backend/` - FastAPI service exposing `/api/ask` and `/health`
- `frontend/` - React UI with image uploader, chat window, and mode selector
- `mmvspec.md` - Full specification and design notes

## Architecture

```mermaid
flowchart LR
  A[Frontend (React/Vite)] -->|image + question| B[FastAPI /api/ask]
  B --> C{VLM backend}
  C --> E[Ollama]
  C --> F[Stub]
  B <-->|session history| R[(Redis optional)]
```

- The browser uploads an image and question.
- The FastAPI backend validates inputs, maintains per-session chat history, and routes requests to a provider.
- Providers include Ollama or a local stub fallback.

## Running the Backend (venv)

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Environment variables (examples in `backend/.env.example`):

```
VLM_BACKEND=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=moondream:1.8b
SESSION_STORE=memory
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
REQUEST_TIMEOUT=120
```

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

Point `VITE_API_BASE_URL` to the backend if it is not running on `http://127.0.0.1:8000`.

## Example API Call

```bash
curl -X POST http://127.0.0.1:8000/api/ask ^
  -F "image=@example.png" ^
  -F "question=What is in this image?" ^
  -F "mode=general"
```

## Screenshots / Demo

- TODO: add a UI screenshot
- TODO: add a short GIF walkthrough

## Docker

```bash
docker compose up --build
```

This starts the backend on `8000` and the frontend on `3000`.
