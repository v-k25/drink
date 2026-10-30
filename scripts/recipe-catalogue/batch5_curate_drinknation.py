#!/usr/bin/env python3
"""Prepare-only retained-source review for guarded DrinkNation Batch 5."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts" / "recipe-catalogue"))
import catalogue_core as cc  # noqa: E402

OUT = REPO / "output" / "recipe-batch5"
SOURCE = REPO / "output" / "recipe-extract" / "drinknation-recipes.jsonl"
OTHER = "__FRESH_UNRELATED_ROWS_AGGREGATE_HASH__"

REVIEWS = {
    "dn-black-russian": {
        "url": "https://drinknation.com/drink/black-russian",
        "ingredients": ["2 parts Coffee Liqueur", "5 parts Vodka"],
        "instructions": ["Build over ice in a rocks glass.", "Stir gently and serve."],
        "flags": ["source_classification_not_verified", "template_preparation_needs_editorial_review"],
        "description": "Coffee liqueur and vodka make a brisk, spirit-led drink with a roasted edge.",
        "steps": [
            "Fill a rocks glass with ice.",
            "Add the coffee liqueur and vodka in the recorded proportions.",
            "Stir gently, then serve at once.",
        ],
        "method": "stir",
        "ice": "Ice",
        "garnish": None,
        "review": "The retained source specifies a vodka-heavy two-part-to-five-part build over ice followed by a gentle stir.",
    },
    "dn-stinger": {
        "url": "https://drinknation.com/drink/stinger",
        "ingredients": ["1.5 oz. Brandy", "0.5 oz. White Creme de Menthe"],
        "instructions": ["Add ingredients to a cocktail shaker.", "Add ice and shake well until chilled.", "Strain into a cocktail glass."],
        "flags": ["source_classification_not_verified", "template_preparation_needs_editorial_review"],
        "description": "Brandy and white creme de menthe make a cold, mint-accented after-dinner cocktail.",
        "steps": [
            "Add the brandy and white creme de menthe to a shaker with ice.",
            "Shake until thoroughly chilled.",
            "Strain into a cocktail glass and serve.",
        ],
        "method": "shake",
        "ice": None,
        "garnish": None,
        "review": "The retained source gives a three-part shake-and-strain method with no garnish or serving ice specified.",
    },
    "dn-mimosa": {
        "url": "https://drinknation.com/drink/mimosa",
        "ingredients": ["0.89 oz. Champagne", "0.89 oz. Orange Juice"],
        "instructions": ["Pour chilled orange juice into champagne flutes.", "Add chilled champagne.", "Optionally garnish with an orange twist."],
        "flags": ["carbonation_plus_shake", "source_classification_not_verified", "template_preparation_needs_editorial_review"],
        "description": "Chilled orange juice and champagne make a light sparkling pour for a flute.",
        "steps": [
            "Pour the chilled orange juice into a champagne flute.",
            "Ease in the chilled champagne without shaking.",
            "Serve immediately.",
        ],
        "method": "build",
        "ice": None,
        "garnish": None,
        "review": "The retained source pours chilled orange juice before chilled champagne and makes its orange-twist garnish optional; it is omitted because no twist is listed as an ingredient.",
    },
}


def sql(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def arr(values: list[str]) -> str:
    return "ARRAY[" + ",".join(sql(value) for value in values) + "]::text[]"


def j(value: object) -> str:
    return sql(json.dumps(value, ensure_ascii=False)) + "::jsonb"


def instruction_values(value: object) -> list[str]:
    if not isinstance(value, list):
        raise SystemExit("FAIL expected structured source instructions")
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
        evidence.append({
            "id": recipe_id, "decision": "publish", "source_url": review["url"],
            "source_ingredients": source["recipeIngredient"], "source_instructions": source["recipeInstructions"],
            "source_yield": source["recipeYield"], "source_prep_time": source.get("prepTime"),
            "allergens": None, "has_caffeine": None,
            "review": review["review"], "image": image,
            "image_note": "retained first full-size source image; not refetched",
        })
        updates.append({key: review[key] for key in ("description", "steps", "method", "garnish", "ice") } | {"id": recipe_id})
        images.append({"id": recipe_id, "image_url": image})
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "batch5-evidence.jsonl").write_text("".join(json.dumps(item, ensure_ascii=False) + "\n" for item in evidence), encoding="utf8")
    (OUT / "batch5-updates.jsonl").write_text("".join(json.dumps(item, ensure_ascii=False) + "\n" for item in updates), encoding="utf8")
    (OUT / "batch5-images.json").write_text(json.dumps({"rows": images, "fallback": "SVG fallback if no authorized retained image"}, indent=2) + "\n", encoding="utf8")
    ids = ", ".join(sql(item["id"]) for item in updates)
    placeholders = {item["id"]: f"__FRESH_ROW_HASH:{item['id']}__" for item in updates}
    post = {item["id"]: f"__FRESH_POST_EDITORIAL_ROW_HASH:{item['id']}__" for item in updates}
    guards = "\n".join(f"if (select md5(to_jsonb(d)::text) from public.drinks d where id={sql(recipe_id)}) <> {sql(placeholders[recipe_id])} then raise exception 'row drift {recipe_id}'; end if;" for recipe_id in placeholders)
    edits = "\n".join(
        f"update public.drinks set description={sql(item['description'])}, preparation={j(item['steps'])}, preparation_method={sql(item['method'])}, garnish={'null' if item['garnish'] is None else sql(item['garnish'])}, ice_type={'null' if item['ice'] is None else sql(item['ice'])}, status='published', editorial_ready=true, recipe_quality_issues='{{}}'::text[] where id={sql(item['id'])} and status='draft' and editorial_ready=false and featured=false and recipe_quality_issues={arr(REVIEWS[item['id']]['flags'])}; get diagnostics changed=row_count; if changed<>1 then raise exception 'editorial count {item['id']}'; end if;"
        for item in updates
    )
    (OUT / "batch5-editorial.sql").write_text(f"-- PREPARE ONLY; fresh placeholders required.\nbegin; do $$ declare changed integer; begin\n{guards}\nif (select md5(string_agg(md5(to_jsonb(d)::text),'' order by id)) from public.drinks d where id not in ({ids})) <> {sql(OTHER)} then raise exception 'unrelated drift'; end if;\n{edits}\nend $$; commit;\n", encoding="utf8")
    post_guards = "\n".join(f"if (select md5(to_jsonb(d)::text) from public.drinks d where id={sql(recipe_id)}) <> {sql(post[recipe_id])} then raise exception 'post editorial drift {recipe_id}'; end if;" for recipe_id in post)
    image_edits = "\n".join(f"update public.drinks set image_url={sql(item['image_url'])}, image_alt=name where id={sql(item['id'])} and status='published' and editorial_ready and image_url is null and md5(to_jsonb(drinks)::text)={sql(post[item['id']])}; get diagnostics changed=row_count; if changed<>1 then raise exception 'image count {item['id']}'; end if;" for item in images)
    (OUT / "batch5-images.sql").write_text(f"-- PREPARE ONLY; fresh post-editorial placeholders required.\nbegin; do $$ declare changed integer; begin\n{post_guards}\nif (select md5(string_agg(md5(to_jsonb(d)::text),'' order by id)) from public.drinks d where id not in ({ids})) <> {sql(OTHER)} then raise exception 'unrelated drift'; end if;\n{image_edits}\nend $$; commit;\n", encoding="utf8")
    print("PASS: 3 individually source-confirmed DrinkNation candidates")


if __name__ == "__main__":
    run()
