#!/usr/bin/env python3
"""Prepare retained-source reviews and guarded write drafts for DrinkNation Batch 6."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts" / "recipe-catalogue"))
import catalogue_core as cc  # noqa: E402

OUT = REPO / "output" / "recipe-batch6"
SOURCE = REPO / "output" / "recipe-extract" / "drinknation-recipes.jsonl"
OTHER = "__FRESH_UNRELATED_ROWS_AGGREGATE_HASH__"

REVIEWS = {
    "dn-screwdriver": {
        "url": "https://drinknation.com/drink/screwdriver",
        "ingredients": ["1 part Vodka", "2 parts Orange Juice"],
        "instructions": ["Build over ice in a highball glass.", "Garnish with an orange slice."],
        "flags": ["ambiguous_preparation_classification", "source_classification_not_verified", "template_preparation_needs_editorial_review"],
        "description": "A familiar vodka-and-orange highball built over ice for an easy, citrus-forward serve.",
        "steps": ["Fill a highball glass with ice.", "Add the vodka, then pour in the orange juice in its recorded two-to-one proportion.", "Garnish with the orange slice and serve."],
        "method": "build", "ice": "Ice", "garnish": "1 orange slice",
        "review": "The retained source requires an ice-filled highball build using one part vodka to two parts orange juice, followed by its orange-slice garnish.",
    },
    "dn-gin-and-tonic": {
        "url": "https://drinknation.com/drink/gin-and-tonic",
        "ingredients": ["1.5 oz. Gin", "Fill with Tonic Water", "1 twist Lime Peel"],
        "instructions": ["Build over ice in a highball glass.", "Garnish with a twist of lime."],
        "flags": ["ambiguous_ingredient_quantity_or_unit", "ambiguous_preparation_classification", "unknown_quantity", "unknown_unit", "variable_quantity", "source_classification_not_verified", "template_preparation_needs_editorial_review"],
        "description": "Gin meets chilled tonic in a brisk, bitter-leaning long drink finished with lime.",
        "steps": ["Fill a highball glass with ice.", "Pour in the gin and top with tonic water.", "Finish with the lime-peel twist and serve."],
        "method": "build", "ice": "Ice", "garnish": "1 lime peel twist",
        "review": "The retained source specifies a 1.5-ounce gin highball over ice, topped with tonic water and garnished with its lime twist; tonic is never shaken.",
    },
    "dn-rum-and-coke-1": {
        "url": "https://drinknation.com/drink/rum-and-coke-1",
        "ingredients": ["2 oz. Light Rum", "Fill with Cola", "1 wedge Lemon"],
        "instructions": ["Build over ice in a highball glass.", "Garnish with a lemon wedge."],
        "flags": ["ambiguous_ingredient_quantity_or_unit", "ambiguous_preparation_classification", "unknown_quantity", "variable_quantity", "source_classification_not_verified", "template_preparation_needs_editorial_review"],
        "description": "Light rum and cola make a chilled highball with a lemon accent.",
        "steps": ["Fill a highball glass with ice.", "Pour in the light rum and top with cola.", "Garnish with the lemon wedge and serve."],
        "method": "build", "ice": "Ice", "garnish": "1 lemon wedge",
        "review": "The retained source specifies a two-ounce light-rum highball over ice, filled with cola and finished with its lemon-wedge garnish; cola is never shaken.",
    },
    "dn-mojito": {
        "url": "https://drinknation.com/drink/mojito",
        "ingredients": ["1.33 oz. Light Rum", "Fill with Carbonated Water/Club Soda", "0.75 oz. Lime Juice", "2 wedges Lime", "12 pieces (leaves) Mint", "0.67 oz. Sugar Syrup"],
        "instructions": ["Gently muddle the lime juice, mint leaves, and sugar syrup together at the bottom of the glass.", "Fill the glass with ice, then slowly add the rum.", "Fill with soda and stir gently to bring the leaves upwards into the mixture.", "Optionally add lime wedges as an additional garnish."],
        "flags": ["ambiguous_ingredient_quantity_or_unit", "unknown_quantity", "variable_quantity", "source_classification_not_verified", "template_preparation_needs_editorial_review"],
        "description": "Light rum, mint, lime and soda create a fresh sparkling highball with a softly sweet edge.",
        "steps": ["Press the mint with lime juice and sugar syrup at the base of the glass.", "Pack the glass with ice and add the light rum.", "Top with club soda, stirring gently to lift the mint.", "Use the two lime wedges as an optional garnish, then serve."],
        "method": "build", "ice": "Ice", "garnish": "2 lime wedges (optional)",
        "review": "The retained source uses its recorded rum, lime juice, mint and sugar syrup beneath ice, then adds club soda with a gentle stir; its two lime wedges are explicitly optional garnish, and soda is never shaken.",
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
        return [cc.clean_text(part) for part in re.split(r"(?<=[.!?])\s+", value) if cc.clean_text(part)]
    if not isinstance(value, list):
        raise SystemExit("FAIL expected source instructions")
    return [cc.clean_text(str(item.get("text", ""))) if isinstance(item, dict) else cc.clean_text(str(item)) for item in value]


def run() -> None:
    records = {json.loads(line)["source_url"].rstrip("/"): json.loads(line) for line in SOURCE.read_text(encoding="utf8").splitlines() if line.strip()}
    evidence: list[dict] = []
    updates: list[dict] = []
    images: list[dict] = []
    for recipe_id, review in REVIEWS.items():
        source = records.get(review["url"].rstrip("/"))
        if not source:
            raise SystemExit(f"FAIL missing source {recipe_id}")
        if [cc.clean_text(item) for item in source.get("recipeIngredient", [])] != review["ingredients"]:
            raise SystemExit(f"FAIL source ingredient mismatch {recipe_id}")
        if instruction_values(source.get("recipeInstructions")) != review["instructions"]:
            raise SystemExit(f"FAIL source instruction mismatch {recipe_id}")
        if cc.yield_text(source) != "1 cocktail":
            raise SystemExit(f"FAIL source yield mismatch {recipe_id}")
        generated = cc.ngrams(review["description"])
        for step in review["steps"]:
            generated |= cc.ngrams(step)
        source_grams = cc.ngrams(cc.clean_text(str(source.get("description") or ""))) | cc.ngrams(cc.instruction_text(source))
        if generated & source_grams:
            raise SystemExit(f"FAIL six-word source overlap {recipe_id}")
        image = cc.clean_text(source["image"][0]) if source.get("image") else None
        if not image or not image.startswith("https://") or re.search(r"-\d+x\d+\.(?:jpg|jpeg|png|webp)$", image, re.I):
            raise SystemExit(f"FAIL unsuitable retained image {recipe_id}")
        evidence.append({"id": recipe_id, "decision": "publish", "source_url": review["url"], "source_ingredients": source["recipeIngredient"], "source_instructions": source["recipeInstructions"], "source_yield": source["recipeYield"], "source_prep_time": source.get("prepTime"), "allergens": None, "has_caffeine": None, "review": review["review"], "image": image, "image_note": "retained first full-size source image; not refetched"})
        updates.append({key: review[key] for key in ("description", "steps", "method", "garnish", "ice")} | {"id": recipe_id})
        images.append({"id": recipe_id, "image_url": image})
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "batch6-evidence.jsonl").write_text("".join(json.dumps(item, ensure_ascii=False) + "\n" for item in evidence), encoding="utf8")
    (OUT / "batch6-updates.jsonl").write_text("".join(json.dumps(item, ensure_ascii=False) + "\n" for item in updates), encoding="utf8")
    (OUT / "batch6-images.json").write_text(json.dumps({"rows": images, "fallback": "SVG fallback if no authorized retained image"}, indent=2) + "\n", encoding="utf8")
    ids = ", ".join(sql(item["id"]) for item in updates)
    placeholders = {item["id"]: f"__FRESH_ROW_HASH:{item['id']}__" for item in updates}
    post = {item["id"]: f"__FRESH_POST_EDITORIAL_ROW_HASH:{item['id']}__" for item in updates}
    guards = "\n".join(f"if (select md5(to_jsonb(d)::text) from public.drinks d where id={sql(recipe_id)}) <> {sql(placeholders[recipe_id])} then raise exception 'row drift {recipe_id}'; end if;" for recipe_id in placeholders)
    edits = "\n".join(f"update public.drinks set description={sql(item['description'])}, preparation={j(item['steps'])}, preparation_method={sql(item['method'])}, garnish={sql(item['garnish'])}, ice_type={sql(item['ice'])}, status='published', editorial_ready=true, recipe_quality_issues='{{}}'::text[] where id={sql(item['id'])} and status='draft' and editorial_ready=false and featured=false and recipe_quality_issues={arr(REVIEWS[item['id']]['flags'])}; get diagnostics changed=row_count; if changed<>1 then raise exception 'editorial count {item['id']}'; end if;" for item in updates)
    (OUT / "batch6-editorial.sql").write_text(f"-- PREPARE ONLY; fresh placeholders required.\nbegin; do $$ declare changed integer; begin\n{guards}\nif (select md5(string_agg(md5(to_jsonb(d)::text),'' order by id)) from public.drinks d where id not in ({ids})) <> {sql(OTHER)} then raise exception 'unrelated drift'; end if;\n{edits}\nend $$; commit;\n", encoding="utf8")
    post_guards = "\n".join(f"if (select md5(to_jsonb(d)::text) from public.drinks d where id={sql(recipe_id)}) <> {sql(post[recipe_id])} then raise exception 'post editorial drift {recipe_id}'; end if;" for recipe_id in post)
    image_edits = "\n".join(f"update public.drinks set image_url={sql(item['image_url'])}, image_alt=name where id={sql(item['id'])} and status='published' and editorial_ready and image_url is null and md5(to_jsonb(drinks)::text)={sql(post[item['id']])}; get diagnostics changed=row_count; if changed<>1 then raise exception 'image count {item['id']}'; end if;" for item in images)
    (OUT / "batch6-images.sql").write_text(f"-- PREPARE ONLY; fresh post-editorial placeholders required.\nbegin; do $$ declare changed integer; begin\n{post_guards}\nif (select md5(string_agg(md5(to_jsonb(d)::text),'' order by id)) from public.drinks d where id not in ({ids})) <> {sql(OTHER)} then raise exception 'unrelated drift'; end if;\n{image_edits}\nend $$; commit;\n", encoding="utf8")
    print("PASS: 4 individually source-confirmed DrinkNation candidates")


if __name__ == "__main__":
    run()
