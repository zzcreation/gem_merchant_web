# Visual Style — 兔拉崩吧 (Tulabunba)

Status: **APPROVED** · 2026-07-11  
Primary reference: `art/bible/references/tulabunba-key-art.png`  
(source: `docs/design/reference/ec585871-f247-4ea8-960a-b91dc0014870.png`)

This bible locks art direction for `gem_merchant_web`. Wave 1 staging art (dark human craftsmen) is **superseded** — do not promote it.

---

## 1. One-line direction

**Soft high-fantasy bunny merchant world** — fluffy anthropomorphic rabbits collecting gems, building guild prestige, and trading in a bright pastel kingdom. Cute but polished; magical but readable at card size. Not gritty, not photoreal, not dark fantasy.

Resolves `docs/PRODUCT.md` §20 item 5: **轻幻想卡牌** (light fantasy card game) / 兔拉崩吧 IP — not 古典宝石商会.

---

## 2. IP core

### Hero — 兔拉崩吧 (Tulabunba)

- Species: small, extremely fluffy white bunny with long drooping ears and large expressive deep-blue eyes.
- Role: adventurer-merchant hero of the bunny world; the face of the product (lobby, share card, splash).
- Signature look (from key art):
  - Royal-blue mantle with gold trim and gold star/celestial embroidery
  - Cream tunic with gold hem detail
  - Brown leather travel belt / pouches
  - Often holding or presenting a bright gem (diamond / guild gem)
- Personality vibe: brave, adorable, slightly theatrical — a tiny hero who takes gem trading very seriously.

### World

A kingdom of **bunny-like creatures** (兔族). Cities of soft spires, pastel skies, floating petals, warm lantern light. Economy revolves around colored guild gems and prestige. Default cast on development cards is bunnyfolk.

### Five Guilds

Every development card belongs to one guild via `artSeed` prefix. Guilds own a **sigil color**, craft specialty, and visual motif. Characters on cards are bunnyfolk guild members (apprentices → masters by level).

| Guild (`artSeed` prefix) | Gem / bonus | Sigil color | Specialty | Motifs |
| --- | --- | --- | --- | --- |
| **Moon Guild** `moon-guild` | white / pearl | pearl cream + silver | moonstone & pearl courts | lanterns, crescents, silk stalls, night markets |
| **Tide Guild** `tide-guild` | blue / sapphire | royal sapphire | harbor gem trade | ships, docks, sails, sea glass, brass |
| **Grove Guild** `grove-guild` | green / emerald | emerald | forest emerald brokers | moss ateliers, leaves, wooden trays, vines |
| **Ember Guild** `ember-guild` | red / ruby | ruby | warm ruby forges | forge glow, coals, copper tools — **cute forge, not lava hell** |
| **Onyx Guild** `onyx-guild` | black / onyx | charcoal onyx | shadow vault cutters | velvet vaults, dark gems, soft candlelight — **mysterious, not horror** |

Gold is the wild / joker token — not a guild. Treat gold as warm treasure accent (coins, trim, brooches), never as a sixth guild.

### Nobles (`guild-patron-*`)

**Rare human patrons** (approved) — soft stylized fantasy humans matching the key-art noble portrait language: regal, kind, painted (not photoreal), gem brooches / laurels / crowns. They are sponsors from outside the bunnyfolk guilds. Readable silhouette at small square tile size. Do not make nobles bunnyfolk unless a future brief says otherwise.

---

## 3. Visual style rules

### Proportions (approved: follow key art)

Match the key-art hero language: fluffy chibi-leaning bunnyfolk (big head, short limbs, oversized eyes, plush fur), polished painterly finish. Same softness and cuteness on card faces — do not drift toward semi-realistic animal anatomy or Wave 1 human realism.

### Do

- Soft painterly digital illustration with plush / velvety fur texture
- Soft diffused lighting; gentle sparkles on gems; floating petals / dust motes OK in moderation
- Bright, inviting palette: pastel skies, warm wood, vivid gem accents
- Clear readable silhouettes at card runtime size (~512×768) and noble tile (~512×512)
- Card art is **frame-free** — UI draws the card chrome; leave padding; no baked borders/text
- Architecture: soft high-fantasy spires, banners, clean streets — like the key-art kingdom

### Don't

- Photoreal humans on development cards; grimdark forges, blood, horror, gore
- Hard noir / chiaroscuro as the default look (Wave 1 style is retired)
- Tiny unreadable details that vanish at card size
- Watermarks, signatures, logos, baked-in Chinese/English text on art
- Purple-on-white generic AI gradient look; flat cream newspaper look
- Copying Splendor / original IP art, logos, or card layouts
- Noble portraits that look like stock photo humans — keep the soft painted key-art patron look

### Tone ladder by card level

| Level | Tone | Subject complexity |
| --- | --- | --- |
| L1 | Apprentice / daily craft | Single bunny + simple workshop or stall |
| L2 | Journeyman / notable trade | Richer props, guild colors stronger |
| L3 | Masterpiece / landmark | Heroic pose or landmark scene, still cute |

---

## 4. Asset-type framing

| Asset | Framing | Notes |
| --- | --- | --- |
| Card face | Portrait ~2:3, subject centered, padding from edges | Bunnyfolk; guild color accents in costume / props / light. Runtime card box is ~5:8 so `object-fit: cover` crops **left/right** (~3% per side / ~6.25% total width); keep a **5% safe margin per side** so faces stay clear of the crop. Top ~15% / bottom ~18% are overlay bands (prestige, cost); keep essential detail out of those UI bands too. See `docs/ui-overhaul-plan.md` A.4. |
| Noble tile | Square 1:1, bust or crest-forward | Rare soft-fantasy **human** patron |
| Gem tokens | Flat SVG, faceted gem in metal rim | Match palette.json; gold rim OK |
| Desktop table bg (`bg_merchant_table`) | Steep top-down; **table surface ≥90% of frame** | Only a thin blurred strip of balcony/kingdom at the far top edge. No castle vista dominating. Empty center for cards. |
| Lobby / splash bg | Wide pastel kingdom wash OK | Marketing / lobby only — not the in-game play surface |
| Key / splash | Hero Tulabunba + gems + kingdom | Follow key-art composition language |

### Guild gem color purity (cards)

On development card art, **visible gemstones must match that guild's sigil color**. Metal trays/tools may use soft gold. Do not put a rainbow assortment tray on a single-guild card.

| Guild | Allowed gem colors on card |
| --- | --- |
| moon-guild | pearl / cream / soft white / silver moonstone |
| tide-guild | sapphire / blue / seafoam glass |
| grove-guild | emerald / green |
| ember-guild | ruby / red / warm copper-red |
| onyx-guild | onyx / black / charcoal only |

---

## 5. Relationship to existing UI

Current UI (`App.css`) uses warm parchment / dark-green brand accents. Art direction should **harmonize**, not force a full UI redesign:

- Keep gem token hexes aligned with palette.json (may slightly brighten to match key art)
- Card art should sit cleanly on cream card chrome
- Future UI polish can lean more pastel / blue-gold after art lock

---

## 6. Review checklist — locked 2026-07-11

- [x] Soft bunny fantasy direction approved (reject dark human Wave 1)
- [x] Hero look for 兔拉崩吧 approved (blue mantle + gold stars + white fluff)
- [x] Five guild specialties / motifs approved
- [x] Nobles = **rare human patrons** (key-art portrait language)
- [x] Card proportions = **follow key art** (fluffy chibi-leaning)
- [x] Palette.json + prompt blocks approved for generation use

Deferred: Chinese title styling (splash-only vs in-game brand) — decide with UI polish.

---

## 7. Next steps

1. ~~Mark Wave 1 superseded~~ done
2. **Wave 1b style-lock pack** — regen 5 guild L1 + 1 human noble + table bg using this bible + key-art reference
3. Human review of Wave 1b → promote masters → wire `App.tsx` artSeed loader
4. Scale Waves 2–5 (remaining cards / nobles) with locked prompts
5. Update PRODUCT.md §20 item 5 as decided
