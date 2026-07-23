# Negative / Forbidden Guidance — 兔拉崩吧

gpt-image models do not take a separate negative prompt. Bake these into the main prompt (see `prompt-blocks.md` forbidden block) and use this list during QA.

## Hard rejects (regenerate)

- Any readable text, letters, numbers, watermarks, signatures, logos
- Photoreal human characters as the main subject (Wave 1 style)
- Grimdark / horror / gore / blood / torture imagery
- Cropped heads, cut-off ears, subject jammed against edges
- Baked-in card frames, UI chrome, browser chrome
- Extra limbs, broken anatomy, duplicate faces
- Messy illegible clutter that fails at runtime size

## Soft rejects (edit or regenerate if severe)

- Overly realistic skin pores / photographic noise
- Excessive bloom / neon glow that washes gem colors
- Purple-pink generic AI gradient backgrounds with no kingdom structure
- Ember Guild scenes that look like volcanic apocalypse instead of cozy forge
- Onyx Guild scenes that look scary / undead instead of cute-mysterious
- Gems that don't read as the guild's sigil color
- Rainbow / multi-guild gem trays on a single-guild card (hard reject if obvious)
- Desktop table bg where kingdom/sky takes more than ~10% of the frame (regenerate with steeper top-down)

## Style drift vs key art

Compare candidates to `art/bible/references/tulabunba-key-art.png`:

| Keep | Avoid drifting toward |
| --- | --- |
| Fluffy chibi-leaning bunnyfolk (key art) | Realistic humans on cards; semi-realistic animals |
| Soft pastel light | Harsh noir shadows |
| Plush painterly fur | Plastic / 3D-render look |
| Clear gem accents | Muddy desaturated gems |
| Cute heroic tone | Cynical / violent tone |
| Soft painted human nobles | Photoreal / stock-photo nobles |

## QA note for agents

Mechanical QA (`tools/validate_asset.py`) does not catch style drift. Always open the runtime preview and check against this file + the key-art reference before marking `[qa]`.
