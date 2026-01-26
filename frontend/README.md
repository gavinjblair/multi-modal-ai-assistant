# Frontend: Vision-Language Assistant

React + Vite single-page UI that lets users upload an image, select a mode, and chat with the backend API.

## Quickstart

```bash
cd frontend
npm install
npm run dev
```

By default the UI expects the backend at `http://127.0.0.1:8000`. Override with `VITE_API_BASE_URL` in a `.env` file.

## Key Features

- Image upload with inline validation (PNG/JPEG)
- Mode selector to steer prompting style
- Chat-style transcript with auto-scroll
- Graceful error states and loading indicators
