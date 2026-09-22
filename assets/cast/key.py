"""Key the white background out of the Higgsfield character clips.

Only white that touches the frame edge is removed, so whites inside a
character (paper, speech bubble, glasses) stay solid. Exports, per clip:
  <name>.webm  VP9 + alpha   (Chrome, Edge, Firefox)
  <name>.mov   HEVC + alpha  (Safari)
  <name>.png   first frame   (poster / reduced motion)
"""
import pathlib, shutil, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

HERE = pathlib.Path(__file__).parent
SRC = HERE / "src"
CLIPS = {  # name: output width (height follows the aspect ratio)
    "tade-walk": 480, "sage-think": 480, "kemi-talk": 480, "tade-puzzled": 480,
    "trio-wave": 840, "trio-cheer": 840,
}
WHITE = 226  # a pixel is "paper" when all channels are at least this bright


def key_frame(im: Image.Image) -> Image.Image:
    rgb = np.asarray(im.convert("RGB"))
    paper = (rgb.min(axis=2) >= WHITE).astype(np.uint8) * 255
    # Pad with paper so one flood from the corner reaches every edge.
    h, w = paper.shape
    padded = np.full((h + 2, w + 2), 255, np.uint8)
    padded[1:-1, 1:-1] = paper
    mask = Image.fromarray(padded, "L").copy()  # fromarray shares a read-only buffer; floodfill needs its own
    ImageDraw.floodfill(mask, (0, 0), 128, thresh=0)
    bg = np.asarray(mask)[1:-1, 1:-1] == 128
    alpha = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8), "L")
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.7))  # soften the cut edge
    out = im.convert("RGBA")
    out.putalpha(alpha)
    return out


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def process(name: str, width: int):
    src = SRC / f"v-{name}.mp4"
    with tempfile.TemporaryDirectory() as tmp:
        tmp = pathlib.Path(tmp)
        run(["ffmpeg", "-y", "-i", str(src), "-vf", f"scale={width}:-2:flags=lanczos", str(tmp / "in%04d.png")])
        frames = sorted(tmp.glob("in*.png"))
        keyed = [key_frame(Image.open(f)) for f in frames]
        # Crop to the area the character moves through across the whole clip (+ a little air).
        boxes = [k.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox() for k in keyed]
        boxes = [b for b in boxes if b]
        pad = 10
        x0 = max(min(b[0] for b in boxes) - pad, 0); y0 = max(min(b[1] for b in boxes) - pad, 0)
        x1 = min(max(b[2] for b in boxes) + pad, keyed[0].width); y1 = min(max(b[3] for b in boxes) + pad, keyed[0].height)
        x1 -= (x1 - x0) % 2; y1 -= (y1 - y0) % 2  # even dimensions for the encoders
        for i, k in enumerate(keyed):
            k.crop((x0, y0, x1, y1)).save(tmp / f"out{i:04d}.png")
        shutil.copy(tmp / "out0000.png", HERE / f"{name}.png")
        pat = str(tmp / "out%04d.png")
        run(["ffmpeg", "-y", "-framerate", "24", "-i", pat, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p",
             "-b:v", "0", "-crf", "36", "-row-mt", "1", "-an", str(HERE / f"{name}.webm")])
        run(["ffmpeg", "-y", "-framerate", "24", "-i", pat, "-c:v", "hevc_videotoolbox", "-alpha_quality", "0.8",
             "-allow_sw", "1", "-b:v", "1200k", "-tag:v", "hvc1", "-an", str(HERE / f"{name}.mov")])
    print(name, len(frames), "frames")


if __name__ == "__main__":
    for n in (sys.argv[1:] or CLIPS):
        process(n, CLIPS[n])
