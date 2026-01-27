import logging

import httpx
from fastapi import HTTPException

logger = logging.getLogger("app.remote")


async def run_remote(payload: dict, settings):
    if not settings.vlm_api_base_url:
        raise HTTPException(status_code=500, detail="vlm_api_base_url is not set")

    logger.info("Remote backend URL=%s", settings.vlm_api_base_url)
    logger.info("Remote payload keys=%s", sorted(payload.keys()))
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                settings.vlm_api_base_url,
                json=payload,
            )
            logger.info("Remote status=%s", response.status_code)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        logger.exception("Remote backend returned error status.")
        raise HTTPException(status_code=502, detail="Model backend error.") from exc
    except httpx.HTTPError as exc:
        logger.exception("HTTP error contacting remote backend.")
        raise HTTPException(status_code=502, detail="Model backend error.") from exc
