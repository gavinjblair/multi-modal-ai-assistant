from fastapi import FastAPI, HTTPException
from app.config import IS_PROD, ENV, get_settings
from app.service import run_inference

app = FastAPI()


@app.post("/api/ask")
async def ask(payload: dict):
    settings = get_settings()

    backend = settings.resolved_backend()

    issue = settings.backend_config_issue(backend)
    if issue:
        raise HTTPException(status_code=500, detail=issue)

    print(f"[BOOT] ENV={ENV} | backend={backend}")

    try:
        return await run_inference(payload, backend, settings)
    except Exception as e:
        print("[ERROR]", str(e))
        raise HTTPException(status_code=500, detail="Inference failed")
