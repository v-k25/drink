#!/usr/bin/env python3
"""Prepare-only Batch 6 retained-source review; intentionally authorizes no writes."""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts" / "recipe-catalogue"))
import catalogue_core as cc  # noqa: E402

OUT = REPO / "output" / "recipe-batch6"
SOURCE = REPO / "output" / "recipe-extract" / "mindfulmocktail-recipes.jsonl"

EXCLUSIONS = {
    "mm-moscow-mule-mocktail": {
        "source_url": "https://mindfulmocktail.com/moscow-mule-mocktail/",
        "reason": "BLOCKING source ambiguity: the retained ingredient list directs readers to a Notes section for six variations, but the retained structured record does not contain those variation ingredients or methods. Publishing only the base build would omit source-promised options.",
        "required": ["For variations, see 'Notes' section below"],
    },
    "mm-margarita-mocktail-recipe": {
        "source_url": "https://mindfulmocktail.com/margarita-mocktail-recipe/",
        "reason": "BLOCKING source ambiguity: agave explicitly points to Note 3 for alternatives, but the retained structured record does not preserve those alternatives. A source-faithful editorial method cannot make every source option explicit.",
        "required": [".5 oz agave ((see Note 3 for alternatives))"],
    },
    "mm-holiday-mocktail": {
        "source_url": "https://mindfulmocktail.com/holiday-mocktail/",
        "reason": "BLOCKING source ambiguity: the retained method requires a choice of cranberry, mint, and/or lime garnish, but none of those garnishes appears in the retained ingredient list. Adding them would invent quantities; omitting them would drop a source instruction.",
        "required": [],
    },
    "mm-cherry-mocktail": {
        "source_url": "https://mindfulmocktail.com/cherry-mocktail/",
        "reason": "BLOCKING source ambiguity: the sole retained lime is quartered and muddled, while the final instruction separately requires lime wheels as one garnish option. The record supplies no additional lime or quantity for wheels; its 'choice of sparkling drink' also exceeds the listed sparkling-water specificity.",
        "required": [],
    },
}


def text(value: object) -> str:
    return cc.clean_text(str(value))


def instructions(record: dict) -> str:
    return cc.instruction_text(record)


def run() -> None:
    records = {
        json.loads(line)["source_url"].rstrip("/"): json.loads(line)
        for line in SOURCE.read_text(encoding="utf-8").splitlines()
        if line.strip()
    }
    evidence = []
    for drink_id, exclusion in EXCLUSIONS.items():
        record = records.get(exclusion["source_url"].rstrip("/"))
        if not record:
            raise SystemExit(f"FAIL: missing retained source for {drink_id}")
        ingredients = [text(item) for item in record["recipeIngredient"]]
        source_instructions = instructions(record)
        for required in exclusion["required"]:
            if required not in ingredients:
                raise SystemExit(f"FAIL: source ambiguity evidence drifted for {drink_id}")
        if drink_id == "mm-holiday-mocktail":
            if not all(term in source_instructions for term in ("cranberries", "mint", "lime to garnish")):
                raise SystemExit("FAIL: holiday garnish evidence drifted")
            if any("garnish" in item.lower() for item in ingredients):
                raise SystemExit("FAIL: holiday ingredient ambiguity no longer exists")
        if drink_id == "mm-cherry-mocktail":
            if "1 Lime (quartered)" not in ingredients or "lime wheels" not in source_instructions or "choice of sparkling drink" not in source_instructions:
                raise SystemExit("FAIL: cherry ambiguity evidence drifted")
        evidence.append({
            "id": drink_id,
            "decision": "exclude",
            "reason": exclusion["reason"],
            "source_url": exclusion["source_url"],
            "source_name": record["name"],
            "source_ingredients": record["recipeIngredient"],
            "source_instructions": record["recipeInstructions"],
            "source_yield": record["recipeYield"],
            "source_prep_time": record.get("prepTime"),
            "allergens": None,
            "has_caffeine": None,
            "write_authorized": False,
        })
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "batch6-evidence.jsonl").write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in evidence), encoding="utf-8"
    )
    (OUT / "batch6-updates.jsonl").write_text("", encoding="utf-8")
    (OUT / "batch6-images.json").write_text(json.dumps({
        "status": "no-image-write-authorized",
        "rows": [],
        "excluded": [row["id"] for row in evidence],
        "reason": "All four target records are source-ambiguous; no editorial or image transaction was generated.",
    }, indent=2) + "\n", encoding="utf-8")
    print("PASS: 0 publish candidates; 4 explicit retained-source exclusions; no write SQL authorized")


if __name__ == "__main__":
    run()
