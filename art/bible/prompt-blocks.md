# Prompt Blocks — 兔拉崩吧

Reusable prompt fragments. Compose: **identity + game role + style block + guild block + framing + forbidden block**.

Reference image for style lock / edits: `art/bible/references/tulabunba-key-art.png`

---

## Global style block

```text
Soft high-fantasy painterly illustration matching the Tulabunba key art: fluffy chibi-leaning anthropomorphic bunnyfolk with big heads short limbs oversized eyes and plush fur, soft diffused lighting, gentle gem sparkles, pastel magical kingdom atmosphere, cute but polished, readable silhouette, warm inviting colors
```

## Hero block (splash / brand only)

```text
Tulabunba, a tiny fluffy white bunny hero with long drooping ears and large deep-blue eyes, wearing a royal-blue mantle with gold star embroidery and gold trim, cream tunic, brown leather travel pouches, brave and adorable pose
```

## Framing blocks

### Card face

```text
Portrait 2:3 game card illustration, subject centered with padding from edges, no card frame, no border, no UI chrome, important details away from edges, readable at small size
```

### Noble tile

```text
Square 1:1 noble patron portrait, rare soft-fantasy human patron matching Tulabunba key-art portrait language, painted not photoreal, ceremonial robes with gem brooches, dignified kind expression, centered with padding, readable at small tile size, no frame, no text
```

### Environment / desktop table (`bg_merchant_table`)

```text
Wide 16:9 desktop gameplay table background, steep high-angle nearly top-down camera, table felt or parchment surface fills 90-95% of the frame, warm wood rail near image edges, empty clean center for cards and tokens, only a thin soft-blurred balcony strip at the extreme top edge, no castle vista, no large sky, no characters, no cards, no treasure piles, no text
```

### Environment / lobby or splash (not play surface)

```text
Wide soft pastel fantasy kingdom backdrop, atmospheric but secondary to UI, no text
```

### Guild gem purity (append on every card)

```text
CRITICAL: every gemstone in the image must match this guild's sigil color only; metal may be soft gold; no rainbow gem tray, no off-guild gem colors
```

## Guild blocks

### moon-guild (white / pearl)

```text
Moon Guild bunnyfolk, pearl and moonstone trade, silver-cream palette, soft lantern light, silk stall or pearl court workshop, crescent and pearl motifs, gentle night-market glow, every gemstone is pearl cream white or silver moonstone only — no off-guild gem colors
```

### tide-guild (blue / sapphire)

```text
Tide Guild bunnyfolk, sapphire harbor trade, royal blue and seafoam accents, docks and sails, sea-glass trays, brass tools, bright coastal daylight, every gemstone is sapphire blue or seafoam glass only — no off-guild gem colors
```

### grove-guild (green / emerald)

```text
Grove Guild bunnyfolk, emerald forest brokerage, mossy wooden atelier, leaf and vine motifs, dappled green light, warm bark browns, every gemstone is emerald or green only — no off-guild gem colors
```

### ember-guild (red / ruby)

```text
Ember Guild bunnyfolk, ruby cutting at a cozy warm forge, ruby-red and copper accents, soft forge glow and coals, cute workshop not grimdark, no lava hellscape, every gemstone is ruby red only — no off-guild gem colors
```

### onyx-guild (black / onyx)

```text
Onyx Guild bunnyfolk, onyx vault cutting, charcoal and soft gold accents, velvet-lined trays, candlelit mysterious workshop, cute and secretive not horror, every gemstone is black charcoal or onyx only — no red blue green yellow white or rainbow gems
```

## Level tone blocks

```text
L1: young apprentice bunny, simple tools, single clear activity
L2: skilled journeyman bunny, richer guild props, stronger sigil color
L3: master bunny or landmark guild scene, heroic but still cute, premium detail without clutter
```

## Forbidden block (always append)

### Development cards / environments

```text
no text, no letters, no numbers, no logo, no watermark, no signature, no frame, no border, no cropped edges, no photoreal human, no grimdark, no horror, no blood, no gore, no semi-realistic animal anatomy
```

### Nobles (human patrons allowed)

```text
no text, no letters, no numbers, no logo, no watermark, no signature, no frame, no border, no cropped edges, no photoreal stock-photo look, no grimdark, no horror, no blood, no gore
```

---

## Example assembled prompts

### L1 card — onyx-guild-l1-001

```text
A game-ready development card illustration for a bunny gem merchant board game. Young Onyx Guild apprentice bunny polishing a dark onyx gem at a candlelit velvet-lined workbench. Soft high-fantasy painterly illustration matching the Tulabunba key art: fluffy chibi-leaning anthropomorphic bunnyfolk with big heads short limbs oversized eyes and plush fur, soft diffused lighting, gentle gem sparkles, pastel magical kingdom atmosphere, cute but polished, readable silhouette. Onyx Guild bunnyfolk, onyx vault cutting, charcoal and soft gold accents, velvet-lined trays, candlelit mysterious workshop, cute and secretive not horror. Portrait 2:3 game card illustration, subject centered with padding from edges, no card frame, no border, no UI chrome, important details away from edges, readable at small size. no text, no letters, no numbers, no logo, no watermark, no signature, no frame, no border, no cropped edges, no photoreal human, no grimdark, no horror, no blood, no gore, no semi-realistic animal anatomy
```

### Noble — guild-patron-001

```text
A game-ready noble patron tile for a bunny gem merchant board game. Rare soft-fantasy human patron matching the Tulabunba key-art portrait language: painted not photoreal, ceremonial embroidered robes with mixed gem brooches, soft laurel or tiny crown, dignified kind expression. Soft high-fantasy painterly illustration matching the Tulabunba key art, soft diffused lighting, gentle gem sparkles, cute but polished kingdom atmosphere, readable silhouette. Square 1:1 noble patron portrait, centered with padding, readable at small tile size, no frame, no text. no text, no letters, no numbers, no logo, no watermark, no signature, no frame, no border, no cropped edges, no photoreal stock-photo look, no grimdark, no horror, no blood, no gore
```
