"""Create a high-resolution background candidate with GPT Image 2.

The script reads credentials from the ignored project-level .env file and never
overwrites an existing output file.
"""

from __future__ import annotations

import argparse
import base64
import os
from pathlib import Path

import httpx
from openai import OpenAI


DEFAULT_BASE_URL = "https://api.wan91.xyz/v1"
DEFAULT_MODEL = "gpt-image-2"

RESTORE_PROMPT = """
Perform a high-fidelity restoration and detailed re-render of the supplied image.
This is restoration, not redesign.

Preserve exactly the 16:9 canvas, aerial camera, perspective, crop, terrain
geometry, coastline, rivers, roads, bridges, waterfalls, buildings, islands,
landmark positions, negative space, relative scale, and spacing. Every landmark
must remain at the same normalized x/y coordinate because the image is used under
fixed interactive map hotspots.

Keep the established Chinese watercolor fantasy-world art direction and the
original daytime palette. Improve only resolution and rendering quality: remove
blur, ringing, jagged edges, compression artifacts, muddy textures, and accidental
noise; reconstruct coherent fine detail in foliage, roofs, rock, water, clouds,
mist, and distant mountains; improve depth, material definition, and natural
lighting while retaining the original composition.

Do not add, remove, move, resize, rename, or reinterpret any landmark. Do not add
people, animals, text, labels, titles, signs, logos, watermarks, borders, UI, or
new structures. Do not change the time of day. Output a clean 3840x2160 landscape
background suitable as a website master asset.
""".strip()


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        name = name.strip()
        value = value.strip().strip('"').strip("'")
        if name and name not in os.environ:
            os.environ[name] = value


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--prompt-file", type=Path)
    parser.add_argument("--size", default="3840x2160")
    parser.add_argument("--quality", choices=("low", "medium", "high", "auto"), default="high")
    parser.add_argument("--compression", type=int, default=95)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    project_root = Path(__file__).resolve().parents[1]
    load_dotenv(project_root / ".env")

    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("OPENAI_API_KEY is missing from .env")
    if not args.input.is_file():
        raise SystemExit(f"Input image does not exist: {args.input}")
    if args.output.exists():
        raise SystemExit(f"Refusing to overwrite existing output: {args.output}")
    if not 0 <= args.compression <= 100:
        raise SystemExit("--compression must be between 0 and 100")

    prompt = RESTORE_PROMPT
    if args.prompt_file:
        prompt = args.prompt_file.read_text(encoding="utf-8").strip()

    client = OpenAI(
        api_key=api_key,
        base_url=os.environ.get("OPENAI_BASE_URL", DEFAULT_BASE_URL).rstrip("/") + "/",
        timeout=httpx.Timeout(240.0, connect=30.0),
        max_retries=1,
    )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.input.open("rb") as image_file:
        result = client.images.edit(
            model=os.environ.get("OPENAI_IMAGE_MODEL", DEFAULT_MODEL),
            image=image_file,
            prompt=prompt,
            size=args.size,
            quality=args.quality,
            output_format="webp",
            output_compression=args.compression,
            n=1,
        )

    image = result.data[0]
    if image.b64_json:
        payload = base64.b64decode(image.b64_json)
    elif image.url:
        response = httpx.get(image.url, timeout=120.0, follow_redirects=True)
        response.raise_for_status()
        payload = response.content
    else:
        raise RuntimeError("The gateway returned neither b64_json nor an image URL")

    args.output.write_bytes(payload)
    print(f"saved={args.output}")
    print(f"bytes={len(payload)}")


if __name__ == "__main__":
    main()
