#!/usr/bin/env python3
"""Prepare-only retained-source review and guarded SQL for DrinkNation Batch 8."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts" / "recipe-catalogue"))
import catalogue_core as cc  # noqa: E402

OUT = REPO / "output" / "recipe-batch8"
SOURCE = REPO / "output" / "recipe-extract" / "drinknation-recipes.jsonl"
SNAPSHOT = OUT / "batch8-publication-before.json"
EXPECTED_KEYS = 53

REVIEWS = {
    "dn-derby-daiquiri": {
        "url": "https://drinknation.com/drink/derby-daiquiri",
        "ingredients": ["1.5 oz. Light Rum", "1 tbsp. Lime Juice", "1 oz. Orange Juice", "1 tsp. Sugar"],
        "instructions": ["Blend ingredients with 1/2 cup shaved ice in a blender at low speed. Serve in a champagne flute."],
        "flags": ["source_classification_not_verified", "template_preparation_needs_editorial_review"],
        "description": "A frozen blend of light rum, lime, orange and sugar, served in a champagne flute.",
        "steps": ["Measure the light rum, lime juice, orange juice and sugar into a blender.", "Add the instruction-specified 1/2 cup of shaved ice.", "Process at low speed until icy and combined.", "Pour into a champagne flute and serve."],
        "method": "blend", "ice": "1/2 cup shaved ice", "garnish": None,
        "review": "The retained instructions require 1/2 cup shaved ice although it is not an ingredient-list entry; it is retained as instruction-specified ice, not a substituted ingredient. The drink is blended at low speed and served in a champagne flute.",
    },
    "dn-frozen-mint-daiquiri": {
        "url": "https://drinknation.com/drink/frozen-mint-daiquiri",
        "ingredients": ["2 oz. Light Rum", "1 tbsp. Lime Juice", "2 sprigs or leaves Mint", "1 Cup Ice", "1 tsp. Sugar"],
        "instructions": ["Add ingredients to a blender.", "Blend until smooth.", "Pour into glass."],
        "flags": ["source_classification_not_verified", "template_preparation_needs_editorial_review"],
        "description": "Rum, lime, mint, ice and sugar make a cooling blended single-serving drink.",
        "steps": ["Place the light rum, lime juice, mint, ice and sugar in a blender.", "Blend to a smooth, frosty texture.", "Pour into a glass and serve."],
        "method": "blend", "ice": "1 Cup Ice", "garnish": None,
        "review": "The retained source blends every listed ingredient. Its recorded mint choice, “2 sprigs or leaves,” remains a source-supported option; no garnish is specified.",
    },
    "dn-rum-screwdriver": {
        "url": "https://drinknation.com/drink/rum-screwdriver",
        "ingredients": ["1.5 oz. Light Rum", "Fill with Orange Juice"],
        "instructions": ["Add ice to a highball glass.", "Add ingredients and stir well."],
        "flags": ["ambiguous_ingredient_quantity_or_unit", "unknown_quantity", "variable_quantity", "source_classification_not_verified", "template_preparation_needs_editorial_review"],
        "description": "Light rum and orange juice make an easy chilled highball.",
        "steps": ["Put ice into a highball glass.", "Pour in the light rum, then fill with orange juice.", "Stir well and serve."],
        "method": "build", "ice": "Ice", "garnish": None,
        "review": "The retained source directs an ice-filled highball, 1.5 ounces of light rum, orange juice filled to the glass, and a thorough stir. Its variable orange-juice quantity remains unchanged.",
    },
    "dn-tom-collins-2": {
        "url": "https://drinknation.com/drink/tom-collins-2",
        "ingredients": ["2 oz. Gin", "1 oz. Carbonated Water/Club Soda", "1 oz. Lemon Juice", "1 handful Ice", "0.5 oz. Sugar Syrup"],
        "instructions": ["Shake all ingredients except for club soda in a cocktail shaker with ice, and strain into glass. Top up with a little soda and stir."],
        "flags": ["ambiguous_preparation_classification", "carbonation_plus_shake", "source_classification_not_verified", "template_preparation_needs_editorial_review"],
        "description": "Gin, lemon and sugar syrup form a brisk highball, completed with club soda.",
        "steps": ["Shake the gin, lemon juice and sugar syrup with ice.", "Strain into a serving glass.", "Add the recorded club soda and stir gently.", "Serve immediately."],
        "method": "shake", "ice": "1 handful Ice", "garnish": None,
        "review": "The retained instructions expressly keep club soda out of the shaker; gin, lemon and syrup are shaken with ice, then the drink is strained, topped with the recorded soda and stirred. No garnish is specified.",
    },
}


def sql(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def arr(values: list[str]) -> str:
    return "ARRAY[" + ",".join(sql(value) for value in values) + "]::text[]"


def j(value: object) -> str:
    return sql(json.dumps(value, ensure_ascii=False)) + "::jsonb"


def instruction_values(value: object) -> list[str]:
    if isinstance(value, str):
        return [cc.clean_text(value)]
    if not isinstance(value, list):
        raise SystemExit("FAIL expected source instructions")
    return [cc.clean_text(str(item.get("text", ""))) if isinstance(item, dict) else cc.clean_text(str(item)) for item in value]


def run() -> None:
    snapshot = json.loads(SNAPSHOT.read_text(encoding="utf8"))
    rows = {item["id"]: item for item in snapshot["rows"]}
    if set(rows) != set(REVIEWS) or snapshot["eligible_totals_before"] != {"total": 46, "cocktails": 31, "mocktails": 15}:
        raise SystemExit("FAIL Batch8 prewrite snapshot targets or live eligible totals")
    for recipe_id, item in rows.items():
        row = item["full_row"]
        if len(row) != EXPECTED_KEYS or item["hash"] != snapshot["write_hashes"].get(recipe_id):
            raise SystemExit(f"FAIL incomplete or unhashable prewrite snapshot {recipe_id}")
        if (row["status"], row["editorial_ready"], row["featured"], row["recipe_quality_issues"]) != ("draft", False, False, REVIEWS[recipe_id]["flags"]):
            raise SystemExit(f"FAIL unexpected live candidate state {recipe_id}")
    records = {json.loads(line)["source_url"].rstrip("/"): json.loads(line) for line in SOURCE.read_text(encoding="utf8").splitlines() if line.strip()}
    evidence, updates = [], []
    for recipe_id, review in REVIEWS.items():
        source = records.get(review["url"].rstrip("/"))
        if not source or [cc.clean_text(item) for item in source.get("recipeIngredient", [])] != review["ingredients"] or instruction_values(source.get("recipeInstructions")) != review["instructions"] or cc.yield_text(source) != "1 cocktail":
            raise SystemExit(f"FAIL retained source mismatch {recipe_id}")
        generated = cc.ngrams(review["description"])
        for step in review["steps"]:
            generated |= cc.ngrams(step)
        source_grams = cc.ngrams(cc.clean_text(str(source.get("description") or ""))) | cc.ngrams(cc.instruction_text(source))
        if generated & source_grams:
            raise SystemExit(f"FAIL six-word source overlap {recipe_id}")
        image = cc.clean_text(source["image"][0]) if source.get("image") else None
        if image:
            raise SystemExit(f"FAIL unexpected image decision required {recipe_id}")
        evidence.append({"id": recipe_id, "decision": "publish", "source_url": review["url"], "source_ingredients": source["recipeIngredient"], "source_instructions": source["recipeInstructions"], "source_yield": source["recipeYield"], "source_prep_time": source.get("prepTime"), "allergens": None, "has_caffeine": None, "review": review["review"], "image": None, "image_note": "no retained source image; keep image_url and image_alt null so the existing SVG fallback remains"})
        updates.append({key: review[key] for key in ("description", "steps", "method", "garnish", "ice")} | {"id": recipe_id})
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "batch8-evidence.jsonl").write_text("".join(json.dumps(item, ensure_ascii=False) + "\n" for item in evidence), encoding="utf8")
    (OUT / "batch8-updates.jsonl").write_text("".join(json.dumps(item, ensure_ascii=False) + "\n" for item in updates), encoding="utf8")
    (OUT / "batch8-images.json").write_text(json.dumps({"rows": [], "no_image_rows": list(REVIEWS), "fallback": "all four retained records have no image; existing SVG fallback remains"}, indent=2) + "\n", encoding="utf8")
    ids = ", ".join(sql(recipe_id) for recipe_id in REVIEWS)
    guards = "\n".join(f"if (select md5(to_jsonb(d)::text) from public.drinks d where id={sql(recipe_id)}) <> {sql(f'__FRESH_ROW_HASH:{recipe_id}__')} then raise exception 'row drift {recipe_id}'; end if;" for recipe_id in REVIEWS)
    edits = "\n".join(f"update public.drinks set description={sql(item['description'])}, preparation={j(item['steps'])}, preparation_method={sql(item['method'])}, garnish={'null' if item['garnish'] is None else sql(item['garnish'])}, ice_type={sql(item['ice'])}, status='published', editorial_ready=true, recipe_quality_issues='{{}}'::text[] where id={sql(item['id'])} and status='draft' and editorial_ready=false and featured=false and recipe_quality_issues={arr(REVIEWS[item['id']]['flags'])}; get diagnostics changed=row_count; if changed<>1 then raise exception 'editorial count {item['id']}'; end if;" for item in updates)
    (OUT / "batch8-editorial.sql").write_text(f"-- PREPARE ONLY. Replace all placeholders only after a fresh readback matches the saved prewrite snapshot.\nbegin; do $$ declare changed integer; begin\n{guards}\nif (select md5(string_agg(md5(to_jsonb(d)::text),'' order by id)) from public.drinks d where id not in ({ids})) <> '__FRESH_UNRELATED_ROWS_AGGREGATE_HASH__' then raise exception 'unrelated drift'; end if;\n{edits}\nend $$; commit;\n", encoding="utf8")
    print("PASS: 4 individually source-confirmed DrinkNation candidates; 0 retained images; snapshot has four full 53-key rows")


if __name__ == "__main__":
    run()
