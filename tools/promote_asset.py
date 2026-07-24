#!/usr/bin/env python3
"""Promote a staged candidate into art/masters + src/assets runtime webps."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def parse_size(value: str) -> tuple[int, int]:
    width, height = value.lower().split("x", 1)
    return int(width), int(height)


def export_webp(source: Image.Image, dest: Path, size: tuple[int, int], quality: int) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    resized = source.resize(size, Image.Resampling.LANCZOS)
    resized.save(dest, format="WEBP", quality=quality, method=6)
    print(f"wrote {dest.relative_to(ROOT)} ({size[0]}x{size[1]})")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("candidate", type=Path, help="Path to staged candidate PNG")
    parser.add_argument("--asset-id", required=True, help="artSeed / asset id")
    parser.add_argument(
        "--family",
        required=True,
        choices=("cards", "nobles", "environments", "ui"),
        help="Runtime folder under src/assets/",
    )
    parser.add_argument("--runtime-size", required=True, help="Desktop runtime WxH")
    parser.add_argument("--mobile-size", help="Optional @0.5x runtime WxH")
    parser.add_argument("--quality", type=int, default=82)
    parser.add_argument("--mobile-quality", type=int, default=78)
    parser.add_argument(
        "--copy-svg",
        action="store_true",
        help="Copy SVG into src/assets/<family>/ instead of converting",
    )
    args = parser.parse_args()

    candidate = args.candidate if args.candidate.is_absolute() else ROOT / args.candidate
    if not candidate.exists():
        raise SystemExit(f"candidate not found: {candidate}")

    masters_dir = ROOT / "art" / "masters"
    masters_dir.mkdir(parents=True, exist_ok=True)
    master_path = masters_dir / f"{args.asset_id}_master{candidate.suffix.lower()}"
    shutil.copy2(candidate, master_path)
    print(f"wrote {master_path.relative_to(ROOT)}")

    runtime_dir = ROOT / "src" / "assets" / args.family
    runtime_dir.mkdir(parents=True, exist_ok=True)

    if args.copy_svg or candidate.suffix.lower() == ".svg":
        dest = runtime_dir / f"{args.asset_id}{candidate.suffix.lower()}"
        shutil.copy2(candidate, dest)
        print(f"wrote {dest.relative_to(ROOT)}")
        return

    image = Image.open(candidate).convert("RGB")
    runtime_size = parse_size(args.runtime_size)
    export_webp(image, runtime_dir / f"{args.asset_id}.webp", runtime_size, args.quality)

    if args.mobile_size:
        mobile_size = parse_size(args.mobile_size)
        export_webp(
            image,
            runtime_dir / f"{args.asset_id}@0.5x.webp",
            mobile_size,
            args.mobile_quality,
        )


if __name__ == "__main__":
    main()
