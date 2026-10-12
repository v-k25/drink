#!/usr/bin/env python3
"""Prepare-only source review for the four owner-selected Batch-3 mocktails.

This never connects to Supabase.  It validates retained extraction records and
writes review evidence plus deliberately placeholder-guarded SQL drafts.  A
fresh full-row snapshot and hashes must replace the placeholders immediately
before a separately applied publication transaction.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts" / "recipe-catalogue"))
import catalogue_core as cc  # noqa: E402

OUT = REPO / "output" / "recipe-batch3"
SOURCE = REPO / "output" / "recipe-extract" / "mindfulmocktail-recipes.jsonl"
IDS = (
    "mm-shirley-temple-mocktail",
    "mm-quick-cranberry-mocktail",
    "mm-lemon-mocktails",
    "mm-coconut-water-mocktail",
)
URLS = {drink_id: f"https://mindfulmocktail.com/{drink_id[3:]}/" for drink_id in IDS}
PLACEHOLDER = {drink_id: f"__FRESH_ROW_HASH:{drink_id}__" for drink_id in IDS}
POST_EDITORIAL_PLACEHOLDER = {drink_id: f"__FRESH_POST_EDITORIAL_ROW_HASH:{drink_id}__" for drink_id in IDS}
OTHER = "__FRESH_UNRELATED_ROWS_AGGREGATE_HASH__"

# Original editorial wording is intentionally derived only from structured
# source facts. Optional ingredients and source yields stay explicit.
REVIEWS = {
    "mm-shirley-temple-mocktail": {
        "ingredients": ["1 cup ginger ale", "1 teaspoon grenadine", "1 squeeze of fresh lime juice", "Maraschino cherries to garnish (optional)"],
        "flags": ["ambiguous_ingredient_quantity_or_unit", "unknown_quantity", "unknown_unit", "source_classification_not_verified", "template_preparation_needs_editorial_review"],
        "description": "A fizzy lime-and-grenadine build over ice, with an optional maraschino cherry.",
        "steps": ["Fill a glass with ice.", "Combine the ginger ale with grenadine and a squeeze of fresh lime, then stir gently.", "Add an optional maraschino cherry garnish and serve."],
        "method": "build", "glassware": None, "garnish": "Maraschino cherry (optional)", "ice": "Ice", "allergens": None,
        "review": "The single source step builds the carbonated drink over ice and stirs it; no shake or strain. The named cherry garnish is optional in the ingredient list and source step.",
    },
    "mm-quick-cranberry-mocktail": {
        "ingredients": ["3 oz cranberry juice", "4 oz ginger beer ((sub with use ginger kombucha for a nourishing twist!))", "1 oz orange juice", "1 oz non-alcoholic rum or spirit of choice ((optional - tastes great without))", "Cranberries, orange, rosemary, thyme ((for optional garnish))"],
        "flags": ["ambiguous_ingredient_quantity_or_unit", "unknown_quantity", "source_classification_not_verified", "template_preparation_needs_editorial_review"],
        "description": "Cranberry and orange juices with ginger beer over ice, with optional alcohol-free rum and garnish choices.",
        "steps": ["Fill a glass or mug with ice.", "Add the measured cranberry and orange juices with ginger beer; include the optional non-alcoholic rum or spirit if using.", "Stir gently, taste, and adjust with extra juice or ginger beer if wanted.", "Finish with any of the optional cranberry, orange, rosemary or thyme garnishes."],
        "method": "build", "glassware": None, "garnish": "Cranberries, orange, rosemary, or thyme (optional)", "ice": "Ice", "allergens": None,
        "review": "The source builds its carbonated ginger beer in an ice-filled glass and says to stir gently. Its optional rum appears in ingredients but not the prose step, so it remains explicitly optional rather than being silently dropped.",
    },
    "mm-lemon-mocktails": {
        "ingredients": ["1 tablespoon lemon juice", "2 lemon rounds", "1 teaspoon honey (optional)", "6-8 fresh mint leaves", ".5 cup coconut water", ".5 cup soda water"],
        "flags": ["ambiguous_ingredient_quantity_or_unit", "unknown_unit", "source_classification_not_verified", "template_preparation_needs_editorial_review"],
        "description": "Lemon, mint, coconut water and soda water stirred over ice, with optional honey.",
        "steps": ["Muddle the lemon rounds and mint in a glass, adding the optional honey if using.", "Add plenty of ice, then pour in the coconut water and soda water.", "Stir gently and serve."],
        "method": "build", "glassware": None, "garnish": None, "ice": "Ice", "allergens": None,
        "review": "The source muddles in the serving glass, then tops with carbonated soda water over ice. Its final unspecified 'garnish' is not made a requirement because no named garnish ingredient is supplied.",
    },
    "mm-coconut-water-mocktail": {
        "ingredients": ["3 oz coconut water ((no added sugar))", "2 oz orange juice ((freshly squeezed is best))", "1/2 oz lemon juice", "1/2 teaspoon apple cider vinegar ((optional - see note 1) )", "1 teaspoon honey ((or your choice of sweetener - see note 2))", "Dehydrated citrus for garnish ((optional))", "Tajin for rim ((optional))"],
        "flags": ["ambiguous_ingredient_quantity_or_unit", "unknown_quantity", "source_classification_not_verified", "template_preparation_needs_editorial_review"],
        "description": "Coconut water and citrus shaken with honey, with optional vinegar, Tajín rim and dehydrated citrus.",
        "steps": ["Optionally rim a glass with Tajín, then fill it with ice.", "Shake the measured liquids and honey with ice for about 10 to 15 seconds; include the optional apple cider vinegar if using.", "Strain into the prepared glass, add optional dehydrated citrus, and serve."],
        "method": "shake", "glassware": None, "garnish": "Dehydrated citrus (optional)", "ice": "Ice", "allergens": None,
        "review": "The source specifically shakes the liquids with ice and strains into an ice-filled glass. The optional vinegar, rim, and citrus garnish remain optional; allergens and caffeine remain unknown.",
    },
}

def clean(value: str) -> str:
    return cc.clean_text(value)

def instructions(record: dict) -> str:
    return cc.instruction_text(record)

def sql(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"

def json_sql(value: list[str]) -> str:
    return sql(json.dumps(value, ensure_ascii=False)) + "::jsonb"

def text_array(values: list[str]) -> str:
    return "ARRAY[" + ",".join(sql(value) for value in values) + "]::text[]"

def run() -> None:
    source_by_url = {json.loads(line)["source_url"].rstrip("/"): json.loads(line) for line in SOURCE.read_text(encoding="utf-8").splitlines() if line.strip()}
    evidence, updates, images = [], [], []
    for drink_id in IDS:
        review, url = REVIEWS[drink_id], URLS[drink_id]
        record = source_by_url.get(url.rstrip("/"))
        if not record:
            raise SystemExit(f"FAIL: missing retained source for {drink_id}")
        source_ingredients = [clean(x) for x in record["recipeIngredient"]]
        if source_ingredients != review["ingredients"]:
            raise SystemExit(f"FAIL: retained ingredients differ for {drink_id}")
        if review["method"] not in cc.METHODS or (review["method"] == "shake" and re.search(r"ginger (?:ale|beer)|soda water", " ".join(review["ingredients"]), re.I)):
            raise SystemExit(f"FAIL: unsupported or carbonated-shake method for {drink_id}")
        generated = cc.ngrams(review["description"])
        for step in review["steps"]:
            generated |= cc.ngrams(step)
        source_grams = cc.ngrams(clean(str(record.get("description") or ""))) | cc.ngrams(instructions(record))
        if generated & source_grams:
            raise SystemExit(f"FAIL: six-word source overlap for {drink_id}")
        image = clean(record["image"][0]) if record.get("image") else None
        if image and (not image.startswith("https://") or re.search(r"-\d+x\d+\.(jpg|jpeg|png|webp)$", image, re.I)):
            raise SystemExit(f"FAIL: unsuitable retained image for {drink_id}")
        evidence.append({"id": drink_id, "decision": "publish", "source_url": url, "name": record["name"], "source_ingredients": record["recipeIngredient"], "source_instructions": record["recipeInstructions"], "source_yield": record["recipeYield"], "source_prep_time": record.get("prepTime"), "review": review["review"], "allergens": None, "allergens_note": "No allergen claim: unknown remains NULL.", "has_caffeine": None, "image": image, "image_note": "Retained first full-size source image; never refetched."})
        updates.append({"id": drink_id, "description": review["description"], "preparation": review["steps"], "preparation_method": review["method"], "glassware": review["glassware"], "garnish": review["garnish"], "ice_type": review["ice"], "status": "published", "editorial_ready": True, "recipe_quality_issues": []})
        images.append({"id": drink_id, "image_url": image, "image_alt_from_live_name": True})
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "batch3-evidence.jsonl").write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in evidence), encoding="utf-8")
    (OUT / "batch3-updates.jsonl").write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in updates), encoding="utf-8")
    (OUT / "batch3-images.json").write_text(json.dumps({"status": "reviewed-source-preview", "rows": images, "fallback": "Use existing SVG fallback only if no suitable retained image exists."}, indent=2) + "\n", encoding="utf-8")
    values = ", ".join(sql(i) for i in IDS)
    guards = "\n".join(f"  if (select md5(to_jsonb(d)::text) from public.drinks d where id={sql(i)}) <> {sql(PLACEHOLDER[i])} then raise exception 'Batch-3 row drift: {i}'; end if;" for i in IDS)
    edits = "\n".join(f"  update public.drinks set description={sql(u['description'])}, preparation={json_sql(u['preparation'])}, preparation_method={sql(u['preparation_method'])}, glassware={'null' if u['glassware'] is None else sql(u['glassware'])}, garnish={'null' if u['garnish'] is None else sql(u['garnish'])}, ice_type={sql(u['ice_type'])}, status='published', editorial_ready=true, recipe_quality_issues='{{}}'::text[] where id={sql(u['id'])} and status='draft' and editorial_ready=false and featured=false and recipe_quality_issues={text_array(REVIEWS[u['id']]['flags'])};\n  get diagnostics changed = row_count; if changed <> 1 then raise exception 'Batch-3 editorial update count mismatch for {u['id']}: %', changed; end if;" for u in updates)
    editorial = f"-- PREPARE ONLY: placeholders must be replaced from a fresh live snapshot.\nbegin;\ncreate temp table batch3_before as select id,to_jsonb(d) before_row from public.drinks d where id in ({values});\ndo $$ declare changed integer; begin\n{guards}\n  if (select count(*) from public.drinks where id in ({values}) and status='draft' and editorial_ready=false and featured=false) <> 4 then raise exception 'Batch-3 pre-state count mismatch'; end if;\n  if (select md5(string_agg(md5(to_jsonb(d)::text),'' order by id)) from public.drinks d where id not in ({values})) <> {sql(OTHER)} then raise exception 'Batch-3 unrelated-row drift'; end if;\n{edits}\n  if (select count(*) from public.drinks where id in ({values}) and status='published' and editorial_ready and recipe_quality_issues='{{}}'::text[]) <> 4 then raise exception 'Batch-3 update count mismatch'; end if;\nend $$;\nselect b.id, array_agg(e.key order by e.key) filter (where e.value is distinct from a.value) changed_keys from batch3_before b join public.drinks d using(id) cross join lateral jsonb_each(b.before_row) e join lateral jsonb_each(to_jsonb(d)) a on a.key=e.key group by b.id order by b.id;\ncommit;\n"
    (OUT / "batch3-editorial.sql").write_text(editorial, encoding="utf-8")
    post_guards = "\n".join(f"  if (select md5(to_jsonb(d)::text) from public.drinks d where id={sql(i)}) <> {sql(POST_EDITORIAL_PLACEHOLDER[i])} then raise exception 'Batch-3 post-editorial row drift: {i}'; end if;" for i in IDS)
    image_edits = "\n".join(f"  update public.drinks set image_url={sql(i['image_url'])}, image_alt=name where id={sql(i['id'])} and status='published' and editorial_ready and image_url is null and md5(to_jsonb(drinks)::text)={sql(POST_EDITORIAL_PLACEHOLDER[i['id']])};\n  get diagnostics changed = row_count; if changed <> 1 then raise exception 'Batch-3 image update count mismatch for {i['id']}: %', changed; end if;" for i in images)
    image_sql = f"-- PREPARE ONLY: apply only after verified editorial publication.\n-- POST_EDITORIAL hash placeholders must be freshly captured after the editorial transaction.\nbegin;\ndo $$ declare changed integer; begin\n{post_guards}\n  if (select count(*) from public.drinks where id in ({values}) and status='published' and editorial_ready and image_url is null) <> 4 then raise exception 'Batch-3 image pre-state count mismatch'; end if;\n  if (select md5(string_agg(md5(to_jsonb(d)::text),'' order by id)) from public.drinks d where id not in ({values})) <> {sql(OTHER)} then raise exception 'Batch-3 unrelated-row drift'; end if;\n{image_edits}\n  if (select count(*) from public.drinks where id in ({values}) and image_url is not null) <> 4 then raise exception 'Batch-3 image count mismatch'; end if;\nend $$;\ncommit;\n"
    (OUT / "batch3-images.sql").write_text(image_sql, encoding="utf-8")
    print("PASS: four source-reviewed Batch-3 mocktail previews and placeholder-guarded SQL drafts written")

if __name__ == "__main__":
    run()
