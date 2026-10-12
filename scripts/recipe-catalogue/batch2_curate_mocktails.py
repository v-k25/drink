#!/usr/bin/env python3
"""Batch-2 prepare-only curation: two source-reviewed mocktail drafts plus
one explicit exclusion.

PREPARE ONLY -- this script never touches the database. It writes preview,
evidence and guarded SQL DRAFTS whose per-row hashes and unrelated-row
aggregate hash are PLACEHOLDERS that must be replaced with fresh values
captured from the live DB immediately before any publication, so the drafts
are never a runnable unguarded publish (a placeholder can never match a real
md5, so running them unmodified aborts on the first guard).

Rows (Mindful Mocktail mocktails; part of the owner target of
100 mocktails + 100 cocktails; 26 recipes are already published and eligible
-- 20 cocktails + 6 mocktails = the six launch recipes plus the 20 batch-1
recipes):
  publish candidates: mm-grapefruit-martino-mocktail, mm-roy-rogers-drink
  excluded: mm-pineapple-crush-mocktail (blocking whole-lime review finding;
  no replacement selected)

Follows the batch-1 curation pattern (batch1_curate_recipes.py): each row
keeps its retained source ingredient strings verbatim, provenance columns,
servings/yield and source-derived prep time, and gains hand-authored original
AllCheers preparation steps and a description written from structured facts
only. Two rows pass this full per-row review; mm-pineapple-crush-mocktail is
EXCLUDED on the reviewer's blocking finding: the source lists '1 lime' and
instructs 'Blend all ingredients together in a high-speed blender', never
saying to peel, juice or seed the lime, so faithful instructions would blend
an intact lime -- unsafe/low-quality and ambiguous. The excluded row's DB
flags/status stay exactly intact (it is part of the unrelated-row aggregate
of 9,460 rows in the guarded SQL) and no replacement is selected.

Safety/copyright rules enforced here (fail closed):
- Source ingredients must match the retained strings verbatim (whitespace
  normalised) for every publish row, and must equal the live before-state rows
  captured read-only from the DB on 2026-10-01 (LIVE_BEFORE_STATE below).
- Generated description + preparation steps may not share any run of six
  consecutive words with that record's own source description or instruction
  text (catalogue_core ngram rule); the Roy Rogers wording is additionally
  checked against the sibling DrinkNation record's prose for the same drink.
- Method classification follows the source instructions; no
  carbonation-plus-shake combination may appear (the Roy Rogers cola is built
  and stirred in the serving glass, never shaken or strained).
- No step may require an unspecified garnish: the grapefruit source says only
  'garnish' without naming one and lists no garnish ingredient, so the closing
  step is the source-faithful pour-and-serve wording and garnish stays NULL.
- Name screen: no unsafe patterns and no offensive (sexual/slur/profane)
  recipe names.
- Allergens/caffeine stay explicit unknown (the source declares none for both
  rows; never allergen-free); glassware, garnish and ice only where the
  source specifies them.
- Quality flags clear only after this full per-row review; the guarded SQL
  pins each row's exact before-state flag list so clearing cannot fire on a
  row that has drifted since review.
- Exclusions: a blocked row is recorded with an explicit reason, keeps its
  flags/status intact, appears in no UPDATE/image SQL, and is covered by the
  unrelated-row aggregate hash.

Read-only sources (never refetched):
  - output/recipe-extract/mindfulmocktail-recipes.jsonl
  - output/recipe-extract/drinknation-recipes.jsonl (Roy Rogers strict extra
    check only)
  - live DB rows captured read-only via the Supabase tools on 2026-10-01
    (LIVE_BEFORE_STATE below; two identical reads; emitted as
    batch2-live-before-state.json for evidence)

Outputs (preview + evidence + guarded SQL drafts):
  - output/recipe-batch2/batch2-live-before-state.json
  - output/recipe-batch2/batch2-updates.jsonl
  - output/recipe-batch2/batch2-evidence.jsonl
  - output/recipe-batch2/batch2-images.json
  - output/recipe-batch2/batch2-editorial.sql
  - output/recipe-batch2/batch2-images.sql
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts" / "recipe-catalogue"))
import catalogue_core as cc  # noqa: E402

OUT = REPO / "output" / "recipe-batch2"

# PLACEHOLDER hashes -- never real values. The guarded SQL drafts abort until
# these are replaced with fresh values captured from the live DB immediately
# before publication: per-row md5(to_jsonb(d)::text) for the two publish rows
# and the unrelated-row aggregate md5 over every catalogue row except those
# two ids (9,460 rows, including the excluded mm-pineapple-crush-mocktail
# draft).
BEFORE_HASHES = {
    "mm-grapefruit-martino-mocktail": "__FRESH_ROW_HASH:mm-grapefruit-martino-mocktail__",
    "mm-roy-rogers-drink": "__FRESH_ROW_HASH:mm-roy-rogers-drink__",
}
OTHER_AGG_HASH = "__FRESH_UNRELATED_ROWS_AGGREGATE_HASH__"

# Exact before-state quality-flag lists as captured live on 2026-10-01
# (order preserved; two identical read-only reads). Note the live order for
# the four-flag rows differs from the sorted order in the original
# enrichment file -- the live order is the ground truth the guarded SQL pins.
# Used for the two publish rows' guards and to pin the excluded row's kept
# flags.
EXPECTED_BEFORE_FLAGS = {
    "mm-grapefruit-martino-mocktail": [
        "source_classification_not_verified",
        "template_preparation_needs_editorial_review",
    ],
    "mm-pineapple-crush-mocktail": [
        "ambiguous_ingredient_quantity_or_unit",
        "unknown_unit",
        "source_classification_not_verified",
        "template_preparation_needs_editorial_review",
    ],
    "mm-roy-rogers-drink": [
        "ambiguous_ingredient_quantity_or_unit",
        "unknown_unit",
        "source_classification_not_verified",
        "template_preparation_needs_editorial_review",
    ],
}

# Rows that failed review are listed here with an explicit exclusion and NO
# replacement (per the task contract). The excluded row's DB row is never
# touched: status stays 'draft' with its exact before-state flags intact, it
# appears in no UPDATE/image SQL, and it is part of the unrelated-row
# aggregate (9,460 rows) in the guarded SQL so nothing can change on it.
EXCLUSIONS: list[dict] = [
    {
        "id": "mm-pineapple-crush-mocktail",
        "type": "exclusion",
        "name": "Pineapple Crush Mocktail",
        "source_url": "https://mindfulmocktail.com/pineapple-crush-mocktail/",
        "reason": (
            "BLOCKING review finding: the source lists '1 lime' and instructs 'Blend all "
            "ingredients together in a high-speed blender' -- it never says to peel, juice or "
            "seed the lime, so faithful instructions would blend an intact lime (rind and all), "
            "which is unsafe/low-quality and ambiguous. The retained ingredients and "
            "instructions alone cannot produce safe, faithful publishable steps, so the row is "
            "excluded; per the contract NO replacement is selected and the DB row is not "
            "touched -- status stays 'draft' with its exact before-state flags intact "
            "(ambiguous_ingredient_quantity_or_unit, unknown_unit, "
            "source_classification_not_verified, template_preparation_needs_editorial_review)."
        ),
        "flags_kept": EXPECTED_BEFORE_FLAGS["mm-pineapple-crush-mocktail"],
        "status_kept": "draft",
        "editorial_ready_kept": False,
        "informational_row_hash": "0213f186a5e0172a66a2e218ada1a449",
        "replacement": None,
        "review_note": (
            "The earlier prepare-pass flags (unknown_unit on the bare counts '10 mint leaves' "
            "and '1 lime') were not the blocking issue; the blocking issue is the unspecified "
            "whole-lime preparation. No publish, no image backfill and no flag clearing for "
            "this row."
        ),
        "image_note": "No image backfill for this row (whole row excluded; the retained source photo decision is moot and nothing is fabricated).",
    },
]

# Live before-state rows captured read-only from the remote DB on 2026-10-01
# (md5(to_jsonb(d)::text) computed in the same read and re-verified identical
# in a second read; row hashes are INFORMATIONAL ONLY -- the guarded SQL uses
# placeholders and fresh hashes must be captured at publication time).
LIVE_BEFORE_STATE = {
    "status": "informational_before_state_snapshot",
    "captured_utc": "2026-10-01T08:07:45.324029+00:00",
    "capture_method": (
        "read-only Supabase SQL select over public.drinks (no writes); row hashes are "
        "md5(to_jsonb(d)::text) computed in the same read and re-verified identical in a "
        "second read the same session"
    ),
    "note": (
        "Row hashes below are INFORMATIONAL ONLY (drift detection since this prepare "
        "session). The guarded SQL drafts in this directory use placeholders: fresh per-row "
        "hashes and a fresh unrelated-row aggregate hash must be captured from the live DB "
        "immediately before any publication."
    ),
    "context": {
        "published_eligible_breakdown": {"cocktail": 20, "mocktail": 6},
        "note": (
            "26 recipes already published and eligible (20 cocktails + 6 mocktails = the six "
            "launch recipes plus the 20 batch-1 recipes); this batch prepares 2 mocktails "
            "(mm-grapefruit-martino-mocktail, mm-roy-rogers-drink) after the reviewer-blocked "
            "exclusion of mm-pineapple-crush-mocktail (no replacement), toward the owner target "
            "of 100 mocktails + 100 cocktails."
        ),
    },
    "excluded_ids": ["mm-pineapple-crush-mocktail"],
    "rows": [
        {
            "id": "mm-grapefruit-martino-mocktail",
            "name": "Grapefruit MartiNO Mocktail",
            "ingredients": [".5 cup grapefruit juice", ".25 cup rosemary syrup", "1 tablespoon aquafaba"],
            "preparation": [
                "Put every ingredient into a shaker with ice.",
                "Shake hard until the outside of the shaker turns cold.",
                "Strain into a fresh glass.",
            ],
            "description": "A mocktail put together from grapefruit juice and rosemary syrup, shaken hard with ice, then strained cold. Makes 1.",
            "preparation_method": "shake",
            "servings": "1",
            "recipe_yield": "1",
            "prep_time_min": 5,
            "status": "draft",
            "editorial_ready": False,
            "featured": False,
            "recipe_quality_issues": [
                "source_classification_not_verified",
                "template_preparation_needs_editorial_review",
            ],
            "allergens": None,
            "has_caffeine": None,
            "image_url": None,
            "image_alt": None,
            "source_name": "mindfulmocktail",
            "source_url": "https://mindfulmocktail.com/grapefruit-martino-mocktail/",
            "source_retrieved_at": "2026-09-20 20:17:56.044476+00",
            "content_origin": "allcheers_original_from_facts",
            "alcohol_type": "mocktail",
            "category": "Mocktail",
            "glassware": None,
            "garnish": None,
            "ice_type": None,
            "informational_row_hash": "f93adbf796ba50842c0fe25632ecdbd5",
        },
        {
            "id": "mm-pineapple-crush-mocktail",
            "name": "Pineapple Crush Mocktail",
            "ingredients": ["1 cup pineapple", "1 cup coconut water", "10 mint leaves", "1 lime"],
            "preparation": [
                "Put every ingredient into a blender.",
                "Blend until the mix is completely smooth.",
                "Pour into a fresh glass.",
            ],
            "description": "Pineapple Crush Mocktail \u2014 a mocktail with pineapple, coconut water, mint leaves and lime, blended smooth and poured cold. Makes 2.",
            "preparation_method": "blend",
            "servings": "2",
            "recipe_yield": "2",
            "prep_time_min": 5,
            "status": "draft",
            "editorial_ready": False,
            "featured": False,
            "recipe_quality_issues": [
                "ambiguous_ingredient_quantity_or_unit",
                "unknown_unit",
                "source_classification_not_verified",
                "template_preparation_needs_editorial_review",
            ],
            "allergens": None,
            "has_caffeine": None,
            "image_url": None,
            "image_alt": None,
            "source_name": "mindfulmocktail",
            "source_url": "https://mindfulmocktail.com/pineapple-crush-mocktail/",
            "source_retrieved_at": "2026-09-20 20:17:57.759776+00",
            "content_origin": "allcheers_original_from_facts",
            "alcohol_type": "mocktail",
            "category": "Mocktail",
            "glassware": None,
            "garnish": None,
            "ice_type": None,
            "informational_row_hash": "0213f186a5e0172a66a2e218ada1a449",
        },
        {
            "id": "mm-roy-rogers-drink",
            "name": "Easy Roy Rogers Drink",
            "ingredients": ["1 cup cola", "1 tablespoon grenadine", "1-2 Maraschino cherries, to garnish"],
            "preparation": [
                "Put every ingredient into a mixing glass over ice.",
                "Stir until the mixing glass turns cold.",
                "Strain into a fresh glass.",
            ],
            "description": "Easy Roy Rogers Drink \u2014 a mocktail with cola and grenadine, stirred down with ice and strained cold. Makes 1.",
            "preparation_method": "stir",
            "servings": "1",
            "recipe_yield": "1",
            "prep_time_min": 2,
            "status": "draft",
            "editorial_ready": False,
            "featured": False,
            "recipe_quality_issues": [
                "ambiguous_ingredient_quantity_or_unit",
                "unknown_unit",
                "source_classification_not_verified",
                "template_preparation_needs_editorial_review",
            ],
            "allergens": None,
            "has_caffeine": None,
            "image_url": None,
            "image_alt": None,
            "source_name": "mindfulmocktail",
            "source_url": "https://mindfulmocktail.com/roy-rogers-drink/",
            "source_retrieved_at": "2026-09-20 20:18:29.491361+00",
            "content_origin": "allcheers_original_from_facts",
            "alcohol_type": "mocktail",
            "category": "Mocktail",
            "glassware": None,
            "garnish": None,
            "ice_type": None,
            "informational_row_hash": "64110f7462dabd744e13ee89f7ef54fa",
        },
    ],
}

# Manual editorial content per recipe. ingredients are the retained source
# strings exactly as stored live; servings/recipe_yield/prep_time_min are the
# source-derived before-state values that must be preserved unchanged.
REVIEWS: dict[str, dict] = {
    "mm-grapefruit-martino-mocktail": {
        "ingredients": [".5 cup grapefruit juice", ".25 cup rosemary syrup", "1 tablespoon aquafaba"],
        "method": "shake",
        "glassware": None,
        "garnish": None,
        "ice_type": "Ice",
        "servings": 1,
        "recipe_yield": "1",
        "prep_time_min": 5,
        "steps": [
            "Add the grapefruit juice, rosemary syrup and aquafaba to a shaker filled with ice.",
            "Shake hard until cold.",
            "Pour into a glass and serve.",
        ],
        "description": "Grapefruit juice and rosemary syrup with aquafaba, shaken and poured cold.",
        "image_from_source": True,
        "review": (
            "Source facts reviewed; original steps. Source adds the juices and aquafaba to an "
            "ice-filled cocktail shaker, shakes well and pours into a glass, so the method is "
            "shake and ice_type records the ice-filled shaker; the glass is not named, so "
            "glassware stays NULL. The source's final step says only 'garnish' without naming a "
            "garnish and the ingredient list has none, so garnish stays NULL and the steps "
            "never require an unspecified garnish (review finding): the closing step is the "
            "source-faithful pour-and-serve wording, which differs from the source's final "
            "word so no six-word window is reused. The source instruction calls aquafaba "
            "'chickpea juice' (same ingredient, different alias) and its shaker-alternative "
            "sentence is page navigation ('above'), not recipe content. prep_time_min 5 is the "
            "source's PT5M prepTime. Allergens: the source declares none; aquafaba is "
            "chickpea-derived (a legume), not egg, so allergens stay unknown rather than an "
            "egg claim. Image: the retained full-size first source photo."
        ),
        "ambiguities": [
            "Source instruction aliases aquafaba as 'chickpea juice'; the retained ingredient string '1 tablespoon aquafaba' is kept verbatim.",
            "Source says to garnish without naming one and no garnish ingredient exists; garnish stays NULL and the steps avoid requiring an unspecified garnish (source-faithful pour-and-serve closing step, no six-word reuse).",
            "Glassware is a plain 'glass' in the source; glassware stays NULL.",
            "Aquafaba is chickpea brine used as an egg-white alternative; the source declares no allergens, so allergens stay NULL (no egg claim).",
            "The source's shaker-alternative sentence ('...suggestions above') is page navigation and is not carried into the steps.",
        ],
    },
    "mm-roy-rogers-drink": {
        "ingredients": ["1 cup cola", "1 tablespoon grenadine", "1-2 Maraschino cherries, to garnish"],
        "method": "build",
        "glassware": "Tall glass",
        "garnish": "Maraschino cherry",
        "ice_type": "Ice",
        "servings": 1,
        "recipe_yield": "1",
        "prep_time_min": 2,
        "steps": [
            "Pack a tall glass with ice.",
            "Add the grenadine, then top with the cola.",
            "Stir the drink well.",
            "Garnish with one or two maraschino cherries.",
        ],
        "description": "Cola and grenadine over ice in a tall glass, garnished with maraschino cherries.",
        "image_from_source": True,
        "review": (
            "Source facts reviewed; original steps. Source fills a tall glass with ice, adds the "
            "grenadine, tops with cola, stirs well and garnishes with a maraschino cherry, so "
            "the draft's stir-and-strain template was corrected to build in the serving glass -- "
            "the carbonated cola is never shaken and never strained. The flagged '1-2 "
            "Maraschino cherries, to garnish' is the source's own garnish range -- verbatim and "
            "unambiguous, so the parser's unknown_unit/ambiguous flags clear after this full "
            "review; the line stays verbatim. Glassware 'Tall glass' and ice 'Ice' follow the "
            "source's first step; the garnish follows the source's final step and ingredient "
            "line. prep_time_min 2 is the source's PT2M prepTime. Allergens: the source "
            "declares none, so allergens stay unknown. Generated wording was additionally "
            "checked against the sibling DrinkNation Roy Rogers prose (dn-roy-rogers) -- no "
            "six-word overlap. Image: the retained full-size first source photo."
        ),
        "ambiguities": [
            "'1-2 Maraschino cherries, to garnish' is a range count the parser flagged (unknown_unit, then ambiguous_ingredient_quantity_or_unit); the source's own wording is unambiguous (one or two cherries), so both flags clear after full review and the line stays verbatim.",
            "Draft preparation_method was the generated 'stir' template (mixing glass + strain); the source builds in the serving glass and the carbonated cola must never be strained, so the reviewed method is 'build'.",
            "The stored name is 'Easy Roy Rogers Drink' while the id slug is mm-roy-rogers-drink; the stored name is preserved unchanged.",
            "A sibling DrinkNation record (dn-roy-rogers) describes the same drink; generated wording was also checked against its prose as a strict extra check.",
        ],
    },
}

# Manual editorial offensive-name screen (sexual/slur/profane terms). Same
# patterns as batch-1. Word-boundary matched against recipe names.
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

# Same serving-count parser as batch-1 and the essentials enrichment.
SERVINGS_RE = re.compile(r"^\s*(?P<n>[1-9]\d*)\s*(?:servings?|cocktails?|drinks?|glasses?)\s*$", re.I)
BARE_SERVINGS_RE = re.compile(r"^\s*(?P<n>[1-9]\d*)\s*$")

# Resized WordPress variants are never the full-size first entry.
RESIZED_VARIANT_RE = re.compile(r"-\d+x\d+\.(?:jpg|jpeg|png|webp)$", re.I)

PLACEHOLDER_RE = re.compile(r"__FRESH_[A-Z_]+(?::[a-z0-9-]+)?__")
REAL_MD5_RE = re.compile(r"'[0-9a-f]{32}'")


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
    live_rows = {row["id"]: row for row in LIVE_BEFORE_STATE["rows"]}

    names, updates, evidence, image_rows = [], [], [], []
    for drink_id, review in sorted(REVIEWS.items()):
        source_name, alcohol_type = "mindfulmocktail", "mocktail"
        source = sources.get(source_url_for(drink_id).rstrip("/"))
        if source is None:
            raise SystemExit(f"FAIL: no source record for {drink_id} ({source_url_for(drink_id)})")
        live = live_rows.get(drink_id)
        if live is None:
            raise SystemExit(f"FAIL: {drink_id} missing from the live before-state snapshot")
        name = cc.clean_text(str(source["name"]))
        names.append(name)

        # 1. Name screen: offensive terms, unsafe and non-beverage patterns.
        if any(p.search(name) for p in OFFENSIVE_NAME_PATTERNS):
            raise SystemExit(f"FAIL: offensive name on {drink_id}: {name!r}")
        if cc.is_unsafe(source, name, review["ingredients"]):
            raise SystemExit(f"FAIL: unsafe content patterns on {drink_id}")
        if cc.is_non_beverage(source, name, review["ingredients"]):
            raise SystemExit(f"FAIL: non-beverage patterns on {drink_id}")

        # 2. Retained source ingredients verbatim: source == review == live.
        source_ingredients = [cc.clean_text(str(x)) for x in source["recipeIngredient"]]
        if source_ingredients != review["ingredients"]:
            raise SystemExit(
                f"FAIL: {drink_id} ingredients drift\n  review: {review['ingredients']}\n  source: {source_ingredients}"
            )
        live_ingredients = [cc.clean_text(str(x)) for x in live["ingredients"]]
        if live_ingredients != review["ingredients"]:
            raise SystemExit(
                f"FAIL: {drink_id} ingredients drift vs live snapshot\n  review: {review['ingredients']}\n  live: {live_ingredients}"
            )
        if len(review["ingredients"]) not in (3, 4):
            raise SystemExit(f"FAIL: {drink_id} has {len(review['ingredients'])} ingredients (want 3-4)")

        # 3. Pinned before-state: name, draft status, flags, image, allergens,
        #    provenance.
        if live["name"] != name:
            raise SystemExit(f"FAIL: {drink_id} live name drift: {live['name']!r} vs {name!r}")
        if live["status"] != "draft" or live["editorial_ready"] or live["featured"]:
            raise SystemExit(f"FAIL: {drink_id} live before-state is not an unreviewed draft")
        if list(live["recipe_quality_issues"]) != EXPECTED_BEFORE_FLAGS[drink_id]:
            raise SystemExit(f"FAIL: {drink_id} live flags drifted: {live['recipe_quality_issues']}")
        if live["image_url"] is not None or live["allergens"] is not None:
            raise SystemExit(f"FAIL: {drink_id} live image/allergen state drifted")
        if live["source_url"].rstrip("/") != source_url_for(drink_id).rstrip("/"):
            raise SystemExit(f"FAIL: {drink_id} live source_url drift")

        # 4. Servings/yield preserved from source; prep time source-derived.
        servings_value = servings(cc.yield_text(source))
        if servings_value != review["servings"] or cc.yield_text(source) != review["recipe_yield"]:
            raise SystemExit(
                f"FAIL: {drink_id} yield/servings drift: source {cc.yield_text(source)!r}/{servings_value} "
                f"vs review {review['recipe_yield']!r}/{review['servings']}"
            )
        prep = cc.prep_time_minutes(source)
        if prep != review["prep_time_min"]:
            raise SystemExit(f"FAIL: {drink_id} prep_time_min drift: source {prep} vs review {review['prep_time_min']}")
        if (
            int(live["servings"]) != review["servings"]
            or live["recipe_yield"] != review["recipe_yield"]
            or int(live["prep_time_min"]) != review["prep_time_min"]
        ):
            raise SystemExit(f"FAIL: {drink_id} live servings/yield/prep drift vs review")

        # 5. Method: no carbonation-plus-shake; source-faithful classification.
        carbonated = CARBONATION_MIXERS.search(" ".join(review["ingredients"]))
        if carbonated and review["method"] == "shake":
            raise SystemExit(f"FAIL: {drink_id} would shake a carbonated mixer ({carbonated.group(0)})")
        if review["method"] not in cc.METHODS:
            raise SystemExit(f"FAIL: {drink_id} method {review['method']!r} outside the vocabulary")

        # 6. Copyright: no 6-word overlap of description/steps with this
        #    record's own source description or instruction text; the Roy
        #    Rogers wording is additionally checked against the sibling
        #    DrinkNation record's prose for the same drink.
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
        if drink_id == "mm-roy-rogers-drink":
            sibling = sources.get("https://drinknation.com/drink/roy-rogers")
            if sibling is None:
                raise SystemExit("FAIL: missing sibling dn-roy-rogers source record for the strict extra check")
            sibling_6grams = cc.ngrams(cc.clean_text(str(sibling.get("description") or ""))) | cc.ngrams(
                cc.instruction_text(sibling)
            )
            sibling_overlap = generated & sibling_6grams
            if sibling_overlap:
                raise SystemExit(
                    f"FAIL: {drink_id} 6-gram overlap with sibling DrinkNation prose: {sorted(sibling_overlap)[:3]}"
                )

        # 7. Image: the retained full-size first source photo (never
        #    refetched), else null so the SVG fallback renders.
        image_entry = None
        if review["image_from_source"]:
            raw_images = source.get("image") or []
            if not raw_images:
                raise SystemExit(f"FAIL: {drink_id} has no source image but the review expects one")
            image_entry = cc.clean_text(str(raw_images[0]))
            if not image_entry.startswith("https://"):
                raise SystemExit(f"FAIL: {drink_id} image URL is not https")
            if len(image_entry) > 2048:
                raise SystemExit(f"FAIL: {drink_id} image URL exceeds 2048 characters")
            if RESIZED_VARIANT_RE.search(image_entry):
                raise SystemExit(f"FAIL: {drink_id} image is a resized variant, not the full-size first entry")
        image_rows.append(
            {
                "id": drink_id,
                "image_url": image_entry,
                "image_alt": live["name"],
                "source": "jsonl_image[0] (full-size)" if image_entry else None,
                "source_detail": "mindfulmocktail-recipes.jsonl first image entry (retained extraction, never refetched)"
                if image_entry
                else None,
                "source_page": source_url_for(drink_id),
                "verified_by": "retained extraction evidence",
                "url_length": len(image_entry) if image_entry else 0,
                "suitable": bool(image_entry),
            }
        )

        # 8. Guarded update payload (provenance columns, ingredients,
        #    servings/yield, prep time, allergens/caffeine and featured all
        #    preserved; description/steps/method/glass/garnish/ice replaced;
        #    publication flags set; the before_hash stays a placeholder to be
        #    captured fresh immediately before publication).
        updates.append(
            {
                "id": drink_id,
                "before_hash": None,
                "before_hash_note": "placeholder -- capture fresh md5(to_jsonb(d)::text) from the live row immediately before applying batch2-editorial.sql",
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
                "source_description": source.get("description"),
                "source_yield": cc.yield_text(source),
                "source_prep_time_min": prep,
                "method": review["method"],
                "glassware": review["glassware"],
                "garnish": review["garnish"],
                "ice_type": review["ice_type"],
                "image_url": image_entry,
                "image_source": "mindfulmocktail-recipes.jsonl image[0] (full-size, retained extraction, never refetched)"
                if image_entry
                else None,
                "image_alt": live["name"] if image_entry else None,
                "allergens": None,
                "allergens_note": "source declares no allergens; unknown stays unknown (never allergen-free)",
                "has_caffeine": None,
                "has_caffeine_note": "source mentions no caffeine; stays unknown",
                "flags_before": EXPECTED_BEFORE_FLAGS[drink_id],
                "flags_after": [],
                "review": review["review"],
                "ambiguities": review["ambiguities"],
                "live_before_state": "output/recipe-batch2/batch2-live-before-state.json",
                "informational_row_hash": live["informational_row_hash"],
            }
        )

    # 9. Selection-level checks.
    assert len(REVIEWS) == 2 and len(set(REVIEWS)) == 2
    assert len(EXCLUSIONS) == 1, "exactly one reviewer-blocked exclusion in this batch"
    for exclusion in EXCLUSIONS:
        assert exclusion.get("reason"), f"exclusion {exclusion['id']} lacks an explicit reason"
        assert exclusion.get("replacement") is None, "no replacement may be selected for an excluded row"
        assert exclusion["id"] not in REVIEWS and exclusion["id"] not in BEFORE_HASHES
        live = live_rows.get(exclusion["id"])
        if live is None:
            raise SystemExit(f"FAIL: excluded row {exclusion['id']} missing from the live before-state snapshot")
        # Pin the excluded row's kept state: draft status and exact flags
        # intact, nothing publishable, no image backfill.
        if live["status"] != exclusion["status_kept"] or live["editorial_ready"] != exclusion["editorial_ready_kept"]:
            raise SystemExit(f"FAIL: excluded row {exclusion['id']} status drifted: {live['status']}")
        if list(live["recipe_quality_issues"]) != EXPECTED_BEFORE_FLAGS[exclusion["id"]]:
            raise SystemExit(f"FAIL: excluded row {exclusion['id']} flags drifted: {live['recipe_quality_issues']}")
        if exclusion["id"] in {u["id"] for u in updates} or exclusion["id"] in {r["id"] for r in image_rows}:
            raise SystemExit(f"FAIL: excluded row {exclusion['id']} leaked into an update/image SQL row")
        # Exclusion record in the evidence file (no update payload, no image
        # SQL row; flags/status kept intact).
        source = sources.get(source_url_for(exclusion["id"]).rstrip("/"))
        if source is None:
            raise SystemExit(f"FAIL: no source record for excluded row {exclusion['id']}")
        evidence.append(
            {
                "id": exclusion["id"],
                "type": "exclusion",
                "disposition": "excluded",
                "name": cc.clean_text(str(source["name"])),
                "source_url": source_url_for(exclusion["id"]),
                "source_name": "mindfulmocktail",
                "alcohol_type": "mocktail",
                "source_ingredients": source["recipeIngredient"],
                "source_instructions": source.get("recipeInstructions"),
                "source_description": source.get("description"),
                "source_yield": cc.yield_text(source),
                "source_prep_time_min": cc.prep_time_minutes(source),
                "flags_before": EXPECTED_BEFORE_FLAGS[exclusion["id"]],
                "flags_after": EXPECTED_BEFORE_FLAGS[exclusion["id"]],
                "status_kept": exclusion["status_kept"],
                "editorial_ready_kept": exclusion["editorial_ready_kept"],
                "exclusion_reason": exclusion["reason"],
                "review_note": exclusion["review_note"],
                "replacement": None,
                "live_before_state": "output/recipe-batch2/batch2-live-before-state.json",
                "informational_row_hash": live["informational_row_hash"],
            }
        )
    assert len(set(names)) == len(names), f"duplicate names: {sorted(names)}"
    methods = [r["method"] for r in REVIEWS.values()]
    assert "carbonation_plus_shake" not in methods
    assert all(drink_id.startswith("mm-") for drink_id in REVIEWS)
    assert set(BEFORE_HASHES) == set(REVIEWS)
    assert set(EXPECTED_BEFORE_FLAGS) == set(REVIEWS) | {e["id"] for e in EXCLUSIONS}

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "batch2-live-before-state.json").write_text(
        json.dumps(LIVE_BEFORE_STATE, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (OUT / "batch2-updates.jsonl").write_text(
        "".join(json.dumps(u, ensure_ascii=False) + "\n" for u in updates), encoding="utf-8"
    )
    (OUT / "batch2-evidence.jsonl").write_text(
        "".join(json.dumps(e, ensure_ascii=False) + "\n" for e in evidence), encoding="utf-8"
    )
    images_payload = {
        "status": "preview",
        "captured_utc": LIVE_BEFORE_STATE["captured_utc"],
        "fetch_count": 0,
        "convention": (
            "image_url from the retained mindfulmocktail-recipes.jsonl first (full-size) image "
            "entry, never refetched; image_alt equals the row's stored name in public.drinks; if "
            "no suitable source image existed the payload would leave image_url null and the "
            "hand-authored SVG fallback renders; the image backfill draft runs only AFTER the "
            "editorial draft is applied and verified"
        ),
        "rows": image_rows,
        "excluded": EXCLUSIONS,
    }
    (OUT / "batch2-images.json").write_text(
        json.dumps(images_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    ids_sql = ",".join(sql_str(i) for i in sorted(REVIEWS))
    sql_lines = [
        "-- Batch-2 curation DRAFT (PREPARE ONLY): publish the two source-reviewed",
        "-- mocktail drafts mm-grapefruit-martino-mocktail and mm-roy-rogers-drink.",
        "-- mm-pineapple-crush-mocktail is EXCLUDED (blocking whole-lime review",
        "-- finding; its flags/status stay intact and it appears in no UPDATE here).",
        "-- Reviewed 2026-10-01; preview/evidence:",
        "-- output/recipe-batch2/batch2-updates.jsonl, batch2-evidence.jsonl,",
        "-- batch2-live-before-state.json, batch2-images.json.",
        "--",
        "-- NOT RUNNABLE AS WRITTEN: every __FRESH_...__ token below is a PLACEHOLDER.",
        "-- Immediately before applying this draft, capture fresh values from the live",
        "-- DB and replace each placeholder with a real md5 hex string:",
        "--   __FRESH_ROW_HASH:<id>__ = md5(to_jsonb(d)::text) of that exact row;",
        "--   __FRESH_UNRELATED_ROWS_AGGREGATE_HASH__ =",
        "--     md5(string_agg(md5(to_jsonb(d)::text),'' order by id)) over every",
        "--     catalogue row except the two publish ids (9,460 unrelated rows,",
        "--     including the excluded mm-pineapple-crush-mocktail draft).",
        "-- A placeholder can never match a real md5, so running this file unmodified",
        "-- aborts on the first guard (fail closed; never an unguarded publish).",
        "--",
        "-- Guards: every UPDATE matches its exact id AND its reviewed before-state row",
        "-- hash AND still has status='draft', editorial_ready=false, featured=false AND",
        "-- the exact reviewed flag list; the unrelated-row aggregate hash is",
        "-- re-verified inside the transaction and aborts on drift (it covers the",
        "-- excluded mm-pineapple-crush-mocktail row too, proving its flags/status and",
        "-- every other column stay unchanged). Only",
        "-- preparation/description/preparation_method/glassware/garnish/ice_type/",
        "-- status/editorial_ready/recipe_quality_issues change (updated_at is left to",
        "-- the trigger); ingredients, ingredient_details, provenance columns,",
        "-- servings/recipe_yield/prep_time_min, allergens/has_caffeine and featured",
        "-- are preserved. The temp table captures the full before-state rows so the",
        "-- final SELECT reports the exact per-row changed-column list.",
        "begin;",
        "create temp table batch2_before as",
        "  select d.id, to_jsonb(d) as before_row",
        "  from public.drinks d",
        f"  where id in ({ids_sql});",
        "do $$",
        "declare changed integer;",
        "begin",
        "  if (select count(*) from public.drinks d join (values",
    ]
    for drink_id in sorted(REVIEWS):
        sql_lines.append(
            f"    ({sql_str(drink_id)},{sql_str(BEFORE_HASHES[drink_id])},"
            f"{sql_text_array(EXPECTED_BEFORE_FLAGS[drink_id])}),"
        )
    # trim trailing comma of the last values row
    sql_lines[-1] = sql_lines[-1].rstrip(",")
    sql_lines.extend(
        [
            "  ) expected(id, row_hash, before_flags) on expected.id=d.id where md5(to_jsonb(d)::text)=expected.row_hash",
            "    and d.status='draft' and d.editorial_ready=false and d.featured=false",
            "    and d.recipe_quality_issues=expected.before_flags) <> 2 then",
            "    raise exception 'Batch-2 rows changed since review; abort';",
            "  end if;",
            "  if (select md5(string_agg(md5(to_jsonb(d)::text),'' order by id)) from public.drinks d",
            f"    where id not in ({ids_sql})) <> '{OTHER_AGG_HASH}' then",
            "    raise exception 'Unrelated catalogue rows changed; abort';",
            "  end if;",
        ]
    )
    for u in updates:
        flags = EXPECTED_BEFORE_FLAGS[u["id"]]
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
                "    and status = 'draft' and editorial_ready = false and featured = false",
                f"    and recipe_quality_issues = {sql_text_array(flags)}",
                f"    and md5(to_jsonb(drinks)::text) = {sql_str(BEFORE_HASHES[u['id']])};",
                "",
            ]
        )
    sql_lines.extend(
        [
            "  if (select count(*) from public.drinks d where id in ("
            + ids_sql + ") and status='published' and editorial_ready=true"
            "    and recipe_quality_issues='{}'::text[]) <> 2 then",
            "    raise exception 'Unexpected published count'; end if;",
            "end $$;",
            "select b.id,",
            "  (select count(*) from jsonb_each(b.before_row)) as keys_before,",
            "  (select count(*) from jsonb_each(to_jsonb(d))) as keys_after,",
            "  (select array_agg(e.key order by e.key) from jsonb_each(b.before_row) e",
            "     join jsonb_each(to_jsonb(d)) u on u.key = e.key",
            "     where e.value is distinct from u.value) as changed_keys",
            "from batch2_before b join public.drinks d on d.id = b.id",
            "order by b.id;",
            "commit;",
            "",
            "-- Post-check (read-only, run separately):",
            f"-- SELECT count(*) FROM public.drinks WHERE id IN ({ids_sql}) AND status='published' AND editorial_ready=true;",
            "",
        ]
    )
    sql_text = "\n".join(sql_lines)
    real_md5 = REAL_MD5_RE.findall(sql_text)
    if real_md5:
        raise SystemExit("FAIL: batch2-editorial.sql contains real md5 hashes; it must stay a placeholder draft")
    # Each row-hash placeholder appears twice (values list + UPDATE guard) and
    # the aggregate once, plus comment mentions -- so assert the DISTINCT set:
    # exactly 3 per-row hashes + 1 unrelated-row aggregate.
    placeholders = set(PLACEHOLDER_RE.findall(sql_text))
    expected_placeholders = set(BEFORE_HASHES.values()) | {OTHER_AGG_HASH}
    if placeholders != expected_placeholders:
        raise SystemExit(f"FAIL: batch2-editorial.sql placeholder tokens {sorted(placeholders)} != expected {sorted(expected_placeholders)}")
    (OUT / "batch2-editorial.sql").write_text(sql_text, encoding="utf-8")

    image_sql_lines = [
        "-- Batch-2 image backfill DRAFT (PREPARE ONLY): backfill image_url/image_alt",
        "-- for the two published batch-2 mocktails from their retained source photos.",
        "-- mm-pineapple-crush-mocktail is EXCLUDED and appears in no UPDATE here.",
        "-- Preview/evidence: output/recipe-batch2/batch2-images.json. Apply ONLY",
        "-- AFTER batch2-editorial.sql has been applied and verified.",
        "--",
        "-- NOT RUNNABLE AS WRITTEN: the __FRESH_...__ tokens are PLACEHOLDERS.",
        "-- Immediately before applying this draft, capture fresh values from the",
        "-- live DB and replace each placeholder with a real md5 hex string:",
        "--   __FRESH_ROW_HASH:<id>__ = md5(to_jsonb(d)::text) of that exact row in",
        "--     its post-publish state;",
        "--   __FRESH_UNRELATED_ROWS_AGGREGATE_HASH__ =",
        "--     md5(string_agg(md5(to_jsonb(d)::text),'' order by id)) over every",
        "--     catalogue row except the two publish ids (9,460 unrelated rows,",
        "--     including the excluded mm-pineapple-crush-mocktail draft).",
        "--",
        "-- Guards: each UPDATE only touches its exact id while status='published'",
        "-- AND editorial_ready=true AND image_url IS NULL AND the row hash matches;",
        "-- the unrelated-row aggregate hash is re-verified inside the transaction",
        "-- (it covers the excluded mm-pineapple-crush-mocktail row too).",
        "-- image_alt is set from the row's own name column; updated_at left to the",
        "-- trigger. No binaries re-hosted; no photography claims.",
        "begin;",
        "do $$",
        "declare changed integer;",
        "begin",
        "  if (select count(*) from public.drinks d join (values",
    ]
    for drink_id in sorted(REVIEWS):
        image_sql_lines.append(f"    ({sql_str(drink_id)},{sql_str(BEFORE_HASHES[drink_id])}),")
    image_sql_lines[-1] = image_sql_lines[-1].rstrip(",")
    image_sql_lines.extend(
        [
            "  ) expected(id, row_hash) on expected.id=d.id where md5(to_jsonb(d)::text)=expected.row_hash",
            "    and d.status='published' and d.editorial_ready=true and d.image_url is null) <> 2 then",
            "    raise exception 'Batch-2 image rows are not in the expected post-publish state; abort';",
            "  end if;",
            "  if (select md5(string_agg(md5(to_jsonb(d)::text),'' order by id)) from public.drinks d",
            f"    where id not in ({ids_sql})) <> '{OTHER_AGG_HASH}' then",
            "    raise exception 'Unrelated catalogue rows changed; abort';",
            "  end if;",
        ]
    )
    for row in image_rows:
        if row["image_url"] is None:
            raise SystemExit(f"FAIL: {row['id']} has no image; extend the draft before applying")
        image_sql_lines.extend(
            [
                "  update public.drinks set",
                f"    image_url = {sql_str(row['image_url'])},",
                f"    image_alt = {sql_str(row['image_alt'])}",
                f"  where id = {sql_str(row['id'])}",
                "    and status = 'published' and editorial_ready = true and image_url is null",
                f"    and md5(to_jsonb(drinks)::text) = {sql_str(BEFORE_HASHES[row['id']])};",
                "",
            ]
        )
    image_sql_lines.extend(
        [
            "  if (select count(*) from public.drinks d where id in ("
            + ids_sql + ") and status='published' and editorial_ready=true"
            "    and image_url is not null) <> 2 then",
            "    raise exception 'Unexpected image backfill count'; end if;",
            "end $$;",
            "commit;",
            "",
        ]
    )
    image_sql_text = "\n".join(image_sql_lines)
    real_md5_img = REAL_MD5_RE.findall(image_sql_text)
    if real_md5_img:
        raise SystemExit("FAIL: batch2-images.sql contains real md5 hashes; it must stay a placeholder draft")
    placeholders_img = set(PLACEHOLDER_RE.findall(image_sql_text))
    if placeholders_img != expected_placeholders:
        raise SystemExit(f"FAIL: batch2-images.sql placeholder tokens {sorted(placeholders_img)} != expected {sorted(expected_placeholders)}")
    (OUT / "batch2-images.sql").write_text(image_sql_text, encoding="utf-8")

    print("PASS: 2 batch-2 curated updates + 1 explicit exclusion + evidence + guarded SQL drafts written (PREPARE ONLY, no DB writes)")
    for e in evidence:
        if e.get("type") == "exclusion":
            print(f"  {e['id']}: EXCLUDED -- flags/status kept intact, no replacement")
            continue
        flags = ",".join(e["flags_before"])
        print(
            f"  {e['id']}: {e['n_ingredients']} ing, {e['method']}, "
            f"image={'yes' if e['image_url'] else 'null'}, flags_before=[{flags}]"
        )
    return None


if __name__ == "__main__":
    run()
