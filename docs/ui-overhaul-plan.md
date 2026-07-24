# UI Overhaul + Frontend Refactor Plan

Status: **IN PROGRESS** · 2026-07-24 (**B.5 complete**; Part A prototype shipped)  
> **2026-07-25:** 全量 UI 重设计提案已提出 — 见 `docs/design/2026-07-25-ui-redesign-proposal.md` + `docs/design/ui-redesign/index.html`。评审通过后将取代本文 Part A 的布局假设（5:8 卡框、成本纵条）；遮幅法、`<picture>` 合同与艺术安全区保留。

Scope: (A) full-bleed card art with overlaid info, (B) breaking up the `src/App.tsx` monolith.  
Related: `docs/PRODUCT.md` §11–12, `art/bible/`, `docs/design/asset-backlog.md`, `docs/review/2026-07-24-ui-overhaul-plan-review.md`.

Both parts are independent and can ship in either order; **B (refactor) first** makes A far easier (a real `CardFace` component instead of editing inline JSX in five places).

### Progress

- [x] B.5 step 1 — extract pure helpers to `src/lib/*` (2026-07-23)
- [x] B.5 step 2 — `CardFace` / `NobleFace` / `GemToken` (placeholder art; CSS still in `App.css`)
- [x] Review fixes (2026-07-24) — crop/safe-zone docs, `<picture>` asset contract, breakpoint literals, `CardFace` mini≠compact, card-action e2e
- [x] Doc precision (2026-07-24) — bible + A.4 distinguish actual crop (~3%/side) from 5% safe margin
- [x] B.5 step 3 — presentational components (`Market`, `PlayerPanel`/`PlayerRail`, `ActionPanel`, `TokenPool`, `StatusBanner`, `RoomBar`, `PaymentBox`, `PhaseChoices`)
- [x] B.5 step 4 — `usePaymentPlan`, `useGameSession` + landing/about/loading screens
- [x] B.5 step 5 — reconnect/resume e2e, then `useOnlineRoom` (+ `handleRoomServerEvent`)
- [x] B.5 step 6 — `LobbyScreen` + `GameScreen`; `App.tsx` thin screen router (~92 lines)
- [x] B.5 step 7 — `App.css` removed; styles in `styles/tokens.css` + `styles/base.css` + `styles/layout.css` + co-located `components/*.css` (**plain CSS**, not CSS Modules — Vite tree-shakes unused CSS Module side-effect imports and drops Playwright selectors)
- [x] Part A (prototype) — full-bleed overlays on `CardFace`; Wave 1b L1 seeds wired via `<picture>`
- [x] Part A polish (partial) — noble + table bg + gem SVGs wired for style-lock review (2026-07-24)
- [ ] Part A polish — promote remaining masters; verify overlay legibility across all guilds; human approve Wave 1b in-game

## Guiding principle: mobile-first

**The game runs mostly on phones.** Mobile portrait is the default target, not an afterthought; desktop is the enhanced, scaled-up version of the mobile layout (`docs/PRODUCT.md` §11.1). For every decision in this plan:

- Design and validate the phone-portrait layout (~375–430px wide) **first**, then enhance upward with `min-width` breakpoints — no `max-width` retrofits.
- Touch targets ≥ 44×44px; no hover-dependent critical actions (hover is desktop-only enhancement).
- Core actions (take gems, buy, reserve) stay in the thumb-reachable bottom zone.
- Keep runtime asset weight small; ship a smaller card image for mobile (see A.7).
- Acceptance is judged on a phone viewport first; desktop second.

## Locked decisions (2026-07-23)

1. Card box is **slightly taller than 2:3** (e.g. ~5:8 / `0.62`) to give overlays breathing room without crowding the art or heavily scrimming it.
2. Cost badges: **vertical strip down one side on desktop**, **horizontal row on mobile** (responsive re-flow within `CardFace`).
3. **Full frontend breakup** (all of Part B, steps 1–7).
4. **Split `App.css`** into per-component stylesheets.

---

## Part A — Card face overhaul (art-first cards)

### A.1 Problem

Current market card (`src/App.tsx` ~1002–1018, `src/App.css` `.dev-card`/`.card-art`) is laid out as three stacked strips:

```
[ prestige            bonus ]   .card-top
[     fixed 72px art band    ]   .card-art   ← landscape-ish, dead space
[ cost cost cost            ]   .card-cost
```

- `.card-art` is a fixed-height (`72px` desktop / `24px` mobile) band, so art reads as a wide letterbox even though every Wave 1b master is **2:3 portrait** (`1024×1536`).
- Info (prestige, bonus, cost) consumes vertical space *around* the art, shrinking it further.

### A.2 Target

The art **fills the entire card box**. Prestige, bonus, and cost are **overlaid** on top with a legibility treatment and a guild-colored border.

Card box aspect is **slightly taller than 2:3** (target ~5:8, `aspect-ratio: 5 / 8`). Masters are 2:3 (`≈0.667` width/height); the 5:8 box is narrower (`0.625`). With `object-fit: cover`, the image is scaled to the **container height** and **cropped on the left and right** (~6% of master width total, ~3% per side on a 1024×1536 source) — not top/bottom. The extra box height buys overlay room without needing to scrim the art center.

**Mobile portrait (primary) — cost as horizontal row:**

```
┌─────────────────┐  ← guild border ring
│ 5          ●gem │  ← top scrim
│                 │
│   full-bleed    │
│    card art     │
│                 │
│ ▨2 ▨1 ▨1        │  ← bottom scrim: cost row
└─────────────────┘
```

**Desktop (enhanced) — cost as vertical side strip:**

```
┌────────────────────┐
│ 5             ●gem │  ← top scrim
│ ▨2                 │
│ ▨1    card art     │  ← cost strip down the left, less art occlusion
│ ▨1                 │
│                    │
└────────────────────┘
```

`CardFace` re-flows the cost container (row ↔ column) at the breakpoint; same component, same data.

### A.3 Legibility (the hard part of overlays)

Overlaying text on illustration fails without contrast protection. Plan:

1. **Top + bottom scrims** — gradient overlays (`linear-gradient` dark→transparent) behind the prestige/bonus row and the cost row only, not the whole card. Keeps the art center clean.
2. **Text treatment** — prestige number in a solid pill/disc (not bare text), cost as filled gem badges (already the case). White text + subtle `text-shadow` / `drop-shadow`.
3. **Border ring** — 2–3px guild-colored inner border so each card's guild is legible even before you parse the art. Reuses `palette.json` guild colors.
4. **Affordability states preserved** — the existing `.afford-normal` (green) / `.afford-gold` (dashed gold) / `.selected` glows move to the border ring / outer box-shadow. This is gameplay-critical and must not regress.

### A.4 Overlay-safe zones + crop-safe margins (feeds art generation)

Two independent constraints — do not conflate them:

1. **`object-fit: cover` crop (geometry)** — the 5:8 box crops the 2:3 master **horizontally** (~3% per side / ~6.25% total width on a 1024×1536 source). Art guidance: keep a **5% safe margin per side** (conservative buffer beyond the actual crop) so faces and key props stay clear.
2. **Overlay occlusion (UI)** — prestige/bonus sit in the top band; cost sits in the bottom band (mobile) or a side strip (desktop). Keep the **top ~15%** and **bottom ~18%** free of essential detail so overlays remain legible. These bands are **not** required by the cover crop; they exist so UI chrome does not cover faces.

On desktop the cost strip also occupies one **side ~18%**; that overlaps the horizontal crop-safe margin, so keep the subject in a centered safe box.

Net: essential detail in a centered middle band. Wave 1b art already tends this way (bible: "subject centered with padding") — verify in the Part A prototype.

### A.5 Shared `CardFace` component

One component, used at every card render site (today these are hand-duplicated):

| Site | File ref | Variant |
| --- | --- | --- |
| Market grid | `App.tsx` market | `full`, interactive button |
| Reserved action list | `App.tsx` action panel | `compact`, interactive buy-pill |
| Reserved (player panel) | `App.tsx` player panel | read-only pill / label (not `CardFace` yet) |
| Purchased stacks / counts | `App.tsx` player panels | `mini`, **non-interactive** bonus chip (not a buy button) |
| Noble tiles | `App.tsx` noble track | square variant (`NobleFace`) |

`size` semantics (do not collapse):

- `full` — market card face (button).
- `compact` — reserved-card purchase control (`reserved-buy-pill`).
- `mini` — purchased-stack / count chip; never an interactive buy control.

```tsx
<CardFace
  card={card}
  size="full | compact | mini"
  affordability="normal | gold | none"
  selected={boolean}
  onSelect={...}
/>
```

Art resolution: `import.meta.glob('../assets/cards/*.webp', { eager: true })` keyed by `artSeed`, with the current lucide + label as fallback when a master isn't promoted yet. This lets promoted and un-promoted cards coexist during rollout.

### A.6 Mobile-first, then desktop

Design the mobile column first; desktop is the `min-width` enhancement.

| Concern | Mobile (primary) | Desktop (enhancement) |
| --- | --- | --- |
| Card box | ~5:8, smaller; horizontal scroll tiers (existing) | ~5:8, larger; 4 columns per tier row |
| Cost layout | **horizontal row**, bottom scrim | **vertical strip** down one side |
| Overlays | prestige + bonus + cost; caption hidden; tighter padding | same + roomier padding |
| Scrim | slightly stronger (small text needs more contrast) | subtle |
| Border ring | 2px | 2–3px |
| Selected | glow only (no layout shift in scroller) | scale/lift + glow |
| Touch/hover | tap targets ≥44px; no hover reliance | hover affordances added |
| Asset size | 256×384 webp via `<picture>` mobile `<img>` | 512×768 webp via `(min-width: 768px)` `<source>` |

Both use the same `CardFace`; differences are `min-width` breakpoints + viewport-keyed `<picture>` sources (see A.7).

### A.7 Runtime assets

On promote, export per-card:

- `src/assets/cards/<artSeed>.webp` (512×768, ~2:3) — desktop/tablet
- `src/assets/cards/<artSeed>@0.5x.webp` (256×384) — default / mobile

**Responsive selection contract (viewport-keyed, not DPR/`srcset`):** use `<picture>` so the breakpoint, not device pixel ratio, picks the file:

```html
<picture>
  <source media="(min-width: 768px)" srcset="/assets/cards/<artSeed>.webp" />
  <img src="/assets/cards/<artSeed>@0.5x.webp" alt="" width="256" height="384" />
</picture>
```

Rationale: a high-DPI phone with density-aware `srcset` can legitimately choose the 512×768 file. Mobile-first bandwidth control requires an explicit media query. The 768px gate matches the shared tablet/desktop breakpoint convention (see B.2).

Masters stay in `art/masters/`. Add a promote helper (extend `tools/`) that resizes + converts the approved master and writes both sizes.

### A.8 Acceptance criteria (Part A)

- [x] Art fills card box on desktop and mobile; no letterbox band. *(prototype: Wave 1b L1 seeds + placeholder fallback)*
- [x] Prestige, bonus, and full cost remain readable over any guild art (light and dark). *(scrims + prestige pill; verify remaining guilds as art lands)*
- [x] Guild is identifiable at a glance (border + art).
- [x] Affordability (normal/gold/none) and selected states are as clear as today.
- [x] Un-promoted cards fall back to placeholder without breaking layout.
- [x] Playwright card-action suite still passes: market select + buy, reserve, reserved-card buy, gold substitution (`tests/e2e/card-actions.spec.ts`).
- [x] Deterministic 390×844 market visual snapshot still matches (`tests/e2e/card-actions.spec.ts`).
- [x] At viewports `< 768px`, card `<picture>` serves the `@0.5x` source; at `≥ 768px`, the full-size source (media query, not DPR heuristic).

---

## Part B — Frontend refactor (break up `src/App.tsx`)

### B.1 Clarification: what's actually monolithic

`shared/game/` is **already modular** (`actions.ts`, `setup.ts`, `view.ts`, `validation.ts`, `catalog.ts`, `data/`). The game *rules* are fine.

The monolith is the **frontend**: `src/App.tsx` is **1694 lines**:

- `App()` component: lines ~76–1353 (~1270 lines) — 19 `useState`, 9 `useRef`, WebSocket connect/reconnect/heartbeat, four screens (landing / about / loading / game), and all rendering inline.
- ~30 module-level helpers: lines ~1354–1694 (payment math, formatting, affordability, room session/code).

### B.2 Target structure

Aligns with `docs/PRODUCT.md` §12.2 (`src/app`, `src/components`, `src/styles`):

```
src/
  main.tsx
  App.tsx                 # thin: screen router only (~80 lines)
  screens/
    LandingScreen.tsx     # landing + create/join + about entry
    AboutScreen.tsx
    LoadingScreen.tsx
    GameScreen.tsx        # the table; composes components below
  components/
    CardFace.tsx          # Part A
    NobleFace.tsx
    GemToken.tsx          # renders gem SVGs
    Market.tsx
    PlayerPanel.tsx
    ActionPanel.tsx
    TokenPool.tsx
    StatusBanner.tsx
    RoomBar.tsx
  hooks/
    useOnlineRoom.ts      # WebSocket lifecycle, reconnect, heartbeat, resume
    useGameSession.ts     # local vs online game/view selection
    usePaymentPlan.ts     # payment plan state + suggestions
  lib/
    payment.ts            # emptyPaymentPlan, createSuggestedPaymentPlan, adjust*, normalize*, isPaymentExact, paymentSummary, totalGoldInPayment, discountedCost
    affordability.ts      # getCardAffordability, chooseDiscard, countPurchasedBonus
    cards.ts              # cardLabel, cardCostEntries, costDots, costEntries, hasVisibleCardId
    nobles.ts             # findEligibleNobleIds
    results.ts            # getGameResults
    format.ts             # colorName, phaseText, connectionText, serverActivityMessage
    roomSession.ts        # loadRoomSession, saveRoomSession, ROOM_SESSION_KEY
    roomCode.ts           # sanitizeRoomCode, generateRoomCode
  styles/
    tokens.css            # design tokens: colors (from palette.json), spacing, radii — NOT media breakpoints
    base.css              # resets, app shell, screen scaffolding
    components/<Component>.css  # co-located plain CSS per component (not CSS Modules — see note)
```

**Shared breakpoint convention (literal values only):** native CSS custom properties cannot be referenced inside `@media` conditions, and this plan forbids new deps / preprocessors. Document and repeat these literals in every stylesheet:

| Name | Value | Use |
| --- | --- | --- |
| tablet | `768px` | card art `<picture>` gate; denser table layout |
| desktop | `1024px` | full multi-column table + side panels |

**CSS split (decision #4):** `App.css` is broken up per component as **plain co-located `.css` files** (not CSS Modules). Vite can tree-shake unused CSS Module side-effect imports, which would drop global selectors Playwright and the app rely on (`.dev-card`, `.market-row`, …). Shared design tokens (guild colors from `palette.json`, spacing, radii) live in `styles/tokens.css` as CSS custom properties. Breakpoints are **not** CSS variables — they are the literal convention above. Mobile styles are the base rules; desktop overrides live in `@media (min-width: 768px)` / `@media (min-width: 1024px)` blocks within each stylesheet.

### B.3 Helper → destination map

| Current helper (`App.tsx`) | New home |
| --- | --- |
| `emptyPaymentPlan`, `createSuggestedPaymentPlan`, `adjustPaymentPlan`, `canAdjustPaymentPlan`, `clampPaymentAmount`, `normalizePaymentPlan`, `isPaymentExact`, `paymentSummary`, `totalGoldInPayment`, `discountedCost`, `compactTokenMap` | `lib/payment.ts` |
| `getCardAffordability`, `countPurchasedBonus`, `chooseDiscard`, `countAllTokens`, `countSelectedTokens` | `lib/affordability.ts` |
| `cardLabel`, `cardCostEntries`, `costDots`, `costEntries`, `hasVisibleCardId` | `lib/cards.ts` |
| `findEligibleNobleIds` | `lib/nobles.ts` |
| `getGameResults` | `lib/results.ts` |
| `colorName`, `phaseText`, `connectionText`, `serverActivityMessage` | `lib/format.ts` |
| `loadRoomSession`, `saveRoomSession` | `lib/roomSession.ts` |
| `sanitizeRoomCode`, `generateRoomCode` | `lib/roomCode.ts` |
| `createMockGame`, `playerSetups` | `lib/mockGame.ts` |

The ~30 pure helpers are the safest first move — no React, easy to unit test.

### B.4 State extraction (the risky part)

The 19 `useState` + 9 `useRef` in `App()` cluster into three hooks:

- **`useOnlineRoom`** — socket ref, connection status, lobby, online view, reconnect delays, heartbeat interval, resume token, saved session. Owns all WebSocket side effects. Highest risk; **before extracting this hook, add dual-browser Playwright coverage for reconnect / heartbeat / resume** (not present in the suite as of 2026-07-24).
- **`usePaymentPlan`** — selected card, payment plan, selected tokens, discard panel state.
- **`useGameSession`** — local mock vs online, which `view`/`player` is active, screen routing inputs.

`App()` becomes a screen router; `GameScreen` consumes the hooks and passes props to presentational components.

### B.5 Migration order (incremental, test after each)

1. Extract pure helpers to `lib/*` (mechanical; no behavior change). Run `npm test` + `npm run lint` + `npm run build`.
2. Extract `CardFace`/`NobleFace`/`GemToken` presentational components (still placeholder art). Visual diff.
3. Extract remaining presentational components (`Market`, `PlayerPanel`, `ActionPanel`, `TokenPool`, `StatusBanner`, `RoomBar`).
4. Extract `usePaymentPlan`, `useGameSession`.
5. Extract `useOnlineRoom` (do last, alone, verify with Playwright dual-context e2e).
6. Split screens; reduce `App.tsx` to router.
7. Split `App.css`: extract `styles/tokens.css` + `styles/base.css` (+ `layout.css`), then move each component's rules into co-located `components/*.css` (mobile base + `min-width` desktop overrides). Delete `App.css` once empty. Prefer plain CSS over CSS Modules so class names stay stable for e2e.

Each step is independently committable and revertable. **No rules/protocol changes** — `shared/` and `worker/` are untouched.

### B.6 Guardrails

- Behavior must stay identical; this is a structure-only refactor.
- Keep `npm test`, `npm run test:e2e`, `npm run lint`, `npm run build` green at every step.
- No new deps.
- Do Part B step 2 (`CardFace`) as the bridge into Part A.

### B.7 Acceptance criteria (Part B)

- [x] `src/App.tsx` < ~120 lines (router only).
- [x] No single frontend file > ~300 lines.
- [x] `App.css` removed; styles live in `styles/tokens.css`, `styles/base.css`, `styles/layout.css`, and per-component `components/*.css` (plain CSS).
- [x] Each component's CSS is mobile-base with desktop `min-width` overrides (no `max-width` retrofits).
- [x] All existing unit + e2e tests pass unchanged.
- [x] `build` + `lint` clean.
- [x] WebSocket reconnect / resume verified in e2e (`tests/e2e/online-room.spec.ts`).

---

## Suggested sequencing

0. **Pre-Part-A guards (review 2026-07-24)** — correct crop/safe-zone docs; add card-action + 390px visual e2e; lock `<picture>` asset contract; separate `CardFace` `mini` from `compact`.
1. **B.1–B.3** — extract pure helpers (done) + presentational faces (done).
2. **B.5 step 3** — remaining presentational components.
3. **Part A** — full-bleed art + overlays on `CardFace`; prototype on the **mobile market view first**, review on a phone viewport, then enhance for desktop and roll to all sites.
4. Promote Wave 1b masters into `src/assets/` and wire by `artSeed` via `<picture>`.
5. **B.4–B.6** — finish hook/screen extraction; add reconnect/resume e2e **before** `useOnlineRoom`.
6. Update `docs/CHECKLIST.md` 里程碑 4 (动效/视觉) and mark the art-wire-up item.

## Resolved decisions (was: open questions)

1. Card box ratio → **slightly taller than 2:3** (~5:8). ✅
2. Cost badges → **vertical strip on desktop, horizontal row on mobile**. ✅
3. Refactor depth → **full breakup** (B.1–B.6, all migration steps). ✅
4. `App.css` → **split per component** (plain co-located CSS + shared `styles/tokens.css`). ✅

## Mobile-first verification checklist (apply at every step)

- [ ] Feature designed/tested on a **phone-portrait viewport first** (~375–430px), then enhanced up.
- [ ] Only `min-width` breakpoints added; no `max-width` retrofits.
- [ ] All interactive targets ≥ 44×44px on mobile; no hover-only critical actions.
- [ ] Core actions reachable in the bottom thumb zone on mobile.
- [ ] Card art + overlays legible and non-crowded on the smallest supported width.
- [ ] At viewports `< 768px`, card `<picture>` serves the `@0.5x` asset (media query, not DPR/`srcset` alone).
