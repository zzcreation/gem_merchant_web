#!/usr/bin/env python3
"""Deterministic QA checks for game art staging assets."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image


def check_basic(path: Path, expected_size: tuple[int, int] | None = None) -> list[str]:
    issues: list[str] = []
    im = Image.open(path)
    print(f"size: {im.size} mode: {im.mode}")
    if expected_size and im.size != expected_size:
        issues.append(f"size mismatch: got {im.size}, expected {expected_size}")
    return issues


def check_alpha(path: Path, min_padding_ratio: float = 0.02) -> list[str]:
    issues: list[str] = []
    im = Image.open(path).convert("RGBA")
    alpha = im.getchannel("A")
    w, h = im.size
    lo, hi = alpha.getextrema()
    if lo >= 255:
        issues.append("no transparent pixels (matte background?)")
        return issues

    corners = [alpha.getpixel(p) for p in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]]
    if max(corners) > 0:
        issues.append(f"corners not fully transparent: {corners}")

    bbox = alpha.getbbox()
    if not bbox:
        issues.append("empty alpha bbox")
        return issues

    pad = min(bbox[0], bbox[1], w - bbox[2], h - bbox[3])
    pad_ratio = pad / w
    print(f"content bbox {bbox}, min padding {pad}px ({100 * pad_ratio:.1f}%)")
    if pad_ratio < min_padding_ratio:
        issues.append("subject touches edge / insufficient padding")

    for name, bg in [("black", (0, 0, 0)), ("white", (255, 255, 255))]:
        canvas = Image.new("RGB", im.size, bg)
        canvas.paste(im, mask=alpha)
        preview = path.with_name(path.stem + f"_over_{name}{path.suffix}")
        canvas.save(preview)
        print(f"wrote preview: {preview.name}")

    return issues


def write_runtime_preview(path: Path, target: tuple[int, int]) -> Path:
    im = Image.open(path)
    preview = path.with_name(path.stem + "_runtime_preview" + path.suffix)
    im.resize(target, Image.LANCZOS).save(preview)
    print(f"wrote runtime preview: {preview} ({target[0]}x{target[1]})")
    return preview


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a staged game art asset")
    parser.add_argument("image", type=Path)
    parser.add_argument("--alpha", action="store_true", help="Run transparent-alpha checks")
    parser.add_argument("--expected-size", type=str, help="WxH e.g. 1024x1536")
    parser.add_argument("--runtime-size", type=str, help="WxH for readability preview")
    parser.add_argument("--json-out", type=Path, help="Write QA result JSON")
    args = parser.parse_args()

    if not args.image.exists():
        print(f"ERROR: file not found: {args.image}", file=sys.stderr)
        return 1

    expected = None
    if args.expected_size:
        w, h = args.expected_size.lower().split("x")
        expected = (int(w), int(h))

    issues = check_basic(args.image, expected)
    if args.alpha:
        issues.extend(check_alpha(args.image))

    runtime = None
    if args.runtime_size:
        w, h = args.runtime_size.lower().split("x")
        runtime = write_runtime_preview(args.image, (int(w), int(h)))

    status = "pass" if not issues else "fail"
    print(f"QA status: {status}")
    for issue in issues:
        print(f"  - {issue}")

    if args.json_out:
        payload = {
            "image": str(args.image),
            "status": status,
            "issues": issues,
            "runtimePreview": str(runtime) if runtime else None,
        }
        args.json_out.write_text(json.dumps(payload, indent=2) + "\n")

    return 0 if status == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
