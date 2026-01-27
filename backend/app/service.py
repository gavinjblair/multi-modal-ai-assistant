from app.providers.ollama_provider import run_ollama
from app.providers.remote_provider import run_remote


async def run_inference(payload: dict, backend: str, settings):
    if backend == "remote":
        return await run_remote(payload, settings)

    if backend == "ollama":
        return await run_ollama(payload, settings)

    raise RuntimeError(f"Unknown backend: {backend}")
