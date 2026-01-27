from app.providers.ollama_provider import run_ollama
from app.providers.remote_provider import run_remote
from app.services.vlm_service import _format_answer


async def run_inference(payload: dict, backend: str, settings):
    if backend == "remote":
        result = await run_remote(payload, settings)
        if isinstance(result, dict) and "answer" in result:
            result["answer"] = _format_answer(payload.get("mode") or "general", result["answer"])
        return result

    if backend == "ollama":
        result = await run_ollama(payload, settings)
        if isinstance(result, dict) and "answer" in result:
            result["answer"] = _format_answer(payload.get("mode") or "general", result["answer"])
        return result

    raise RuntimeError(f"Unknown backend: {backend}")
