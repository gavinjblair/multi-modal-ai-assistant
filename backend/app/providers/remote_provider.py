import httpx


async def run_remote(payload: dict, settings):
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            settings.vlm_api_base_url,
            json=payload,
        )
        response.raise_for_status()
        return response.json()
