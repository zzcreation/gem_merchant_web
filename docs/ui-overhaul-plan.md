# UI Overhaul + Frontend Refactor Plan

Status: **DRAFT for review** · 2026-07-23 (decisions locked below)  
Scope: (A) full-bleed card art with overlaid info, (B) breaking up the `src/App.tsx` monolith.  
Related: `docs/PRODUCT.md` §11–12, `art/bible/`, `docs/design/asset-backlog.md`.

This is a plan only — no code changes yet. Both parts are independent and can ship in either order, but doing **B (refactor) first** makes A far easier (a real `CardFace` component instead of editing inline JSX in five places).

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

Card box aspect is **slightly taller than 2:3** (target ~5:8, `aspect-ratio: 5 / 8`). Masters are 2:3, so `object-fit: cover` trims a few px top/bottom — safe given the overlay-safe zones (A.4). The extra height buys room for overlays without scrimming the art center.

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

### A.4 Overlay-safe zones (feeds art generation)

Because info sits at the edges, future card art should keep those bands non-critical. Add to `art/bible/`:

- Keep the **top ~15%** and **bottom ~18%** free of essential detail (faces, key props centered in the middle band). Covers mobile (cost row bottom) + prestige/bonus top on both layouts.
- On desktop the cost strip occupies one **side ~18%**; keep the subject horizontally centered so the side strip doesn't cover faces.
- Net: keep essential detail in a centered safe box; this is already mostly true (bible says "subject centered with padding"), so Wave 1b art should overlay cleanly — verify in the prototype.

### A.5 Shared `CardFace` component

One component, used at every card render site (today these are hand-duplicated):

| Site | File ref | Variant |
| --- | --- | --- |
| Market grid | `App.tsx` ~990 | full, interactive |
| Reserved (player panel) | `App.tsx` ~922 | compact |
| Reserved action list | `App.tsx` ~1089 | compact |
| Purchased stacks / counts | `App.tsx` player panels | mini / count only |
| Noble tiles | `App.tsx` ~964 | square variant (`NobleFace`) |

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
| Asset size | 256×384 webp (smaller download) | 512×768 webp — export both on promote |

Both use the same `CardFace`; differences are `min-width` breakpoints + which runtime asset size `srcset` picks.

### A.7 Runtime assets

On promote, export per-card:

- `src/assets/cards/<artSeed>.webp` (512×768, ~2:3)
- optionally `<artSeed>@0.5x.webp` (256×384) for mobile via `srcset`

Masters stay in `art/masters/`. Add a promote helper (extend `tools/`) that resizes + converts the approved master and writes both sizes.

### A.8 Acceptance criteria (Part A)

- [ ] Art fills card box on desktop and mobile; no letterbox band.
- [ ] Prestige, bonus, and full cost remain readable over any guild art (light and dark).
- [ ] Guild is identifiable at a glance (border + art).
- [ ] Affordability (normal/gold/none) and selected states are as clear as today.
- [ ] Un-promoted cards fall back to placeholder without breaking layout.
- [ ] Existing Playwright e2e (market select / buy / reserve) still passes.

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
    tokens.css            # design tokens: colors (from palette.json), spacing, radii, breakpoints
    base.css              # resets, app shell, screen scaffolding
    <Component>.module.css  # one CSS Module per component (CardFace, Market, PlayerPanel, ...)
```

**CSS split (decision #4):** `App.css` is broken up per component as CSS Modules, co-located conceptually with each component. Shared design tokens (guild colors from `palette.json`, spacing, mobile-first breakpoints) live in `styles/tokens.css` as CSS custom properties so components stay consistent. Mobile styles are the base rules; desktop overrides live in `@media (min-width: …)` blocks within each module.

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

- **`useOnlineRoom`** — socket ref, connection status, lobby, online view, reconnect delays, heartbeat interval, resume token, saved session. Owns all WebSocket side effects. Highest risk; has e2e coverage as a guard.
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
7. Split `App.css`: extract `styles/tokens.css` + `styles/base.css`, then move each component's rules into its own `*.module.css` (mobile base + `min-width` desktop overrides). Delete `App.css` once empty.

Each step is independently committable and revertable. **No rules/protocol changes** — `shared/` and `worker/` are untouched.

### B.6 Guardrails

- Behavior must stay identical; this is a structure-only refactor.
- Keep `npm test`, `npm run test:e2e`, `npm run lint`, `npm run build` green at every step.
- No new deps.
- Do Part B step 2 (`CardFace`) as the bridge into Part A.

### B.7 Acceptance criteria (Part B)

- [ ] `src/App.tsx` < ~120 lines (router only).
- [ ] No single frontend file > ~300 lines.
- [ ] `App.css` removed; styles live in `styles/tokens.css`, `styles/base.css`, and per-component `*.module.css`.
- [ ] Each component's CSS is mobile-base with desktop `min-width` overrides (no `max-width` retrofits).
- [ ] All existing unit + e2e tests pass unchanged.
- [ ] `build` + `lint` clean.
- [ ] WebSocket reconnect / heartbeat / resume behavior verified in dual-browser e2e.

---

## Suggested sequencing

1. **B.1–B.3** — extract pure helpers (low risk, immediate readability win).
2. **B.5 step 2** — introduce `CardFace` with placeholder art.
3. **Part A** — full-bleed art + overlays on `CardFace`; prototype on the **mobile market view first**, review on a phone viewport, then enhance for desktop and roll to all sites.
4. Promote Wave 1b masters into `src/assets/` and wire by `artSeed`.
5. **B.4–B.6** — finish hook/screen extraction.
6. Update `docs/CHECKLIST.md` 里程碑 4 (动效/视觉) and mark the art-wire-up item.

## Resolved decisions (was: open questions)

1. Card box ratio → **slightly taller than 2:3** (~5:8). ✅
2. Cost badges → **vertical strip on desktop, horizontal row on mobile**. ✅
3. Refactor depth → **full breakup** (B.1–B.6, all migration steps). ✅
4. `App.css` → **split per component** (CSS Modules + shared `styles/tokens.css`). ✅

## Mobile-first verification checklist (apply at every step)

- [ ] Feature designed/tested on a **phone-portrait viewport first** (~375–430px), then enhanced up.
- [ ] Only `min-width` breakpoints added; no `max-width` retrofits.
- [ ] All interactive targets ≥ 44×44px on mobile; no hover-only critical actions.
- [ ] Core actions reachable in the bottom thumb zone on mobile.
- [ ] Card art + overlays legible and non-crowded on the smallest supported width.
- [ ] Mobile downloads the smaller card asset via `srcset`.
