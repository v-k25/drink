#!/usr/bin/env python3
"""Prepare retained-source reviews and guarded write drafts for DrinkNation Batch 7."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts" / "recipe-catalogue"))
import catalogue_core as cc  # noqa: E402

OUT = REPO / "output" / "recipe-batch7"
SOURCE = REPO / "output" / "recipe-extract" / "drinknation-recipes.jsonl"
OTHER = "__FRESH_UNRELATED_ROWS_AGGREGATE_HASH__"

REVIEWS = {
    "dn-gin-fizz": {
        "url": "https://drinknation.com/drink/gin-fizz",
        "ingredients": ["1.5 oz. Gin", "2 oz. Carbonated Water/Club Soda", "1 oz. Lemon Juice", "0.33 oz. Sugar Syrup"],
        "instructions": ["Shake all but carbonated water in a cocktail shaker with ice. - Pour into a highball glass with two ice cubes.", "Fill gently with soda water and stir.", "Garnish variations include mint, lime and/or nutmeg"],
        "flags": ["ambiguous_preparation_classification", "carbonation_plus_shake", "source_classification_not_verified", "template_preparation_needs_editorial_review"],
        "description": "Gin, lemon and sugar syrup make a bright, lightly sparkling highball finished with club soda.",
        "steps": ["Shake the gin, lemon juice and sugar syrup with ice.", "Pour the shaken mixture into a highball glass over two ice cubes.", "Gently add the club soda and stir.", "Use mint, lime and/or nutmeg as an optional garnish, then serve."],
        "method": "shake", "ice": "2 ice cubes", "garnish": "mint, lime and/or nutmeg (optional)",
        "review": "The retained source shakes only gin, lemon juice and sugar syrup with ice, then pours over two ice cubes and gently adds and stirs the soda. Its mint, lime and/or nutmeg garnish variations remain optional.",
    },
    "dn-whiskey-highball": {
        "url": "https://drinknation.com/drink/whiskey-highball",
        "ingredients": ["1.5 oz. Blended Whiskey", "Fill with Carbonated Water/Club Soda", "1 wedge Lime"],
        "instructions": ["Add ice to a highball glass.", "Add ingredients and stir well.", "Garnish with a lime wedge."],
        "flags": ["ambiguous_ingredient_quantity_or_unit", "unknown_quantity", "variable_quantity", "source_classification_not_verified", "template_preparation_needs_editorial_review"],
        "description": "Blended whiskey and club soda make a chilled, easy-drinking highball with a lime wedge.",
        "steps": ["Fill a highball glass with ice.", "Add the blended whiskey and top with club soda.", "Stir well, garnish with the lime wedge and serve."],
        "method": "build", "ice": "Ice", "garnish": "1 lime wedge",
        "review": "The retained source specifies an ice-filled highball with 1.5 ounces of blended whiskey, club soda filled to the glass, a stir, and a lime-wedge garnish. Club soda is not shaken.",
    },
    "dn-apple-daiquiri": {
        "url": "https://drinknation.com/drink/apple-daiquiri",
        "ingredients": ["1.5 oz. Light Rum", "0.5 oz. Apple Juice", "0.5 oz. Lime Juice", "0.5 tsp. Superfine Sugar"],
        "instructions": ["Combine ingredients in a shaker 1/3 full of ice.", "Shake and strain into a chilled cocktail glass."],
        "flags": ["source_classification_not_verified", "template_preparation_needs_editorial_review"],
        "description": "Light rum, apple juice and lime form a crisp shaken sour with a small measure of superfine sugar.",
        "steps": ["Fill a shaker one-third full with ice.", "Add the light rum, apple juice, lime juice and superfine sugar.", "Shake well, then pass through a strainer into a pre-chilled cocktail glass."],
        "method": "shake", "ice": "Ice", "garnish": None,
        "review": "The retained source calls for all four recorded ingredients in a shaker one-third full of ice, shaken and strained into a chilled cocktail glass. It specifies no garnish.",
    },
    "dn-frozen-pineapple-daiquiri": {
        "url": "https://drinknation.com/drink/frozen-pineapple-daiquiri",
        "ingredients": ["1.5 oz. Light Rum", "1 tbsp. Lime Juice", "4 chunks Pineapple", "1 Cup Ice", "0.5 tsp. Sugar"],
        "instructions": ["Add ingredients to a blender.", "Blend until smooth.", "Pour into glass."],
        "flags": ["ambiguous_ingredient_quantity_or_unit", "unknown_unit", "source_classification_not_verified", "template_preparation_needs_editorial_review"],
        "description": "Light rum, pineapple, lime, ice and sugar blend into a cold, fruit-forward frozen drink.",
        "steps": ["Add the light rum, lime juice, pineapple chunks, ice and sugar to a blender.", "Blend until smooth.", "Pour into a glass and serve."],
        "method": "blend", "ice": "1 Cup Ice", "garnish": None,
        "review": "The retained source directs all recorded ingredients, including its one cup of ice, to a blender before blending smooth and pouring. It specifies no garnish.",
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
        if image and (not image.startswith("https://") or re.search(r"-\d+x\d+\.(?:jpg|jpeg|png|webp)$", image, re.I)):
            raise SystemExit(f"FAIL unsuitable retained image {recipe_id}")
        evidence.append({"id": recipe_id, "decision": "publish", "source_url": review["url"], "source_ingredients": source["recipeIngredient"], "source_instructions": source["recipeInstructions"], "source_yield": source["recipeYield"], "source_prep_time": source.get("prepTime"), "allergens": None, "has_caffeine": None, "review": review["review"], "image": image, "image_note": "retained first full-size source image; not refetched" if image else "no retained source image; keep image_url and image_alt null so the existing SVG fallback remains"})
        updates.append({key: review[key] for key in ("description", "steps", "method", "garnish", "ice")} | {"id": recipe_id})
        if image:
            images.append({"id": recipe_id, "image_url": image})
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "batch7-evidence.jsonl").write_text("".join(json.dumps(item, ensure_ascii=False) + "\n" for item in evidence), encoding="utf8")
    (OUT / "batch7-updates.jsonl").write_text("".join(json.dumps(item, ensure_ascii=False) + "\n" for item in updates), encoding="utf8")
    (OUT / "batch7-images.json").write_text(json.dumps({"rows": images, "no_image_rows": [item["id"] for item in updates if item["id"] not in {image["id"] for image in images}], "fallback": "existing SVG fallback remains when no retained source image exists"}, indent=2) + "\n", encoding="utf8")
    ids = ", ".join(sql(item["id"]) for item in updates)
    placeholders = {item["id"]: f"__FRESH_ROW_HASH:{item['id']}__" for item in updates}
    post = {item["id"]: f"__FRESH_POST_EDITORIAL_ROW_HASH:{item['id']}__" for item in images}
    guards = "\n".join(f"if (select md5(to_jsonb(d)::text) from public.drinks d where id={sql(recipe_id)}) <> {sql(placeholders[recipe_id])} then raise exception 'row drift {recipe_id}'; end if;" for recipe_id in placeholders)
    edits = "\n".join(f"update public.drinks set description={sql(item['description'])}, preparation={j(item['steps'])}, preparation_method={sql(item['method'])}, garnish={'null' if item['garnish'] is None else sql(item['garnish'])}, ice_type={sql(item['ice'])}, status='published', editorial_ready=true, recipe_quality_issues='{{}}'::text[] where id={sql(item['id'])} and status='draft' and editorial_ready=false and featured=false and recipe_quality_issues={arr(REVIEWS[item['id']]['flags'])}; get diagnostics changed=row_count; if changed<>1 then raise exception 'editorial count {item['id']}'; end if;" for item in updates)
    (OUT / "batch7-editorial.sql").write_text(f"-- PREPARE ONLY; fresh placeholders required.\nbegin; do $$ declare changed integer; begin\n{guards}\nif (select md5(string_agg(md5(to_jsonb(d)::text),'' order by id)) from public.drinks d where id not in ({ids})) <> {sql(OTHER)} then raise exception 'unrelated drift'; end if;\n{edits}\nend $$; commit;\n", encoding="utf8")
    post_guards = "\n".join(f"if (select md5(to_jsonb(d)::text) from public.drinks d where id={sql(recipe_id)}) <> {sql(post[recipe_id])} then raise exception 'post editorial drift {recipe_id}'; end if;" for recipe_id in post)
    image_edits = "\n".join(f"update public.drinks set image_url={sql(item['image_url'])}, image_alt=name where id={sql(item['id'])} and status='published' and editorial_ready and image_url is null and md5(to_jsonb(drinks)::text)={sql(post[item['id']])}; get diagnostics changed=row_count; if changed<>1 then raise exception 'image count {item['id']}'; end if;" for item in images)
    (OUT / "batch7-images.sql").write_text(f"-- PREPARE ONLY; fresh post-editorial placeholders required.\nbegin; do $$ declare changed integer; begin\n{post_guards}\nif (select md5(string_agg(md5(to_jsonb(d)::text),'' order by id)) from public.drinks d where id not in ({ids})) <> {sql(OTHER)} then raise exception 'unrelated drift'; end if;\n{image_edits}\nend $$; commit;\n", encoding="utf8")
    print(f"PASS: {len(updates)} individually source-confirmed DrinkNation candidates; {len(images)} retained source image")


if __name__ == "__main__":
    run()
