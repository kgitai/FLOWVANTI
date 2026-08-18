"""Create FLOWVANTI.ico from the navy/teal FV mark."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def rounded_rect(draw: ImageDraw.ImageDraw, box, radius: int, fill) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def draw_mark(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = max(1, size // 16)
    radius = max(2, size // 5)
    rounded_rect(draw, (pad, pad, size - 1 - pad, size - 1 - pad), radius, (11, 14, 20, 255))
    inset = pad + max(1, size // 32)
    draw.rounded_rectangle(
        (inset, inset, size - 1 - inset, size - 1 - inset),
        radius=max(1, radius - 1),
        outline=(0, 209, 209, 255),
        width=max(1, size // 32),
    )
    text = "FV"
    font = None
    for name in ("segoeui.ttf", "SegoeUI.ttf", "arialbd.ttf", "arial.ttf"):
        path = os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts", name)
        if os.path.isfile(path):
            try:
                font = ImageFont.truetype(path, max(10, int(size * 0.42)))
                break
            except OSError:
                pass
    if font is None:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1] - size * 0.02
    draw.text((x, y), text, font=font, fill=(0, 209, 209, 255))
    return img


def main() -> None:
    out_dir = Path(__file__).resolve().parent
    sizes = [16, 24, 32, 48, 64, 128, 256]
    images = [draw_mark(s) for s in sizes]
    ico = out_dir / "flowvanti.ico"
    images[-1].save(ico, format="ICO", sizes=[(s, s) for s in sizes])
    images[-1].save(out_dir / "flowvanti.png")
    print("Wrote", ico)


if __name__ == "__main__":
    main()
