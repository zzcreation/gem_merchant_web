# Asset Creation Backlog

Tracks visual asset production for **gem_merchant_web**. Pipeline rules: `skill/game-art/SKILL.md`.

Last updated: 2026-07-24

## Summary

| Family | Count | Route | Runtime path |
| --- | ---: | --- | --- |
| Development card faces | 90 | gpt-image-2 opaque | `src/assets/cards/<artSeed>.webp` |
| Noble tiles | 10 | gpt-image-2 opaque | `src/assets/nobles/<artSeed>.webp` |
| Gem token icons | 6 | hand-authored SVG | `src/assets/ui/gem_<color>.svg` |
| Table / lobby backgrounds | 2+ | gpt-image-2 opaque | `src/assets/environments/` |
| **Total** | **108+** | | |

## Status legend

| Status | Meaning |
| --- | --- |
| `[ ]` | Not started |
| `[staging]` | Generated; in `art/staging/` awaiting QA |
| `[qa]` | QA passed; awaiting human approval |
| `[x]` | Approved master + runtime asset promoted |
| `[svg]` | Hand-authored SVG (no generation) |

## Open decisions (block full production)

- [x] Art bible approved 2026-07-11: soft bunny fantasy, hero look, 5 guilds, rare human nobles, key-art proportions — `art/bible/`
- [ ] Approve Wave 1b style-lock pack **in-game** before scaling to 90 cards (5 L1 cards + noble + table + gems wired 2026-07-24 for review)
- [ ] Chinese title styling: splash-only vs in-game brand (deferred)

## Wave plan

| Wave | Scope | Goal |
| --- | --- | --- |
| 0 | Art bible + style lock | **approved** — `art/bible/` |
| 1 | Pilot pack (2026-07-09) | **superseded** — dark human craftsmen; keep for contrast only, do not promote |
| 1b | Style-lock pack (2026-07-11) | **wired for in-game review** — 5 guild L1 + 1 noble + table bg + gem SVGs in `src/assets/` |
| 2 | All L1 cards (40) | Cheapest tier; establishes per-guild look |
| 3 | L2 cards (30) | Mid-tier refinement |
| 4 | L3 cards (20) | Premium tier art |
| 5 | Nobles (10) | Rare soft-fantasy human patrons |
| 6 | Wire-up | Runtime loads `src/assets` by artSeed; placeholders remain for un-promoted ids |

## Wave 1b wire-up (2026-07-24)

Promoted for Part A / style-lock review (not a green light to scale to 90 yet):

| Asset | Source | Runtime |
| --- | --- | --- |
| 5× `*-guild-l1-001` | staging (onyx from `20260723-221500` fix) | `src/assets/cards/` |
| `guild-patron-001` | `20260711-111600` candidate_01 | `src/assets/nobles/` |
| `bg_merchant_table` | `20260723-221500` **candidate_02** | `src/assets/environments/` |
| 6× `gem_*.svg` | hand-authored Wave 1 | `src/assets/ui/` |

Promote helper: `tools/promote_asset.py`.



## Wave 1b fixes (2026-07-23)

Review fixes after style-lock pack:

| Asset | Issue | Fix staging | Recommended |
| --- | --- | --- | --- |
| `bg_merchant_table` | Kingdom vista too large; cards would shrink | `art/staging/bg_merchant_table/20260723-221500/` | **candidate_02** (table ~95% of frame) |
| `onyx-guild-l1-001` | Rainbow gem tray (non-black gems) | `art/staging/onyx-guild-l1-001/20260723-221500/` | **candidate_01** (onyx gems only) |

Bible updated: desktop table framing rule + guild gem color purity.

## Wave 1b staging inventory (2026-07-11) — style lock

Bible-approved soft bunny fantasy. Mechanical QA passed; **human approval pending** before promotion.

| Asset | Type | Staging path | QA |
| --- | --- | --- | --- |
| `onyx-guild-l1-001` | L1 card (bunny) | `art/staging/onyx-guild-l1-001/20260711-111600/` | pass |
| `tide-guild-l1-001` | L1 card (bunny) | `art/staging/tide-guild-l1-001/20260711-111600/` | pass |
| `moon-guild-l1-001` | L1 card (bunny) | `art/staging/moon-guild-l1-001/20260711-111600/` | pass |
| `grove-guild-l1-001` | L1 card (bunny) | `art/staging/grove-guild-l1-001/20260711-111600/` | pass |
| `ember-guild-l1-001` | L1 card (bunny) | `art/staging/ember-guild-l1-001/20260711-111600/` | pass |
| `guild-patron-001` | noble (human) | `art/staging/guild-patron-001/20260711-111600/` | pass |
| `bg_merchant_table` | environment | `art/staging/bg_merchant_table/20260711-111600/` | pass |

## Wave 1 staging inventory (2026-07-09) — superseded

Dark human-craftsman exploration. **Do not promote.** Kept for contrast against the approved bunny direction. Gem SVGs may still be reusable after palette review.

All files under `art/staging/<asset-id>/20260709-132500/`.

| Asset | Type | Staging path | QA |
| --- | --- | --- | --- |
| `gem_*` (×6) | SVG icons | `art/staging/gem-tokens/20260709-132500/` | pass (hand-authored) |
| `onyx-guild-l1-001` | L1 card | `art/staging/onyx-guild-l1-001/20260709-132500/` | pass |
| `tide-guild-l1-001` | L1 card | `art/staging/tide-guild-l1-001/20260709-132500/` | pass |
| `moon-guild-l1-001` | L1 card | `art/staging/moon-guild-l1-001/20260709-132500/` | pass |
| `grove-guild-l1-001` | L1 card | `art/staging/grove-guild-l1-001/20260709-132500/` | pass |
| `ember-guild-l1-001` | L1 card | `art/staging/ember-guild-l1-001/20260709-132500/` | pass |
| `guild-patron-001` | noble | `art/staging/guild-patron-001/20260709-132500/` | pass |
| `bg_merchant_table` | environment | `art/staging/bg_merchant_table/20260709-132500/` | pass |

QA tooling: `python3 tools/validate_asset.py <image> --runtime-size WxH`

## Gem token icons (6)

- [x] `gem_white.svg` — white (#f3ead7)
- [x] `gem_blue.svg` — blue (#3b6ea8)
- [x] `gem_green.svg` — green (#3f8559)
- [x] `gem_red.svg` — red (#a9423c)
- [x] `gem_black.svg` — black (#2f3031)
- [x] `gem_gold.svg` — gold (#d9a33f)

## Environment / UI

- [x] `bg_merchant_table` — desktop play surface (Wave 1b fix candidate_02)
- [ ] `bg_lobby` — room lobby backdrop (optional, lower priority)

## Noble tiles (10)

- [x] `guild-patron-001` (`noble-001`)
- [ ] `guild-patron-002` (`noble-002`)
- [ ] `guild-patron-003` (`noble-003`)
- [ ] `guild-patron-004` (`noble-004`)
- [ ] `guild-patron-005` (`noble-005`)
- [ ] `guild-patron-006` (`noble-006`)
- [ ] `guild-patron-007` (`noble-007`)
- [ ] `guild-patron-008` (`noble-008`)
- [ ] `guild-patron-009` (`noble-009`)
- [ ] `guild-patron-010` (`noble-010`)

## Development cards (90)

Grouped by guild. Each guild: 8× L1, 6× L2, 4× L3.

### ember-guild (bonus: red)

Ember Guild — ruby forges, ember-lit bazaars, volcanic lapidaries

**Level 1** (8)

- [x] `ember-guild-l1-001` (`l1-red-001`) ← Wave 1b wired
- [ ] `ember-guild-l1-002` (`l1-red-002`)
- [ ] `ember-guild-l1-003` (`l1-red-003`)
- [ ] `ember-guild-l1-004` (`l1-red-004`)
- [ ] `ember-guild-l1-005` (`l1-red-005`)
- [ ] `ember-guild-l1-006` (`l1-red-006`)
- [ ] `ember-guild-l1-007` (`l1-red-007`)
- [ ] `ember-guild-l1-008` (`l1-red-008`)

**Level 2** (6)

- [ ] `ember-guild-l2-001` (`l2-red-001`)
- [ ] `ember-guild-l2-002` (`l2-red-002`)
- [ ] `ember-guild-l2-003` (`l2-red-003`)
- [ ] `ember-guild-l2-004` (`l2-red-004`)
- [ ] `ember-guild-l2-005` (`l2-red-005`)
- [ ] `ember-guild-l2-006` (`l2-red-006`)

**Level 3** (4)

- [ ] `ember-guild-l3-001` (`l3-red-001`)
- [ ] `ember-guild-l3-002` (`l3-red-002`)
- [ ] `ember-guild-l3-003` (`l3-red-003`)
- [ ] `ember-guild-l3-004` (`l3-red-004`)

### grove-guild (bonus: green)

Grove Guild — emerald groves, mossy ateliers, forest gem brokers

**Level 1** (8)

- [x] `grove-guild-l1-001` (`l1-green-001`) ← Wave 1b wired
- [ ] `grove-guild-l1-002` (`l1-green-002`)
- [ ] `grove-guild-l1-003` (`l1-green-003`)
- [ ] `grove-guild-l1-004` (`l1-green-004`)
- [ ] `grove-guild-l1-005` (`l1-green-005`)
- [ ] `grove-guild-l1-006` (`l1-green-006`)
- [ ] `grove-guild-l1-007` (`l1-green-007`)
- [ ] `grove-guild-l1-008` (`l1-green-008`)

**Level 2** (6)

- [ ] `grove-guild-l2-001` (`l2-green-001`)
- [ ] `grove-guild-l2-002` (`l2-green-002`)
- [ ] `grove-guild-l2-003` (`l2-green-003`)
- [ ] `grove-guild-l2-004` (`l2-green-004`)
- [ ] `grove-guild-l2-005` (`l2-green-005`)
- [ ] `grove-guild-l2-006` (`l2-green-006`)

**Level 3** (4)

- [ ] `grove-guild-l3-001` (`l3-green-001`)
- [ ] `grove-guild-l3-002` (`l3-green-002`)
- [ ] `grove-guild-l3-003` (`l3-green-003`)
- [ ] `grove-guild-l3-004` (`l3-green-004`)

### moon-guild (bonus: white)

Moon Guild — pearl courts, silver lanterns, lunar gem fairs

**Level 1** (8)

- [x] `moon-guild-l1-001` (`l1-white-001`) ← Wave 1b wired
- [ ] `moon-guild-l1-002` (`l1-white-002`)
- [ ] `moon-guild-l1-003` (`l1-white-003`)
- [ ] `moon-guild-l1-004` (`l1-white-004`)
- [ ] `moon-guild-l1-005` (`l1-white-005`)
- [ ] `moon-guild-l1-006` (`l1-white-006`)
- [ ] `moon-guild-l1-007` (`l1-white-007`)
- [ ] `moon-guild-l1-008` (`l1-white-008`)

**Level 2** (6)

- [ ] `moon-guild-l2-001` (`l2-white-001`)
- [ ] `moon-guild-l2-002` (`l2-white-002`)
- [ ] `moon-guild-l2-003` (`l2-white-003`)
- [ ] `moon-guild-l2-004` (`l2-white-004`)
- [ ] `moon-guild-l2-005` (`l2-white-005`)
- [ ] `moon-guild-l2-006` (`l2-white-006`)

**Level 3** (4)

- [ ] `moon-guild-l3-001` (`l3-white-001`)
- [ ] `moon-guild-l3-002` (`l3-white-002`)
- [ ] `moon-guild-l3-003` (`l3-white-003`)
- [ ] `moon-guild-l3-004` (`l3-white-004`)

### onyx-guild (bonus: black)

Onyx Guild — shadow vaults, obsidian cutters, midnight trade halls

**Level 1** (8)

- [x] `onyx-guild-l1-001` (`l1-black-001`) ← Wave 1b wired (20260723 fix)
- [ ] `onyx-guild-l1-002` (`l1-black-002`)
- [ ] `onyx-guild-l1-003` (`l1-black-003`)
- [ ] `onyx-guild-l1-004` (`l1-black-004`)
- [ ] `onyx-guild-l1-005` (`l1-black-005`)
- [ ] `onyx-guild-l1-006` (`l1-black-006`)
- [ ] `onyx-guild-l1-007` (`l1-black-007`)
- [ ] `onyx-guild-l1-008` (`l1-black-008`)

**Level 2** (6)

- [ ] `onyx-guild-l2-001` (`l2-black-001`)
- [ ] `onyx-guild-l2-002` (`l2-black-002`)
- [ ] `onyx-guild-l2-003` (`l2-black-003`)
- [ ] `onyx-guild-l2-004` (`l2-black-004`)
- [ ] `onyx-guild-l2-005` (`l2-black-005`)
- [ ] `onyx-guild-l2-006` (`l2-black-006`)

**Level 3** (4)

- [ ] `onyx-guild-l3-001` (`l3-black-001`)
- [ ] `onyx-guild-l3-002` (`l3-black-002`)
- [ ] `onyx-guild-l3-003` (`l3-black-003`)
- [ ] `onyx-guild-l3-004` (`l3-black-004`)

### tide-guild (bonus: blue)

Tide Guild — sapphire harbors, tidal workshops, sea-merchant ateliers

**Level 1** (8)

- [x] `tide-guild-l1-001` (`l1-blue-001`) ← Wave 1b wired
- [ ] `tide-guild-l1-002` (`l1-blue-002`)
- [ ] `tide-guild-l1-003` (`l1-blue-003`)
- [ ] `tide-guild-l1-004` (`l1-blue-004`)
- [ ] `tide-guild-l1-005` (`l1-blue-005`)
- [ ] `tide-guild-l1-006` (`l1-blue-006`)
- [ ] `tide-guild-l1-007` (`l1-blue-007`)
- [ ] `tide-guild-l1-008` (`l1-blue-008`)

**Level 2** (6)

- [ ] `tide-guild-l2-001` (`l2-blue-001`)
- [ ] `tide-guild-l2-002` (`l2-blue-002`)
- [ ] `tide-guild-l2-003` (`l2-blue-003`)
- [ ] `tide-guild-l2-004` (`l2-blue-004`)
- [ ] `tide-guild-l2-005` (`l2-blue-005`)
- [ ] `tide-guild-l2-006` (`l2-blue-006`)

**Level 3** (4)

- [ ] `tide-guild-l3-001` (`l3-blue-001`)
- [ ] `tide-guild-l3-002` (`l3-blue-002`)
- [ ] `tide-guild-l3-003` (`l3-blue-003`)
- [ ] `tide-guild-l3-004` (`l3-blue-004`)
