from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
BUILD.mkdir(exist_ok=True)

SIZE = 1024
TOP = (62, 53, 72)
BOTTOM = (33, 29, 40)

canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(canvas)

for y in range(SIZE):
    t = y / (SIZE - 1)
    color = tuple(round(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3))
    draw.line([(0, y), (SIZE, y)], fill=color + (255,))

highlight = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
highlight_draw = ImageDraw.Draw(highlight)
highlight_draw.ellipse([40, 20, 760, 700], fill=(255, 255, 255, 26))
highlight = highlight.filter(ImageFilter.GaussianBlur(170))
canvas = Image.alpha_composite(canvas, highlight)

mask = Image.new("L", (SIZE, SIZE), 0)
ImageDraw.Draw(mask).rounded_rectangle(
    [0, 0, SIZE - 1, SIZE - 1], radius=218, fill=255
)
canvas.putalpha(mask)

diamond_size = 620
diamond = Image.new("RGBA", (diamond_size, diamond_size), (0, 0, 0, 0))
diamond_draw = ImageDraw.Draw(diamond)
diamond_draw.rounded_rectangle(
    [92, 92, diamond_size - 92, diamond_size - 92],
    radius=54,
    outline=(255, 249, 245, 242),
    width=31,
)
diamond = diamond.rotate(45, resample=Image.Resampling.BICUBIC, expand=True)
canvas.alpha_composite(
    diamond,
    ((SIZE - diamond.width) // 2, (SIZE - diamond.height) // 2),
)

dot_glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
dot_glow_draw = ImageDraw.Draw(dot_glow)
dot_glow_draw.ellipse([698, 190, 878, 370], fill=(239, 124, 159, 110))
dot_glow = dot_glow.filter(ImageFilter.GaussianBlur(55))
canvas = Image.alpha_composite(canvas, dot_glow)

dot = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
dot_draw = ImageDraw.Draw(dot)
dot_draw.ellipse([742, 234, 838, 330], fill=(239, 124, 159, 255))
dot_draw.ellipse([770, 252, 800, 282], fill=(255, 224, 233, 170))
canvas = Image.alpha_composite(canvas, dot)

canvas.putalpha(mask)

canvas.resize((512, 512), Image.Resampling.LANCZOS).save(BUILD / "icon.png")

canvas.resize((256, 256), Image.Resampling.LANCZOS).save(
    BUILD / "icon.ico",
    format="ICO",
    sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)

print(f"Wrote {BUILD / 'icon.png'} and {BUILD / 'icon.ico'}")
