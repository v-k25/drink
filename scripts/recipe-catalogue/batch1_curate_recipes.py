#!/usr/bin/env python3
"""Batch-1 curation: 20 source-reviewed drafts (16 cocktails + 4 mocktails).

Follows the six-recipe curation pattern (curate_recipes.py): each row keeps its
retained source ingredient strings verbatim, provenance columns, servings/yield
and source-derived prep time, and gains hand-authored original AllCheers
preparation steps and a description generated from structured facts only.

Safety/copyright rules enforced here (fail closed):
- Source ingredients must match the retained strings verbatim (whitespace
  normalised) for every row.
- Generated description + preparation steps may not share any run of six
  consecutive words with that record's own source description or instruction
  text (catalogue_core ngram rule).
- Method classification follows the record's source instructions plus
  catalogue_core defaults; no carbonation-plus-shake combination may appear
  (a carbonated mixer is never shaken here).
- Name screen: no unsafe patterns and no offensive (sexual/slur/profane)
  recipe names.
- Allergens/caffeine stay explicit unknown (never allergen-free); glassware,
  garnish and ice only where the source specifies them.

Read-only sources (never refetched):
  - output/recipe-extract/drinknation-recipes.jsonl
  - output/recipe-extract/mindfulmocktail-recipes.jsonl

Outputs (preview + evidence + guarded SQL; the live UPDATE is applied
separately via the Supabase tools after this script exits 0):
  - output/recipe-batch1/batch1-updates.jsonl
  - output/recipe-batch1/batch1-evidence.jsonl
  - output/recipe-batch1/batch1-editorial.sql
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts" / "recipe-catalogue"))
import catalogue_core as cc  # noqa: E402

OUT = REPO / "output" / "recipe-batch1"

# Before-state full-row md5 hashes, captured from the live remote read
# (md5(to_jsonb(d)::text)) immediately before this curation. The generated SQL
# re-verifies every hash inside its transaction and aborts on any drift.
BEFORE_HASHES = {
    "dn-apple-martini": "1cb6050ea6b3864d2d27557538ad5550",
    "dn-bay-breeze": "f6f00539031b481bcd4b40a9a05af7c4",
    "dn-boulevardier": "4a9df214fc3918b47b2652f5556ed3d2",
    "dn-brandy-alexander": "1c6c1bc603174d3209eaf603d212976b",
    "dn-cuba-libre": "b08001fdf1c8389bfe6548070d2bc007",
    "dn-daiquiri": "f0ee0cc0be611aabe9990a8e875732e3",
    "dn-last-word": "b0856043a6c59105f39325cabe10ce29",
    "dn-madras": "52024c02826a41f51579dcbbda4efab4",
    "dn-paloma": "c457eef5f6f97942d25f4b0556109e32",
    "dn-pina-colada": "3c7ad696fa9ed2bf2c82652c0d8f82b9",
    "dn-salty-dog": "956c3ff19f4b1473704cfae3583e2b37",
    "dn-sidecar": "ff595e9398cbe3545120dbce9272af8d",
    "dn-strawberry-daiquiri": "6d2f4005d3c679e656e4d40f39824175",
    "dn-vodka-gimlet": "4022e814f4815ecd9b785179ca95ebcc",
    "dn-whiskey-sour": "7beb27cd48b2cabaf9a1592b5cb0c4b1",
    "dn-white-lady": "698267a66047da8078969aa5a2e5ec7c",
    "mm-blood-orange-mocktail": "82efa39c62c449ca22f3158fb9d79568",
    "mm-pina-colada-mocktail-recipe": "ed93f4d5bdcc0f7a82539098e2a78006",
    "mm-pineapple-coconut-mocktail": "892dfd003c68966dd8b439095c2f7cf6",
    "mm-vodka-mocktail": "05d2e4cda02bf7636a5fdae2232f3ad8",
}

# Aggregate md5 of every other catalogue row (9,442 rows) in the same
# before-state read; re-verified inside the transaction.
OTHER_AGG_HASH = "4f70ebde0e1c518fb9f7e9f77e7804b5"

# Manual editorial content per recipe. ingredients are the retained source
# strings exactly as stored live; servings/recipe_yield/prep_time_min are the
# source-derived before-state values that must be preserved unchanged.
REVIEWS: dict[str, dict] = {
    "dn-madras": {
        "ingredients": ["1.5 oz. Vodka", "3 oz. Cranberry Juice", "1 oz. Orange Juice", "1 wedge Lime"],
        "method": "build", "glassware": "Highball glass", "garnish": "Lime wedge", "ice_type": "Ice",
        "servings": 1, "recipe_yield": "1 cocktail", "prep_time_min": None,
        "steps": [
            "Pour the vodka, cranberry juice and orange juice over ice in a highball glass.",
            "Garnish with the lime wedge.",
        ],
        "description": "Cranberry and orange juice with vodka over ice, finished with a lime wedge.",
        "review": "Source facts reviewed; original steps. Source pours everything but the lime wedge into a highball glass over ice and garnishes with the wedge, so the method is build and the shake-template draft steps were corrected.",
    },
    "dn-bay-breeze": {
        "ingredients": ["1.5 oz. Vodka", "3 oz. Cranberry Juice", "2 oz. Pineapple Juice"],
        "method": "build", "glassware": "Highball glass", "garnish": "Lime wedge", "ice_type": "Ice",
        "servings": 1, "recipe_yield": "1 cocktail", "prep_time_min": None,
        "steps": [
            "Fill a highball glass with ice.",
            "Pour in the vodka, then the cranberry and pineapple juice.",
            "Garnish with the lime wedge.",
        ],
        "description": "Vodka, cranberry juice and pineapple juice served over ice with a lime wedge.",
        "review": "Source facts reviewed; original steps. Source builds in an iced highball and garnishes with a lime wedge; the shake-template draft steps were corrected to build.",
    },
    "dn-salty-dog": {
        "ingredients": ["1.33 oz. Vodka", "3.33 oz. Grapefruit Juice", "0.25 tsp. Salt"],
        "method": "build", "glassware": "Highball glass", "garnish": "Lemon, lime or grapefruit wedge", "ice_type": "Ice",
        "servings": 1, "recipe_yield": "1 cocktail", "prep_time_min": None,
        "steps": [
            "Coat a highball glass rim with salt.",
            "Fill the glass with ice, then pour in the vodka.",
            "Top with the grapefruit juice.",
            "Garnish with a citrus wedge.",
        ],
        "description": "Vodka and grapefruit juice over ice in a salt-rimmed glass.",
        "review": "Source facts reviewed; original steps. Source rims the glass with kosher or rock salt (salt is a listed ingredient), then builds over ice; garnish options condensed to a neutral citrus wedge.",
    },
    "dn-vodka-gimlet": {
        "ingredients": ["1.5 oz. Vodka", "1 oz. Lime Juice", "1 tsp. Powdered Sugar"],
        "method": "shake", "glassware": "Cocktail glass", "garnish": None, "ice_type": "Ice",
        "servings": 1, "recipe_yield": "1 cocktail", "prep_time_min": None,
        "steps": [
            "Add the vodka, lime juice and powdered sugar to a shaker with ice.",
            "Shake hard until cold.",
            "Strain into the cocktail glass.",
        ],
        "description": "Vodka and lime juice with sugar, shaken and served straight up.",
        "review": "Source facts reviewed; original steps. Source shakes and strains into a cocktail glass; no garnish specified, so none is recorded.",
    },
    "dn-apple-martini": {
        "ingredients": ["0.5 oz. Sour Apple Schnapps", "0.5 oz. Cointreau", "1.33 oz. Vodka"],
        "method": "stir", "glassware": "Cocktail glass", "garnish": "Apple slice", "ice_type": "Ice",
        "servings": 1, "recipe_yield": "1 cocktail", "prep_time_min": None,
        "steps": [
            "Stir the schnapps, Cointreau and vodka over ice in a mixing glass.",
            "Strain into the chilled glass.",
            "Garnish with the apple slice.",
        ],
        "description": "Vodka, Cointreau and sour apple schnapps, stirred and strained cold.",
        "review": "Source facts reviewed; original steps. Source stirs in a mixing glass with ice, strains into a chilled cocktail glass and garnishes with an apple slice; the stir classification follows the source.",
    },
    "dn-cuba-libre": {
        "ingredients": ["1.5 oz. Light Rum", "4 oz. Cola", "0.33 oz. Lime Juice"],
        "method": "build", "glassware": "Tall glass", "garnish": "Lime wedge", "ice_type": "Ice",
        "servings": 1, "recipe_yield": "1 cocktail", "prep_time_min": None,
        "steps": [
            "Pack a tall glass with ice.",
            "Add the rum and lime juice, then top with the cola.",
            "Garnish with the lime wedge.",
        ],
        "description": "Light rum, lime juice and cola built over ice.",
        "review": "Source facts reviewed; original steps. Source fills a tall glass with ice, adds rum and lime, tops with cola and garnishes with a lime wedge; built, never shaken.",
    },
    "dn-daiquiri": {
        "ingredients": ["2 oz. Light Rum", "0.25 oz. Gomme Syrup", "0.67 oz. Lime"],
        "method": "shake", "glassware": "Cocktail glass", "garnish": None, "ice_type": "Ice",
        "servings": 1, "recipe_yield": "1 cocktail", "prep_time_min": None,
        "steps": [
            "Add the rum, syrup and lime to a shaker with ice.",
            "Shake hard until cold.",
            "Strain into the cocktail glass.",
        ],
        "description": "Light rum, lime and sugar syrup, shaken and strained cold.",
        "review": "Source facts reviewed; original steps. Source shakes and strains into a cocktail glass; no garnish specified, so none is recorded.",
    },
    "dn-strawberry-daiquiri": {
        "ingredients": ["2 oz. Light Rum", "0.75 oz. Lime Juice", "1 oz. Strawberries", "0.75 oz. Sugar Syrup"],
        "method": "shake", "glassware": "Cocktail glass", "garnish": None, "ice_type": "Ice",
        "servings": 1, "recipe_yield": "1 cocktail", "prep_time_min": None,
        "steps": [
            "Muddle the strawberries with the syrup in a shaker.",
            "Add the rum, lime juice and ice.",
            "Shake hard until cold.",
            "Strain into the cocktail glass.",
        ],
        "description": "Light rum with strawberries, lime and sugar syrup, shaken and strained cold.",
        "review": "Source facts reviewed; original steps. Source muddles berries with syrup, shakes with rum, lime and ice, and strains into a cocktail glass; no garnish specified, so none is recorded.",
    },
    "dn-pina-colada": {
        "ingredients": ["1.7 oz. White Rum", "1 oz. Cream of coconut", "1.7 oz. Pineapple Juice"],
        "method": "blend", "glassware": "Hurricane glass", "garnish": "Pineapple wedge and/or cherry", "ice_type": "Crushed ice",
        "servings": 1, "recipe_yield": "1 cocktail", "prep_time_min": None,
        "steps": [
            "Blend the rum, cream of coconut and pineapple juice with crushed ice.",
            "Blend until thick and smooth, adding more ice if needed.",
            "Pour into a hurricane glass and garnish.",
        ],
        "description": "White rum, cream of coconut and pineapple juice blended with crushed ice.",
        "review": "Source facts reviewed; original steps. Source blends with crushed ice to the desired consistency and pours into hurricane glasses with a pineapple wedge and/or cherry; ice type records the source's crushed ice.",
    },
    "dn-white-lady": {
        "ingredients": ["2 oz. Gin", "1.5 oz. Cointreau", "1 oz. Lemon Juice"],
        "method": "shake", "glassware": "Cocktail glass", "garnish": "Lemon twist", "ice_type": "Ice",
        "servings": 1, "recipe_yield": "1 cocktail", "prep_time_min": None,
        "steps": [
            "Add the gin, Cointreau and lemon juice to a shaker.",
            "Fill the shaker with ice and shake hard.",
            "Strain into the chilled glass.",
            "Garnish with a lemon twist.",
        ],
        "description": "Gin, Cointreau and lemon juice, shaken and strained cold.",
        "review": "Source facts reviewed; original steps. Source shakes hard, strains into a chilled cocktail glass and finishes with a lemon twist.",
    },
    "dn-last-word": {
        "ingredients": ["0.75 oz. Green Chartreuse", "0.75 oz. Gin", "0.75 oz. Maraschino Liqueur", "0.75 oz. Lime Juice"],
        "method": "shake", "glassware": "Cocktail glass", "garnish": None, "ice_type": "Ice",
        "servings": 1, "recipe_yield": "1 cocktail", "prep_time_min": None,
        "steps": [
            "Add the four equal measures to a shaker with ice.",
            "Shake hard until cold.",
            "Strain into the cocktail glass.",
        ],
        "description": "Equal parts gin, green chartreuse, maraschino and lime, shaken and strained cold.",
        "review": "Source facts reviewed; original steps. Source shakes equal measures and strains into a cocktail glass; no garnish specified, so none is recorded.",
    },
    "dn-boulevardier": {
        "ingredients": ["1.5 oz. Bourbon", "1 oz. Campari", "1 oz. Red Vermouth"],
        "method": "stir", "glassware": "Cocktail glass", "garnish": "Orange or lemon zest", "ice_type": "Ice",
        "servings": 1, "recipe_yield": "1 cocktail", "prep_time_min": None,
        "steps": [
            "Add the bourbon, Campari and vermouth to a mixing glass with ice.",
            "Stir until cold.",
            "Strain into the chilled glass.",
            "Garnish with citrus zest.",
        ],
        "description": "Bourbon, Campari and red vermouth, stirred over ice.",
        "review": "Source facts reviewed; original steps. Source stirs in an ice-filled mixing glass, strains into a chilled cocktail glass and garnishes with an orange or lemon zest.",
    },
    "dn-whiskey-sour": {
        "ingredients": ["1.5 oz. Bourbon", "0.67 oz. Sugar Syrup", "0.83 oz. (fresh) Lemon Juice", "1 dash (egg white (optional)) Eggs"],
        "method": "shake", "glassware": "Sour glass", "garnish": "Orange slice and cherry", "ice_type": "Ice",
        "servings": 1, "recipe_yield": "1 cocktail", "prep_time_min": None,
        "steps": [
            "Add the bourbon, syrup, lemon juice and optional egg white to a shaker with ice.",
            "Shake hard until cold.",
            "Strain into the sour glass.",
            "Garnish with an orange slice and a cherry.",
        ],
        "description": "Bourbon, lemon juice and sugar syrup, shaken and strained with an optional egg white.",
        "review": "Source facts reviewed; original steps. Source shakes with ice, strains into a sour glass and garnishes with a half orange slice and a cherry; the egg is optional in the source and kept optional in the steps. Allergen and caffeine stay unknown.",
    },
    "dn-sidecar": {
        "ingredients": ["1.67 oz. Cognac", "0.67 oz. Triple Sec", "0.67 oz. Lemon Juice"],
        "method": "shake", "glassware": "Cocktail glass", "garnish": None, "ice_type": "Ice",
        "servings": 1, "recipe_yield": "1 cocktail", "prep_time_min": None,
        "steps": [
            "Add the cognac, triple sec and lemon juice to a shaker with ice.",
            "Shake hard until cold.",
            "Strain into the cocktail glass.",
        ],
        "description": "Cognac, Triple Sec and lemon juice, shaken and strained cold.",
        "review": "Source facts reviewed; original steps. Source shakes and strains into a cocktail glass; no garnish specified, so none is recorded.",
    },
    "dn-brandy-alexander": {
        "ingredients": ["1 oz. Cognac", "1 oz. Dark Creme de Cacao", "1 oz. (fresh) Cream", "1 pinch Nutmeg"],
        "method": "shake", "glassware": "Cocktail glass", "garnish": None, "ice_type": "Ice",
        "servings": 1, "recipe_yield": "1 cocktail", "prep_time_min": None,
        "steps": [
            "Put the cognac, chocolate liqueur and cream in a shaker with ice.",
            "Shake hard until cold.",
            "Strain into the chilled glass.",
            "Sprinkle a pinch of nutmeg on top.",
        ],
        "description": "Cognac and chocolate liqueur with cream, shaken and strained cold.",
        "review": "Source facts reviewed; original steps. Source shakes cognac, creme de cacao and cream, strains into a chilled cocktail glass and sprinkles a pinch of nutmeg; the nutmeg finish stays a step, so no garnish is recorded. Allergen and caffeine stay unknown.",
    },
    "dn-paloma": {
        "ingredients": ["1.67 oz. White Tequila", "0.17 oz. Lime Juice", "1 pinch Salt", "3.33 oz. Grapefruit Soda"],
        "method": "build", "glassware": "Highball glass", "garnish": "Lime slice", "ice_type": "Ice",
        "servings": 1, "recipe_yield": "1 cocktail", "prep_time_min": None,
        "steps": [
            "Pour the tequila and lime juice over ice in a highball glass.",
            "Add the salt.",
            "Top with the grapefruit soda.",
            "Stir gently and garnish with the lime slice.",
        ],
        "description": "Tequila topped with grapefruit soda and lime, served over ice with salt.",
        "review": "Source facts reviewed; original steps. Source builds straight in the glass (pour, ice and salt, top with grapefruit soda, stir gently, garnish), so the method is build and the draft's stir-and-strain template was corrected; the carbonated mixer is never shaken.",
    },
    "mm-blood-orange-mocktail": {
        "ingredients": ["2 tablespoons blood orange juice (freshly squeezed)", "1 tablespoon lime juice (freshly squeezed)", "1 cup alcohol free Rosé or alternative (see notes)"],
        "method": "stir", "glassware": "Wine glass", "garnish": "Sprig of rosemary, thyme or mint", "ice_type": "Ice",
        "servings": 1, "recipe_yield": "1", "prep_time_min": 3,
        "steps": [
            "Fill a wine glass with ice and press in a blood orange slice.",
            "Add the blood orange juice and lime juice, then stir gently.",
            "Garnish with a fresh herb sprig.",
        ],
        "description": "Blood orange and lime juice with alcohol-free rosé, stirred over ice.",
        "review": "Source facts reviewed; original steps. Source fills a large wine glass with ice, presses in a blood orange slice, stirs the juices gently and garnishes with a rosemary, thyme or mint sprig; the primary ingredient is unambiguous (alcohol-free rosé, with an optional alternative). prep_time_min 3 is the source's PT3M prepTime.",
    },
    "mm-pina-colada-mocktail-recipe": {
        "ingredients": ["1 cup frozen pineapple chunks", "1/3 cup coconut cream", "1/2 cup pineapple juice", "1 oz non-alcoholic rum ((optional))"],
        "method": "blend", "glassware": None, "garnish": "Pineapple wedge", "ice_type": None,
        "servings": 1, "recipe_yield": "1", "prep_time_min": 5,
        "steps": [
            "Blend the frozen pineapple, coconut cream and pineapple juice until smooth.",
            "Pour into a glass and garnish with the pineapple wedge.",
        ],
        "description": "Frozen pineapple and coconut cream blended with pineapple juice.",
        "review": "Source facts reviewed; original steps. Source blends everything until smooth, pours and garnishes with a pineapple wedge; no glassware or ice specified, so none is recorded. prep_time_min 5 is the source's PT5M prepTime.",
    },
    "mm-pineapple-coconut-mocktail": {
        "ingredients": ["1 cup pineapple", "1 cup reduced-fat coconut milk", "2 tbsp lime juice", "2 cups sparkling water"],
        "method": "blend", "glassware": None, "garnish": None, "ice_type": None,
        "servings": 2, "recipe_yield": "2", "prep_time_min": 10,
        "steps": [
            "Blend the pineapple, coconut milk and lime juice until smooth.",
            "Divide between two glasses.",
            "Top with the sparkling water and serve.",
        ],
        "description": "Pineapple, coconut milk and lime blended smooth, topped with sparkling water.",
        "review": "Source facts reviewed; original steps. Source blends the pineapple, coconut milk and lime, divides between two glasses and tops with sparkling water, so the carbonated mixer is added after blending and never shaken; two servings preserved. prep_time_min 10 is the source's PT10M prepTime.",
    },
    "mm-vodka-mocktail": {
        "ingredients": ["3 ounces cloudy apple juice", "1 ounce freshly squeezed lemon juice", "1 ounce alcohol free vodka or 1 teaspoon apple cider vinegar", "1 teaspoon sugar or sweetener (optional)"],
        "method": "shake", "glassware": "Martini glass", "garnish": "Apple fan or apple slice", "ice_type": "Ice",
        "servings": 1, "recipe_yield": "1", "prep_time_min": 3,
        "steps": [
            "Add the apple juice, lemon juice and alcohol-free vodka to a shaker with ice.",
            "Shake hard until combined.",
            "Pour into the martini glass.",
            "Garnish with an apple fan.",
        ],
        "description": "Apple and lemon juice with alcohol-free vodka, shaken and strained.",
        "review": "Source facts reviewed; original steps. Source shakes everything with ice, pours into a martini glass and garnishes with an apple fan or slice; the primary ingredient is unambiguous (alcohol-free vodka, with an optional vinegar substitution). prep_time_min 3 is the source's PT3M prepTime.",
    },
}

# Manual editorial offensive-name screen (sexual/slur/profane terms and the
# contract's named examples). Word-boundary matched against recipe names.
OFFENSIVE_NAME_PATTERNS = tuple(
    re.compile(p, re.I)
    for p in (
        r"\bhookers?\b", r"\bscrotums?\b", r"\bwhores?\b", r"\bsluts?\b",
        r"\bf+\*?ck\w*\b", r"\bassholes?\b", r"\bbastards?\b", r"\bdicks?\b",
        r"\btits\b", r"\bboobs\b", r"\bnig+e?r?s?\b", r"\bfags?\b",
        r"\btrampy\b", r"\bon the rag\b",
    )
)

CARBONATION_MIXERS = re.compile(
    r"\bsodas?\b|\bcola\b|\bsparkling\b|\bginger (?:ale|beer)\b|\btonic\b|\bchampagnes?\b|\bproseccos?\b|\b7-?up\b|\bsprite\b",
    re.I,
)

# Same serving-count parser as the essentials enrichment (enrich_essentials.py).
SERVINGS_RE = re.compile(r"^\s*(?P<n>[1-9]\d*)\s*(?:servings?|cocktails?|drinks?|glasses?)\s*$", re.I)
BARE_SERVINGS_RE = re.compile(r"^\s*(?P<n>[1-9]\d*)\s*$")


def servings(yield_value: str) -> int | None:
    match = SERVINGS_RE.match(yield_value)
    if match:
        return int(match.group("n"))
    # Mindful Mocktail uses a bare numeric yield; accept only a positive integer.
    match = BARE_SERVINGS_RE.match(yield_value)
    return int(match.group("n")) if match else None


def load_sources() -> dict[str, dict]:
    sources: dict[str, dict] = {}
    for path in (REPO / "output" / "recipe-extract").glob("*-recipes.jsonl"):
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            record = json.loads(line)
            sources[record["source_url"].rstrip("/")] = record
    return sources


def sql_str(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def sql_text_array(values: list[str] | None) -> str:
    if values is None:
        return "null"
    if not values:
        return "'{}'::text[]"
    return "ARRAY[" + ",".join(sql_str(v) for v in values) + "]::text[]"


def sql_json_array(values: list[str]) -> str:
    """JSONB literal for the jsonb preparation column."""
    return "'" + json.dumps(values, ensure_ascii=False).replace("'", "''") + "'::jsonb"


def source_url_for(drink_id: str) -> str:
    prefix, host = ("dn", "drinknation.com/drink/") if drink_id.startswith("dn-") else ("mm", "mindfulmocktail.com/")
    return f"https://{host}{drink_id.removeprefix(prefix + '-')}/"


def run() -> None:
    sources = load_sources()
    names = []
    updates, evidence = [], []
    for drink_id, review in sorted(REVIEWS.items()):
        if drink_id.startswith("dn-"):
            source_name, alcohol_type = "drinknation", "cocktail"
        else:
            source_name, alcohol_type = "mindfulmocktail", "mocktail"
        source = sources.get(source_url_for(drink_id).rstrip("/"))
        if source is None:
            raise SystemExit(f"FAIL: no source record for {drink_id} ({source_url_for(drink_id)})")
        name = cc.clean_text(str(source["name"]))
        names.append(name)

        # 1. Name screen: offensive terms, unsafe and non-beverage patterns.
        if any(p.search(name) for p in OFFENSIVE_NAME_PATTERNS):
            raise SystemExit(f"FAIL: offensive name on {drink_id}: {name!r}")
        if cc.is_unsafe(source, name, review["ingredients"]):
            raise SystemExit(f"FAIL: unsafe content patterns on {drink_id}")
        if cc.is_non_beverage(source, name, review["ingredients"]):
            raise SystemExit(f"FAIL: non-beverage patterns on {drink_id}")

        # 2. Retained source ingredients verbatim (whitespace normalised).
        source_ingredients = [cc.clean_text(str(x)) for x in source["recipeIngredient"]]
        if source_ingredients != review["ingredients"]:
            raise SystemExit(
                f"FAIL: {drink_id} ingredients drift\n  live: {review['ingredients']}\n  source: {source_ingredients}"
            )
        if len(review["ingredients"]) not in (3, 4):
            raise SystemExit(f"FAIL: {drink_id} has {len(review['ingredients'])} ingredients (want 3-4)")

        # 3. Servings/yield preserved from source; prep time source-derived.
        servings_value = servings(cc.yield_text(source))
        if servings_value != review["servings"] or cc.yield_text(source) != review["recipe_yield"]:
            raise SystemExit(
                f"FAIL: {drink_id} yield/servings drift: source {cc.yield_text(source)!r}/{servings_value} "
                f"vs review {review['recipe_yield']!r}/{review['servings']}"
            )
        prep = cc.prep_time_minutes(source)
        if prep != review["prep_time_min"]:
            raise SystemExit(
                f"FAIL: {drink_id} prep_time_min drift: source {prep} vs review {review['prep_time_min']}"
            )

        # 4. Method: no carbonation-plus-shake; source-faithful classification.
        carbonated = CARBONATION_MIXERS.search(" ".join(review["ingredients"]))
        if carbonated and review["method"] == "shake":
            raise SystemExit(f"FAIL: {drink_id} would shake a carbonated mixer ({carbonated.group(0)})")

        # 5. Copyright: no 6-word overlap of description/steps with this
        #    record's own source description or instruction text.
        source_6grams = cc.ngrams(cc.clean_text(str(source.get("description") or ""))) | cc.ngrams(
            cc.instruction_text(source)
        )
        generated = cc.ngrams(review["description"])
        for step in review["steps"]:
            generated |= cc.ngrams(step)
        overlap = generated & source_6grams
        if overlap:
            raise SystemExit(f"FAIL: {drink_id} 6-gram overlap with source prose: {sorted(overlap)[:3]}")
        if review["description"] == cc.clean_text(str(source.get("description") or "")):
            raise SystemExit(f"FAIL: {drink_id} description equals source description")

        # 6. Guarded update payload (provenance columns, ingredients,
        #    servings/yield, prep time, allergens/caffeine, featured all
        #    preserved; description/steps/method/glass/garnish/ice replaced;
        #    publication flags set).
        updates.append(
            {
                "id": drink_id,
                "before_hash": BEFORE_HASHES[drink_id],
                "preparation": review["steps"],
                "description": review["description"],
                "preparation_method": review["method"],
                "glassware": review["glassware"],
                "garnish": review["garnish"],
                "ice_type": review["ice_type"],
                "status": "published",
                "editorial_ready": True,
                "recipe_quality_issues": [],
            }
        )
        evidence.append(
            {
                "id": drink_id,
                "name": name,
                "source_url": source_url_for(drink_id),
                "source_name": source_name,
                "alcohol_type": alcohol_type,
                "n_ingredients": len(review["ingredients"]),
                "source_ingredients": source["recipeIngredient"],
                "source_instructions": source.get("recipeInstructions"),
                "source_yield": cc.yield_text(source),
                "method": review["method"],
                "glassware": review["glassware"],
                "garnish": review["garnish"],
                "ice_type": review["ice_type"],
                "review": review["review"],
            }
        )

    # 7. Selection-level checks.
    assert len(REVIEWS) == 20 and len(set(REVIEWS)) == 20
    assert len(set(names)) == len(names), f"duplicate names: {sorted(names)}"
    methods = [r["method"] for r in REVIEWS.values()]
    assert "carbonation_plus_shake" not in methods
    by_type = {"cocktail": 0, "mocktail": 0}
    for drink_id in REVIEWS:
        by_type["cocktail" if drink_id.startswith("dn-") else "mocktail"] += 1
    assert by_type == {"cocktail": 16, "mocktail": 4}, by_type
    assert set(BEFORE_HASHES) == set(REVIEWS)

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "batch1-updates.jsonl").write_text(
        "".join(json.dumps(u, ensure_ascii=False) + "\n" for u in updates), encoding="utf-8"
    )
    (OUT / "batch1-evidence.jsonl").write_text(
        "".join(json.dumps(e, ensure_ascii=False) + "\n" for e in evidence), encoding="utf-8"
    )

    ids_sql = ",".join(sql_str(i) for i in sorted(REVIEWS))
    sql_lines = [
        "-- Batch-1 curation: publish the 20 source-reviewed recipes selected for the",
        "-- first background batch (16 cocktails + 4 mocktails). Reviewed 2026-09-29;",
        "-- preview/evidence: output/recipe-batch1/batch1-updates.jsonl,",
        "-- batch1-evidence.jsonl. Guards: every UPDATE matches its exact id AND its",
        "-- reviewed before-state row hash AND still has status='draft',",
        "-- editorial_ready=false; the unrelated-row aggregate hash is re-verified",
        "-- inside the transaction and aborts on drift. Only",
        "-- preparation/description/preparation_method/glassware/garnish/ice_type/",
        "-- status/editorial_ready/recipe_quality_issues change (updated_at is left",
        "-- to the trigger); ingredients, ingredient_details, provenance columns,",
        "-- servings/recipe_yield/prep_time_min, allergens/has_caffeine and featured",
        "-- are preserved. The temp table captures the full before-state rows so the",
        "-- final SELECT reports the exact per-row changed-column list.",
        "begin;",
        "create temp table batch1_before as",
        "  select d.id, to_jsonb(d) as before_row",
        "  from public.drinks d",
        f"  where id in ({ids_sql});",
        "do $$",
        "declare changed integer;",
        "begin",
        "  if (select count(*) from public.drinks d join (values",
    ]
    for drink_id in sorted(REVIEWS):
        sql_lines.append(f"    ({sql_str(drink_id)},{sql_str(BEFORE_HASHES[drink_id])}),")
    # trim trailing comma of the last values row
    sql_lines[-1] = sql_lines[-1].rstrip(",")
    sql_lines.extend(
        [
            "  ) expected(id, row_hash) on expected.id=d.id where md5(to_jsonb(d)::text)=expected.row_hash",
            "    and d.status='draft' and d.editorial_ready=false and d.featured=false",
            f"    and d.recipe_quality_issues=array['source_classification_not_verified','template_preparation_needs_editorial_review']::text[]) <> 20 then",
            "    raise exception 'Batch-1 rows changed since review; abort';",
            "  end if;",
            f"  if (select md5(string_agg(md5(to_jsonb(d)::text),'' order by id)) from public.drinks d",
            f"    where id not in ({ids_sql})) <> '{OTHER_AGG_HASH}' then",
            "    raise exception 'Unrelated catalogue rows changed; abort';",
            "  end if;",
        ]
    )
    for u in updates:
        sql_lines.extend(
            [
                "  update public.drinks set",
                f"    preparation = {sql_json_array(u['preparation'])},",
                f"    description = {sql_str(u['description'])},",
                f"    preparation_method = {sql_str(u['preparation_method'])},",
                f"    glassware = {sql_str(u['glassware']) if u['glassware'] else 'null'},",
                f"    garnish = {sql_str(u['garnish']) if u['garnish'] else 'null'},",
                f"    ice_type = {sql_str(u['ice_type']) if u['ice_type'] else 'null'},",
                "    status = 'published',",
                "    editorial_ready = true,",
                "    recipe_quality_issues = '{}'::text[]",
                f"  where id = {sql_str(u['id'])}",
                f"    and status = 'draft' and editorial_ready = false and featured = false",
                f"    and md5(to_jsonb(drinks)::text) = {sql_str(u['before_hash'])};",
                "",
            ]
        )
    sql_lines.extend(
        [
            "  if (select count(*) from public.drinks d where id in ("
            + ids_sql + ") and status='published' and editorial_ready=true"
            "    and recipe_quality_issues='{}'::text[]) <> 20 then",
            "    raise exception 'Unexpected published count'; end if;",
            "end $$;",
            "select b.id,",
            "  (select count(*) from jsonb_each(b.before_row)) as keys_before,",
            "  (select count(*) from jsonb_each(to_jsonb(d))) as keys_after,",
            "  (select array_agg(e.key order by e.key) from jsonb_each(b.before_row) e",
            "     join jsonb_each(to_jsonb(d)) u on u.key = e.key",
            "     where e.value is distinct from u.value) as changed_keys",
            "from batch1_before b join public.drinks d on d.id = b.id",
            "order by b.id;",
            "commit;",
            "",
            "-- Post-check (read-only, run separately):",
            f"-- SELECT count(*) FROM public.drinks WHERE id IN ({ids_sql}) AND status='published' AND editorial_ready=true;",
            "",
        ]
    )
    (OUT / "batch1-editorial.sql").write_text("\n".join(sql_lines), encoding="utf-8")

    print("PASS: 20 curated updates + evidence + guarded SQL written")
    for e in evidence:
        print(f"  {e['id']}: {e['n_ingredients']} ing, {e['method']}, {e['source_name']}")
    return None


if __name__ == "__main__":
    run()
