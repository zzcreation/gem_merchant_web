---
name: game-art
description: Use when creating, editing, validating, importing, optimizing, or organizing visual game assets for gem_merchant_web (development card art, noble tile art, gem token icons, UI art, backgrounds).
---

# Game Art Skill — gem_merchant_web

Production workflow for AI-generated visual assets in this project.

Core principle: never place a generated image directly into the runtime asset folder. Every asset goes through classify → spec → generate into staging → runnable QA → deterministic post-processing → promote. Generated images are source material until they pass QA.

---

## Project Context

This is an original-art Splendor-style web board game (React + Vite + Cloudflare Worker). Reference: `docs/PRODUCT.md`.

Asset inventory the game actually needs:

| Asset family | Count | Shape | Route |
|---|---|---|---|
| Development card face art | 90 (L1 40 / L2 30 / L3 20) | portrait ~2:3 | opaque generation |
| Noble tile art | 10 | square 1:1 | opaque generation |
| Gem token icons (white/blue/green/red/black + gold) | 6 | square, alpha | SVG preferred |
| Gameplay UI icons (actions, prestige, counters) | as needed | square, alpha | SVG preferred |
| Decorative UI / backgrounds (table felt, lobby) | few | wide | opaque generation |

Project conventions that override any generic defaults:

- **`artSeed` is the asset key.** Every development card and noble in `shared/game/data/` carries an `artSeed` string (e.g. `moon-market-apprentice`, `guild-patron-emerald-court`). Card/noble art files MUST be named by artSeed so code can resolve them without a lookup table:
  - staging: `art/staging/<artSeed>/<timestamp>/`
  - master: `art/masters/<artSeed>_master.png`
  - runtime: `src/assets/cards/<artSeed>.webp` and `src/assets/nobles/<artSeed>.webp`
- **Runtime assets live under `src/assets/`** (bundled by Vite via `import.meta.glob`), per `docs/PRODUCT.md` §12.2. Do not create `public/assets/`.
- **Pipeline files live under `art/`** (staging, masters, provenance). `art/` is source material and must not be imported by runtime code.
- **Art bible lives at `art/bible/`.** IP: **兔拉崩吧 (Tulabunba)** — soft high-fantasy bunnyfolk gem merchants. Primary reference: `art/bible/references/tulabunba-key-art.png`. Read `visual-style.md`, `palette.json`, `prompt-blocks.md`, and `negative-prompt-blocks.md` before generating. If the bible is still marked draft, say so and do not invent conflicting direction.
- Wave 1 (2026-07-09) dark human craftsman staging is **superseded** — do not promote it.
- The current placeholder pipeline (lucide icon + artSeed text in `src/App.tsx`) stays until approved bunnyfolk art is promoted; replacing it is a code change, not an art promotion.
- UI remains a board-game table (high information density); splash/key art may be brighter pastel kingdom, but in-game card art must stay readable on cream card chrome.

---

## Generation Mechanism (verified 2026-07-09)

Generate with OpenClaw's built-in image tool (`image_generate` in agent sessions), or the CLI equivalent:

```bash
openclaw infer image generate \
  --model openai/gpt-image-2 \
  --prompt "..." \
  --output-format png \
  --size 1024x1536 \
  --output art/staging/<artSeed>/<timestamp>/<artSeed>_candidate_01.png
```

Environment facts (verified against this machine's OpenClaw config and live API calls):

- OpenAI auth is **OAuth only** (`openai:hoho.unhnh@gmail.com`, Codex subscription). No `OPENAI_API_KEY` is configured.
- Under OAuth, images route through the Codex Responses transport. `gpt-image-2` and `gpt-image-1.5` both generate successfully.
- **`background: transparent` FAILS under OAuth** (HTTP 400, "Transparent background is not supported for this model") — even for `gpt-image-1.5`, because the Codex tool surface does not expose transparency. Do not retry with different parameters; use the cutout fallback below.
- Native transparency (`gpt-image-1.5` + `background: transparent`) only works with a platform API key via the direct Images API. If the user adds `OPENAI_API_KEY` or an api_key auth profile, prefer that path for transparent assets.
- Under the OAuth transport, `--size` is a hint, not a guarantee (a 1024x1024 request returned 1254x1254). Always verify actual dimensions in QA and resize deterministically afterwards.
- Supported size hints: `1024x1024`, `1536x1024`, `1024x1536`, `2048x2048`, `2048x1152`, `3840x2160`. Do not use DALL·E-era sizes like 1792x1024.
- Default model when unspecified is `gpt-image-2`. Default timeout 180s; `gpt-image-2` takes ~30–170s per image. Generate candidates sequentially, not in parallel bursts.

### Transparent-asset fallback (current environment)

Since native transparency is unavailable:

1. First ask: should this be SVG? Gem icons and gameplay UI symbols should be hand-authored SVG (flat shapes, exact palette colors) — no generation, no cutout, no QA pipeline needed.
2. If it must be raster: generate opaque on a flat, uniform background that contrasts with the subject (prompt: "isolated on a plain solid #FFFFFF background, no shadow, no gradient"), then cut out locally with the deterministic script in the QA section (PIL is available; ImageMagick is not installed).
3. Flat-color keying leaves halos on soft edges. Run the alpha QA checks after cutout, and prefer subjects with hard edges. If quality is insufficient, report that native transparency requires an API key rather than promoting a bad cutout.

---

## Routing Table (single source of truth)

| Asset type | Model | Size hint | Background |
|---|---|---|---|
| card_face_art (per artSeed) | openai/gpt-image-2 | 1024x1536 | opaque |
| noble_art (per artSeed) | openai/gpt-image-2 | 1024x1024 | opaque |
| environment / background / key art | openai/gpt-image-2 | 2048x1152 | opaque |
| style_exploration / concept | openai/gpt-image-2 | 1024x1024 | opaque |
| gem_token_icon, gameplay_ui_icon | hand-authored SVG | — | inherent alpha |
| decorative_ui_asset, sprite, collectible, vfx (raster, needs alpha) | openai/gpt-image-1.5 * | 1024x1024 | transparent if API key, else opaque + local cutout |
| background_removal_edit | openai/gpt-image-1.5 * | match source | same as above |

\* `gpt-image-1.5` is the only OpenAI model with native transparency support; `gpt-image-2` rejects `background: transparent` at the API level. Under the current OAuth-only auth, neither gets native transparency — use the fallback above.

If a spec or user request conflicts with this table, follow the user request and note the conflict.

---

## Minimal Asset Spec

For a new asset without a spec, record a short spec in the staging folder before generating:

```yaml
id: <artSeed or snake_case id>
type: card_face_art | noble_art | environment | decorative_ui_asset | ...
game_role: one line on where this appears in the game
target: { width: 512, height: 768, runtime_format: webp, alpha_required: false }
source: { width: 1024, height: 1536 }
generation: { model: openai/gpt-image-2, background: opaque }
qa: { human_approval_required: true }
```

Default runtime sizes (confirm against actual UI layout before finalizing): card art 512x768, noble art 512x512, backgrounds sized per layout.

---

## Prompt Construction

Every prompt includes: asset identity, game role, visual style, view/framing, silhouette requirement, palette, background requirement, and forbidden elements.

Standard suffixes:

- All assets: `no text, no logo, no watermark, no signature, no frame, no border, no cropped edges`
- Assets destined for cutout: `isolated, centered, full object visible, clean silhouette, plain solid white background, no shadow, no gradient`
- Small-size assets: `game-ready, clear readable silhouette, simple shape language, readable at small size`
- Card art: include the artSeed's theme words (e.g. `moon-market-apprentice` → a young apprentice at a moonlit gem market) and the shared card-frame-free framing — frames/borders are rendered by the UI, not baked into art.

Negative prompts are not supported on gpt-image models; bake restrictions into the main prompt.

---

## Workflow

1. Classify the asset against the routing table.
2. Read `art/bible/` and any existing spec; if absent, write a minimal spec.
3. Generate into `art/staging/<asset-id>/<timestamp>/` (asset-id = artSeed for cards/nobles). Never overwrite approved masters or the original source of an edit.
4. Staging folder contents:

```text
asset-spec.yaml
prompt.txt
<asset_id>_candidate_01.png   # always numbered, even for a single candidate
qa-report.md
provenance.json
```

5. Run the QA checks below; write results to `qa-report.md`.
6. Post-process deterministically (resize/convert/cutout) — never re-generate to fix mechanical issues.
7. Promote only after QA passes (and human approval where required): master to `art/masters/`, runtime file to `src/assets/...`.

You MAY create and commit QA/post-processing scripts under `tools/` (e.g. `tools/validate_asset.py`) when a check is needed repeatedly — deterministic tooling is part of this pipeline, not scope creep. There are currently no `asset:*` npm scripts; don't reference nonexistent ones.

---

## Runnable QA

PIL (Pillow 12.x) is installed; ImageMagick is not. Run these, don't eyeball them.

### Basic checks (all assets)

```bash
python3 - "$IMG" <<'EOF'
import sys
from PIL import Image
im = Image.open(sys.argv[1])
print("size:", im.size, "mode:", im.mode)
# verify actual size matches spec source size (OAuth transport treats size as a hint)
EOF
```

Manual checks: matches request and style guardrails, no text/watermark/signature, subject not cropped, important elements away from edges.

### Alpha QA (transparent assets, after cutout or native generation)

```bash
python3 - "$IMG" <<'EOF'
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert("RGBA")
a = im.getchannel("A")
w, h = im.size
lo, hi = a.getextrema()
assert lo < 255, "FAIL: no transparent pixels (matte background?)"
corners = [a.getpixel(p) for p in [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]]
assert max(corners) == 0, f"FAIL: corners not fully transparent: {corners}"
bbox = a.getbbox()
pad = min(bbox[0], bbox[1], w-bbox[2], h-bbox[3])
print(f"content bbox {bbox}, min padding {pad}px ({100*pad/w:.1f}%)")
assert pad >= w * 0.02, "FAIL: subject touches edge / insufficient padding"
# halo check: composite over black and white, save previews for visual review
for name, bg in [("black", (0,0,0)), ("white", (255,255,255))]:
    canvas = Image.new("RGB", im.size, bg)
    canvas.paste(im, mask=a)
    canvas.save(sys.argv[1].replace(".png", f"_over_{name}.png"))
print("OK: alpha checks passed; review _over_black/_over_white previews for halos")
EOF
```

### Readability at runtime size

Downscale to the runtime target and inspect the result — approve at runtime size, not at 1024px:

```bash
python3 - "$IMG" <<'EOF'
import sys
from PIL import Image
im = Image.open(sys.argv[1])
im.resize((im.width//4, im.height//4), Image.LANCZOS).save(sys.argv[1].replace(".png", "_runtime_preview.png"))
EOF
```

### Flat-background cutout (fallback for transparent assets)

```bash
python3 - "$IMG" <<'EOF'
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert("RGBA")
bg = im.getpixel((2, 2))  # sample background from corner
tol = 24
px = im.load()
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        if abs(r-bg[0]) < tol and abs(g-bg[1]) < tol and abs(b-bg[2]) < tol:
            px[x, y] = (r, g, b, 0)
im.save(sys.argv[1].replace(".png", "_cutout.png"))
print("cutout saved; now run alpha QA on it")
EOF
```

If any check fails, the asset stays in staging. Fix mechanical failures with deterministic tools; fix content failures by regenerating with an adjusted prompt.

---

## Provenance

Save `provenance.json` next to every candidate:

```json
{
  "assetId": "moon-market-apprentice",
  "assetType": "card_face_art",
  "model": "openai/gpt-image-2",
  "transport": "codex-responses-oauth",
  "background": "opaque",
  "promptFile": "prompt.txt",
  "sourceImages": [],
  "generatedAt": "ISO_DATE",
  "approved": false,
  "notes": ""
}
```

---

## Naming

Lowercase snake_case / kebab-case matching the artSeed exactly. Candidates: `<asset_id>_candidate_01.png`. Masters: `<asset_id>_master.png`. Runtime: `<asset_id>.webp` in the family folder under `src/assets/`. Never `final.png`, `test.png`, `asset1.png`, or duplicate asset ids.

---

## Human Approval

Required before promoting: card face art, noble art, gem/UI icons used for gameplay decisions, backgrounds, and anything defining visual identity — i.e. effectively all promotions in this project right now, because the art direction question is still open. May be skipped for throwaway placeholders and style explorations that stay in staging.

---

## Do Not

- Put generated files into `src/assets/` without QA and approval.
- Overwrite approved masters or edit sources.
- Use `gpt-image-2` for an asset that requires native transparency, or retry `background: transparent` under OAuth expecting a different result.
- Generate gameplay-critical icons as raster when SVG is the right answer.
- Accept watermarked, signed, or text-corrupted images.
- Ship assets without provenance, or commit staging/masters into `src/assets/`.

---

## Reporting Format

When reporting art work to the user, include: asset type, model and transport used, background mode (and whether the cutout fallback was applied), staging path, QA result (explicitly whether alpha QA passed for transparent assets), and the recommended next step. For failed QA, state the failing check and whether the fix is deterministic post-processing or regeneration.
