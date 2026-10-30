# Reviewed launch selection — 2026-09-28

The owner requested completion of Phases 0–3, including resolving the empty
recipe library. The launch selection is the six previously source-reviewed
recipes, not a fixed catalogue target. They use three or four listed ingredients;
the fruit mocktails prioritize ordinary groceries, while the cocktails require
their named spirits/liqueurs. Availability and taste testing are not claimed.

| ID | Classification | Method | Editorial assessment |
|---|---|---|---|
| dn-cape-codder | Cocktail | Build | Single cocktail; vodka, cranberry and lime; source quantities retained |
| dn-white-russian | Cocktail | Build | Single cocktail; cream explicitly identifies milk allergen; caffeine remains unknown |
| dn-negroni | Cocktail | Stir | Single cocktail; equal measures; no shaking/carbonation hazard |
| dn-margarita | Cocktail | Shake | Single cocktail; citrus/tequila/liqueur; salt rim identified separately |
| mm-virgin-mango-margarita | Mocktail | Blend | One serving; mango/coconut water/lime; garnish identified separately |
| mm-watermelon-strawberry-mocktail | Mocktail | Blend | Two servings; watermelon/strawberries/lime; original quantities retained |

Checks: no hazardous technique, implausible batch size, offensive recipe names,
or duplicates within the eligible launch set. Classification follows reviewed
ingredients. Preparation and descriptions are AllCheers wording from source
facts; no photography, source narrative, ratings, nutrition, health claims or
estimated ABV are republished. Ingredient brand names identify factual products,
not sponsorship. Unknown allergens/caffeine remain unknown, never allergen-free.
Source links, retrieval dates and content-origin disclosure remain intact.
This review does not assert a source license or legal clearance.

Evidence: `output/recipe-curation/evidence.jsonl` contains the extracted source
ingredients and method facts used for comparison. Fresh reads confirmed both
Mindful Mocktail recipes and White Russian; other DrinkNation fresh reads failed,
so their retained extraction evidence was used without claiming a fresh recheck.
Sources: https://drinknation.com/drink/cape-codder,
https://drinknation.com/drink/white-russian,
https://drinknation.com/drink/negroni,
https://drinknation.com/drink/margarita,
https://mindfulmocktail.com/virgin-mango-margarita/,
https://mindfulmocktail.com/watermelon-strawberry-mocktail/.

Explicit exclusions: all 12 legacy rows (`negroni`, `paloma`, `gimlet`,
`oldfashioned`, `spritz`, `espressomartini`, `mezcalsour`, `toddy`, `irishcoffee`,
`paperplane`, `zerogrove`, `goldenhour`) lack recorded source provenance and
classification. They remain unchanged and ineligible. The other 9,444 imported
drafts retain their review flags and remain hidden.

The pre-change six-row snapshot and aggregate hash of every other catalogue row
are in `output/recipe-launch/remote-before.json`. Publication SQL checks all six
full-row hashes and the unrelated-row aggregate in one transaction; a mismatch
aborts. It changes only publication/readiness/quality flags, featured selection,
the known cream allergen and trigger-managed timestamps.
