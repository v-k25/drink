# Recipe pantry requirement audit

2026-10-02. Fresh read-only `loadRecipes()` captured 28 currently eligible rows; 17 approved, 11 excluded from pantry matching. Publication is still determined solely by the unchanged reader. Audit records never serve cached recipes.

The audit compares every live ingredient/detail row, full preparation, garnish, ice, glassware, method and provenance with retained source JSON-LD. Evidence: `output/recipe-pantry/live-eligible.json`, `retained-source-evidence.json`, `audit-decisions.json`; retained originals under `output/recipe-extract/` were read unchanged. No live source re-fetch or DB write.

Retained source descriptions also establish heavy cream for White Russian, fresh lime juice for Vodka Gimlet and Last Word, fresh lemon juice for Sidecar, and fresh strawberries for Strawberry Daiquiri. Those requirements use these exact forms while showing the verbatim raw listed measure. Live description is also signature-bound. Mango Margarita requires the source-recorded high-speed blender.

Exact form identities are manual, not fuzzy: lime wedge, wheel, juice, fresh juice, whole ambiguous lime, ice and ice cubes stay distinct. Cointreau is not generic triple sec; light rum is not white rum; cream is not fresh cream. Serving-glass type unspecified is shown honestly. Actions explicitly requiring shaking, straining, blending, stirring or muddling establish those tools, without asserting optional equipment or precise tool styles. Measuring/cutting equipment is not specified by these sources; users must check their own preparation equipment.

Only recorded raw quantities produce One ingredient away. Source step additions with no recorded measure (ice, several garnishes/rims) have null quantity and cannot be that missing-item suggestion. This does not exclude otherwise complete presence matching. Optional non-alcoholic rum in the pina-colada mocktail is explicitly marked optional in the source and omitted; optional soda splash in Negroni instructions likewise omitted. Null fields alone never confirm absence: complete source methods were reviewed separately. Unspecified or alternative required identities exclude the entire recipe. All source-bearing fields are pinned by exact JSON signature; drift removes approval until a new audit.

| Recipe | Pantry review | Evidence/reason |
|---|---|---|
| White Lady (`dn-white-lady`) | Complete | [Retained source](https://drinknation.com/drink/white-lady). Required ice/garnish reconciled; see evidence requirements and equipment. |
| Cape Codder (`dn-cape-codder`) | Complete | [Retained source](https://drinknation.com/drink/cape-codder). Required ice/garnish reconciled; see evidence requirements and equipment. |
| Margarita (`dn-margarita`) | Complete | [Retained source](https://drinknation.com/drink/margarita). Required ice/garnish reconciled; see evidence requirements and equipment. |
| Negroni (`dn-negroni`) | Complete | [Retained source](https://drinknation.com/drink/negroni). Required ice/garnish reconciled; see evidence requirements and equipment. |
| White Russian (`dn-white-russian`) | Complete | [Retained source](https://drinknation.com/drink/white-russian). Full retained source instructions contain no additional garnish beyond listed requirements. |
| Virgin Mango Margarita (`mm-virgin-mango-margarita`) | Complete | [Retained source](https://mindfulmocktail.com/virgin-mango-margarita/). Full source instructions use no ice; no ice requirement asserted.  |
| Watermelon Strawberry Mocktail (`mm-watermelon-strawberry-mocktail`) | Excluded | [Retained source](https://mindfulmocktail.com/watermelon-strawberry-mocktail/). Retained source requires unspecified garnish; published method omits it. Cannot establish complete identity. |
| Madras (`dn-madras`) | Complete | [Retained source](https://drinknation.com/drink/madras). Required ice/garnish reconciled; see evidence requirements and equipment. |
| Vodka Gimlet (`dn-vodka-gimlet`) | Complete | [Retained source](https://drinknation.com/drink/vodka-gimlet). Full retained source instructions contain no additional garnish beyond listed requirements. |
| Whiskey Sour (`dn-whiskey-sour`) | Excluded | [Retained source](https://drinknation.com/drink/whiskey-sour). Required cherry garnish type unspecified; optional egg-white row is confirmed optional but garnish identity remains unresolved. |
| Apple Martini (`dn-apple-martini`) | Complete | [Retained source](https://drinknation.com/drink/apple-martini). Required ice/garnish reconciled; see evidence requirements and equipment. |
| Bay Breeze (`dn-bay-breeze`) | Complete | [Retained source](https://drinknation.com/drink/bay-breeze). Required ice/garnish reconciled; see evidence requirements and equipment. |
| Boulevardier (`dn-boulevardier`) | Excluded | [Retained source](https://drinknation.com/drink/boulevardier). Required orange or lemon zest alternative has no single exact identity. |
| Cuba Libre (`dn-cuba-libre`) | Complete | [Retained source](https://drinknation.com/drink/cuba-libre). Required ice/garnish reconciled; see evidence requirements and equipment. |
| Daiquiri (`dn-daiquiri`) | Excluded | [Retained source](https://drinknation.com/drink/daiquiri). Lime measured in oz; neither ingredient nor instructions establishes juice versus another form. |
| Last Word (`dn-last-word`) | Complete | [Retained source](https://drinknation.com/drink/last-word). Full retained source instructions contain no additional garnish beyond listed requirements. |
| Paloma (`dn-paloma`) | Excluded | [Retained source](https://drinknation.com/drink/paloma). Instructions require pink grapefruit soda; ingredient row only says Grapefruit Soda. Form/type reconciliation unresolved. |
| Pina Colada (`dn-pina-colada`) | Excluded | [Retained source](https://drinknation.com/drink/pina-colada). Pineapple wedge and/or cherry garnish alternatives unresolved; source also calls for umbrellas or straw. |
| Salty Dog (`dn-salty-dog`) | Excluded | [Retained source](https://drinknation.com/drink/salty-dog). Kosher or rock salt and lemon/lime/grapefruit wedge alternatives unresolved. |
| Sidecar (`dn-sidecar`) | Complete | [Retained source](https://drinknation.com/drink/sidecar). Full retained source instructions contain no additional garnish beyond listed requirements. |
| Strawberry Daiquiri (`dn-strawberry-daiquiri`) | Complete | [Retained source](https://drinknation.com/drink/strawberry-daiquiri). Full retained source instructions contain no additional garnish beyond listed requirements. |
| Pineapple Spritzer Mocktail (`mm-pineapple-coconut-mocktail`) | Excluded | [Retained source](https://mindfulmocktail.com/pineapple-coconut-mocktail/). Pineapple form unspecified in retained ingredient list and method; cannot approve exact preparation form. |
| Easy Blood Orange Mocktail (`mm-blood-orange-mocktail`) | Excluded | [Retained source](https://mindfulmocktail.com/blood-orange-mocktail/). Alcohol-free rose alternative and rosemary/thyme/mint garnish options unresolved. |
| Piña Colada Mocktail (Non-Alcoholic + 3 Ingredients!) (`mm-pina-colada-mocktail-recipe`) | Complete | [Retained source](https://mindfulmocktail.com/pina-colada-mocktail-recipe/). Full source instructions use no ice; no ice requirement asserted.  |
| Vodka Mocktail (`mm-vodka-mocktail`) | Excluded | [Retained source](https://mindfulmocktail.com/vodka-mocktail/). Alcohol-free vodka/apple cider vinegar alternative and apple fan/slice garnish unresolved. |
| Brandy Alexander (`dn-brandy-alexander`) | Complete | [Retained source](https://drinknation.com/drink/brandy-alexander). Full retained source instructions contain no additional garnish beyond listed requirements. |
| Easy Roy Rogers Drink (`mm-roy-rogers-drink`) | Complete | [Retained source](https://mindfulmocktail.com/roy-rogers-drink/). Required ice/garnish reconciled; see evidence requirements and equipment. |
| Grapefruit MartiNO Mocktail (`mm-grapefruit-martino-mocktail`) | Excluded | [Retained source](https://mindfulmocktail.com/grapefruit-martino-mocktail/). Source says garnish without identity; published method omits it. Equipment serving glass type not recorded. |
