import logging
import httpx
from backend.utils.retry_logic import retry_with_backoff

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 15.0


async def fetch_url(url: str, timeout: float = DEFAULT_TIMEOUT) -> str:
    async def _get():
        async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
            resp = await client.get(url, headers={"User-Agent": "ToolProbe/0.1"})
            resp.raise_for_status()
            return resp.text

    html = await retry_with_backoff(_get)
    logger.debug("Fetched %s (%d bytes)", url, len(html))
    return html


async def fetch_json(url: str, timeout: float = DEFAULT_TIMEOUT) -> dict | list:
    async def _get():
        async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
            resp = await client.get(url, headers={"User-Agent": "ToolProbe/0.1"})
            resp.raise_for_status()
            return resp.json()

    data = await retry_with_backoff(_get)
    logger.debug("Fetched JSON from %s", url)
    return data
