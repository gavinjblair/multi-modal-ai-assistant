# Frontend: Vision-Language Assistant

React + Vite single-page UI that lets users upload an image, select a mode, and chat with the backend API.

## Quickstart

```bash
cd frontend
npm install
npm run dev
```

By default the UI targets `https://vision-api.gavinblair7.workers.dev`. Override with `VITE_API_BASE_URL` in a `.env` file if needed.

## Key Features

- Image upload with inline validation (PNG/JPEG)
- Mode selector to steer prompting style
- Chat-style transcript with auto-scroll
- Graceful error states and loading indicators
