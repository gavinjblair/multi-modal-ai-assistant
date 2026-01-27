import base64
import logging

from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

from app.config import IS_PROD, ENV, get_settings
from app.service import run_inference

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://vision.blairautomate.co.uk",
        "https://multi-modal-ai-assistant-production.up.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("app")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)
_settings = get_settings()
logger.info(
    "ENV=%s resolved_backend=%s OLLAMA_BASE_URL=%s",
    ENV,
    _settings.resolved_backend(),
    _settings.ollama_base_url,
)


@app.post("/api/ask")
async def ask(
    request: Request,
    image: UploadFile | None = File(None),
    question: str | None = Form(None),
    mode: str = Form("general"),
    session_id: str | None = Form(None),
    backend: str | None = Form(None),
):
    settings = get_settings()

    resolved_backend = "ollama" if IS_PROD else (backend or settings.resolved_backend())

    issue = settings.backend_config_issue(resolved_backend)
    if issue:
        raise HTTPException(status_code=500, detail=issue)

    logger.info("Resolved backend: %s", resolved_backend)

    payload = {}
    if image is None and question is None:
        try:
            payload = await request.json()
        except Exception as exc:
            logger.exception("Failed to parse JSON payload.")
            raise HTTPException(status_code=400, detail="Invalid JSON payload.") from exc
    else:
        if image is None or question is None:
            raise HTTPException(status_code=400, detail="Missing image or question.")
        image_bytes = await image.read()
        payload = {
            "image": base64.b64encode(image_bytes).decode("utf-8"),
            "question": question,
            "mode": mode,
            "session_id": session_id,
        }

    logger.info(
        "Request payload keys=%s mode=%s has_image=%s",
        sorted(payload.keys()),
        payload.get("mode"),
        "image" in payload,
    )

    try:
        return await run_inference(payload, resolved_backend, settings)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Inference failed.")
        raise HTTPException(status_code=500, detail="Inference failed") from exc
