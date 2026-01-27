from app.config import IS_PROD


async def run_ollama(payload: dict, settings):
    if IS_PROD:
        raise RuntimeError("Ollama is disabled in production")

    raise RuntimeError("Ollama not implemented in this environment")
