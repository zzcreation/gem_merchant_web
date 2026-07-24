# UI Overhaul Plan Review

**Date:** 2026-07-24  
**Review base:** `origin/main` (`471753d`)  
**Reviewed commits:** `7c28574`, `03a7126`  
**Primary focus:** `docs/ui-overhaul-plan.md`  
**Resolution status:** addressed 2026-07-24 · crop vs safe-margin wording locked · follow-ups closed

## Summary

The current implementation changes are safe to retain. The helper and presentational-component extraction in `03a7126` is largely mechanical, and no existing behavior regression was found.

~~The UI overhaul plan should be corrected before Part A begins.~~ **Plan corrections and pre-Part-A e2e guards are landed.** One geometry wording nit (crop % vs safe margin) was clarified in the bible / A.4 so art does not treat the 5% margin as the actual cover crop.

## Findings

### High — The documented image crop direction is incorrect — **FIXED**

**Location:** `docs/ui-overhaul-plan.md:55`

The plan states that a 2:3 image rendered in a taller 5:8 card with `object-fit: cover` will be cropped at the top and bottom. The opposite is true.

A 2:3 source has an aspect ratio of approximately `0.667`, while a 5:8 container has an aspect ratio of `0.625`. To cover the narrower, taller container, the image is scaled to the container height and cropped horizontally. A 1024×1536 source loses approximately 32 pixels from each side, or about 6.25% of its total width.

This affects the art-generation guidance in A.4. The plan should:

- describe the crop as left/right cropping;
- define a horizontal crop-safe margin;
- retain the top and bottom safe zones for overlays, while making clear that those zones are not required by `object-fit` cropping.

Part A should not proceed using the current top/bottom crop assumption.

**Resolution:** A.2 and A.4 rewritten — cover crop is left/right (~3% per side / ~6.25% total); art keeps a **5% safe margin per side** (not the same as the crop amount). Top/bottom bands are overlay-only, not cover-crop.

### Medium — The plan assumes buy/reserve E2E coverage that does not exist — **FIXED**

**Locations:** `docs/ui-overhaul-plan.md:158`; `tests/e2e/online-room.spec.ts`

The Part A acceptance criteria refer to existing Playwright coverage for market selection, buying, and reserving. The current suite contains only three scenarios:

1. rendering all market tiers at a mobile viewport;
2. maintaining legal token selection;
3. synchronizing a token-taking action between two online players.

There is no browser test for:

- selecting and buying a market card;
- reserving a card;
- buying a reserved card;
- using gold as a payment substitute;
- card-state visual regressions;
- reconnect, heartbeat, or session resume behavior.

Part A changes the card DOM, interaction surface, payment entry point, and gameplay state styling. Before that work begins, add coverage for market purchase, reserve and reserved-card purchase, gold substitution, and a deterministic 390px visual snapshot. Before extracting `useOnlineRoom`, add dual-browser reconnect/resume coverage.

**Resolution:** Added `tests/e2e/card-actions.spec.ts` covering market buy, reserve + reserved buy with gold substitution, and a 390×844 market snapshot. A.8 / sequencing updated. Reconnect/resume e2e remains a **pre-`useOnlineRoom`** gate (B.4), not a Part A blocker.

### Medium — A mobile device is not guaranteed to download the 0.5x asset through `srcset` — **FIXED**

**Locations:** `docs/ui-overhaul-plan.md:138-147`, `docs/ui-overhaul-plan.md:297`

The plan states that mobile downloads the 256×384 asset while desktop downloads the 512×768 asset, with `srcset` choosing between them.

Standard `srcset` selection is based on rendered width, the `sizes` value, device pixel ratio, and browser heuristics. A high-DPI phone can legitimately select the 512×768 image. A mobile viewport alone does not guarantee use of the smaller file.

Choose one explicit contract:

- If asset selection must follow the viewport breakpoint, use `<picture>` with media-specific `<source>` elements.
- If DPR-aware browser selection is preferred, use a complete `srcset` and `sizes` declaration and change the acceptance criterion to require an appropriately sized resource rather than always requiring the 0.5x mobile asset.

**Resolution:** Locked viewport-keyed `<picture>` contract in A.7 (mobile `@0.5x` default `<img>`; `(min-width: 768px)` full-size `<source>`). Acceptance checklist updated accordingly.

### Low — CSS custom properties cannot provide reusable media-query breakpoints — **FIXED**

**Locations:** `docs/ui-overhaul-plan.md:210`, `docs/ui-overhaul-plan.md:215`

The proposed `tokens.css` includes breakpoints among its design tokens, while component modules are expected to use those breakpoints in `@media` rules.

Native CSS custom properties cannot be used in media-query conditions such as:

```css
@media (min-width: var(--breakpoint-desktop)) {
  /* This condition is invalid in standard CSS. */
}
```

Because the plan also prohibits new dependencies, it should explicitly define shared breakpoint values as documented literal conventions, accepting repetition across modules. A build-time preprocessor would be required to make breakpoint variables reusable.

**Resolution:** B.2 now documents literal breakpoint convention (`768px` tablet, `1024px` desktop). `tokens.css` holds colors/spacing/radii only — not media breakpoints.

### Low — `CardFace` currently treats `compact` and `mini` as the same variant — **FIXED**

**Locations:** `src/components/CardFace.tsx:24-39`; `docs/ui-overhaul-plan.md:108-110`

The plan assigns different semantics to the two variants:

- `compact`: reserved-card presentation;
- `mini`: purchased stack or count presentation.

The current component renders both as an interactive `reserved-buy-pill`. The `mini` variant is not currently used, so this is not an existing regression. It should be separated before the purchased-card rendering is migrated. A mini/count presentation should not default to a reserved-card purchase button.

**Resolution:** `CardFace` now renders `mini` as a non-interactive `.card-face-mini` chip; `compact` remains the reserved buy-pill. Plan A.5 documents the three distinct `size` semantics.

## Verification

The reviewed tree passed:

- Vitest: 26/26 tests;
- Playwright: 3/3 tests;
- Oxlint;
- TypeScript and Vite production build.

`git diff --check origin/main..HEAD` reported only the intentional Markdown hard-break whitespace on lines 3 and 4 of `docs/ui-overhaul-plan.md`.

**Post-fix verification (2026-07-24):** card-actions Playwright suite 3/3 green (plus existing online-room suite); unit/lint/build re-checked after the fixes.

## Recommendation

~~Keep `03a7126`. Correct the first three findings before beginning Part A:~~

**Closed.** Pre-Part-A findings are addressed:

1. fix the crop direction and art safe-zone specification; ✅
2. add the missing card-action and mobile visual regression tests; ✅
3. define the intended responsive-image selection contract. ✅

Low-severity findings also resolved in this pass. ✅ Crop amount (~3%/side) vs art safe margin (5%/side) wording locked in bible + A.4.
