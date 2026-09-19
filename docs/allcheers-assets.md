# AllCheers Phase 1 assets

## Design polish 2026-09-17

Self-hosted Nunito Sans: `app/fonts/NunitoSans-variable.ttf` with `app/fonts/OFL.txt`, downloaded 2026-09-17 from google/fonts `ofl/nunitosans` main branch; source TTF sha `ccc85657…` and OFL sha `2ae17359…` (from the directory API listing) verified with `git hash-object` against downloaded copies; no font conversion or subsetting. Loaded via `next/font/local` (weight 400-800, display swap, Arial fallback with automatic metric adjustment); `body` and form controls inherit it, no runtime external font requests. Original berry/cream favicon: `app/icon.svg` (rounded berry square, cream "A" stroke, small sparkle; drawn by hand in this checkpoint, not copied from a reference) plus `public/favicon.ico` containing 16/32/48px PNG frames packed from that SVG via sharp in a temporary build command (only per-contract output; no extra dependency added).

Authoritative distribution: [google/fonts Nunito Sans directory](https://github.com/google/fonts/tree/main/ofl/nunitosans), [variable TTF](https://raw.githubusercontent.com/google/fonts/main/ofl/nunitosans/NunitoSans%5BYTLC%2Copsz%2Cwdth%2Cwght%5D.ttf), and [SIL OFL 1.1](https://raw.githubusercontent.com/google/fonts/main/ofl/nunitosans/OFL.txt). Full Git blob IDs rechecked against the directory API: font `ccc8565733e7d037ede2c9cc971ceb6375e28733`; license `2ae17359801c71b7b568854b98f73969ad822474`. Copyright: The Nunito Sans Project Authors; upstream project is [Fonthausen/NunitoSans](https://github.com/Fonthausen/NunitoSans).

## Party hero refinement - 2026-09-14

The owner requested a stronger party atmosphere than the seated social scene. Current hero: `public/images/allcheers-party-hero-v2.png`, generated with built-in ImageGen and visually reviewed for dancing, raised drinks, warm lighting, an adult cast and usable space for the heading. The original image remains preserved. This is an imagined Jaipur-inspired party, not an actual venue or customer endorsement.

Final generation prompt:

Photorealistic editorial nightlife photograph for AllCheers website hero, 1536x1024 landscape. An energetic upscale rooftop HOUSE PARTY in Jaipur at night, caught mid-celebration, emphatically dancing and joyful movement rather than seated conversation. Five Indian adults clearly aged 28-35 standing, laughing, a woman in flowing burgundy dancing with one arm raised, friends leaning into a celebratory toast, another dancing in background. Candid natural expressions and believable anatomy. Prominent amber cocktail and bright berry-pink mocktail with citrus and mint in raised glasses at chest level; a small foreground drinks table on bottom right with ice-filled glassware. Warm festoon lights, gold disco reflections and subtle magenta accent lighting, lively party atmosphere. Distant softly blurred sandstone palace architecture and bougainvillea give Jaipur context, not an identifiable real venue. Composition: people and drinks concentrated center-right; left 35 percent darker out-of-focus party lights and foliage for white HTML heading. Keep subjects in central/right area for mobile crop. Capture physical movement with slight motion blur on dancing fabric and background guests but crisp foreground faces and glasses. Rich warm amber, berry and plum, sophisticated celebratory energy. NO sofas, no seated people, no dinner scene, no stage, no huge concert, no branded bottles, no text or logo, no watermark, no UI. This is an imagined party, not actual customers.

## Original implementation assets

Implemented 2026-09-14. The approved desktop and refined mobile mockups remain design references; the website uses HTML, CSS and separate images.

| Production file | Source | Use |
| --- | --- | --- |
| `public/images/allcheers-party-hero.png` | Built-in ImageGen, generated 2026-09-14 | Imagined adult Jaipur-inspired gathering, not an actual venue or customer endorsement |
| `public/images/amber-cocktail.jpg` | Denys Gromov, [Pexels](https://www.pexels.com/photo/old-fashioned-cocktail-drink-4762719/) | Illustrative cocktail photograph |
| `public/images/berry-mocktail.jpg` | Santiago Moreno, [Pexels](https://www.pexels.com/photo/clear-drinking-glass-with-blueberry-cocktail-9171554/) | Source-described mocktail; no verified recipe, ABV or catalogue claim |
| `public/images/jaipur-jal-mahal.jpg` | Naval Rathore, [Unsplash](https://unsplash.com/photos/jal-mahal-with-lights-on-at-night-MvSNnaiK2So) | Jaipur atmosphere; no venue partnership implied |

Stock files were copied unchanged from the reviewed shortlist. Its `manifest.json` and `README.md` retain the source/license review and limitations (2026-09-13). Pinterest previews and rejected stock were not copied into public assets. No product photographs, workbook or recovery material were changed.

## Final hero prompt (built-in ImageGen)

Use case: photorealistic-natural. Asset: standalone full-bleed AllCheers marketing website hero photograph, landscape 1536x1024. Create an elegant candid evening rooftop party inspired by Jaipur: four clearly adult Indian friends in their late twenties/thirties, warmly laughing and talking on right two-thirds; burgundy dress, dark shirt and cream linen clothing. Prominent beautiful glasses on low stone table in foreground: amber rocks cocktail with orange peel and ice, pale citrus highball and vibrant berry-pink spritz with mint. Warm glowing festoon string lights, candle lanterns, magenta bougainvillea, softly blurred sandstone Rajput architecture on distant hill at twilight. Refined inviting real photographic texture, warm amber and berry palette. Left third relatively dark and uncluttered for HTML white heading overlay. Frame people and foreground drinks so central/right crop works on mobile. This is an illustrative imagined gathering, no actual venue claimed. No text, lettering, logo, branding, watermark or UI; do not render website sections or buttons.
