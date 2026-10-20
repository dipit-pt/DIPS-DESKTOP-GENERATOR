"""Generate Electrobun platform icons from an optional HTTPS PNG/JPEG/WebP URL."""
import io
import os
import pathlib
import subprocess
import sys
import urllib.request

url = os.environ.get("APP_ICON_URL", "").strip()
if not url:
    print("No custom icon URL supplied; using framework defaults.")
    sys.exit(0)
if not url.startswith("https://"):
    raise SystemExit("Custom icon URL must start with https://")
req = urllib.request.Request(url, headers={"User-Agent": "DIPIT-Desktop-Build/1"})
with urllib.request.urlopen(req, timeout=25) as response:
    if response.geturl().split(":", 1)[0] != "https":
        raise SystemExit("Icon redirects must remain HTTPS")
    data = response.read(10 * 1024 * 1024 + 1)
if len(data) > 10 * 1024 * 1024:
    raise SystemExit("Icon is too large (maximum 10 MiB)")
from PIL import Image
image = Image.open(io.BytesIO(data))
image.load()
if max(image.size) > 8192 or min(image.size) < 64:
    raise SystemExit("Icon must be at least 64x64 and no more than 8192 pixels per side")
image = image.convert("RGBA")
if image.width != image.height:
    raise SystemExit("Icon must be a square image")
root = pathlib.Path("generated-icons")
root.mkdir(exist_ok=True)
image.resize((512, 512), Image.Resampling.LANCZOS).save(root / "icon.png")
image.save(root / "icon.ico", format="ICO", sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
if sys.platform == "darwin":
    iconset = root / "icon.iconset"
    iconset.mkdir(exist_ok=True)
    for size in (16, 32, 128, 256, 512):
        image.resize((size, size), Image.Resampling.LANCZOS).save(iconset / f"icon_{size}x{size}.png")
        image.resize((size * 2, size * 2), Image.Resampling.LANCZOS).save(iconset / f"icon_{size}x{size}@2x.png")
    subprocess.run(["iconutil", "-c", "icns", str(iconset), "-o", str(root / "icon.icns")], check=True)
print("Prepared branded icons in", root)
