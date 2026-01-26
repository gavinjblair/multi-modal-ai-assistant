from io import BytesIO

from PIL import Image

from app.utils.image_preprocess import MAX_DIMENSION, preprocess_image_bytes


def _make_image_bytes(size: tuple[int, int], fmt: str = "PNG") -> bytes:
    image = Image.new("RGB", size, color=(120, 120, 120))
    buffer = BytesIO()
    image.save(buffer, format=fmt)
    return buffer.getvalue()


def test_preprocess_keeps_small_image() -> None:
    original = _make_image_bytes((128, 128))
    processed = preprocess_image_bytes(original)
    assert processed == original


def test_preprocess_resizes_large_image() -> None:
    original = _make_image_bytes((2000, 1000))
    processed = preprocess_image_bytes(original)
    with Image.open(BytesIO(processed)) as img:
        assert max(img.size) == MAX_DIMENSION
        assert img.format == "JPEG"
