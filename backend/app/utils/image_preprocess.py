"""Image preprocessing helpers for VLM requests."""

from __future__ import annotations

from io import BytesIO

from PIL import Image

MAX_DIMENSION = 1536
JPEG_QUALITY = 85


def preprocess_image_bytes(image_bytes: bytes) -> bytes:
    """Resize large images and convert to JPEG for faster inference."""
    with Image.open(BytesIO(image_bytes)) as img:
        width, height = img.size
        max_dim = max(width, height)
        if max_dim <= MAX_DIMENSION:
            return image_bytes

        scale = MAX_DIMENSION / max_dim
        new_size = (max(1, int(width * scale)), max(1, int(height * scale)))
        resized = img.resize(new_size, Image.LANCZOS)
        if resized.mode != "RGB":
            resized = resized.convert("RGB")

        output = BytesIO()
        resized.save(output, format="JPEG", quality=JPEG_QUALITY, optimize=True)
        return output.getvalue()
