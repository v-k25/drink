#!/usr/bin/env python3
"""Build deterministic, source-derived recipe essentials and an honest review queue."""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
sys.path.insert(0, str(HERE))
import build_catalogue as bc
import catalogue_core as cc

DEFAULT_INPUTS = bc.DEFAULT_INPUTS
DEFAULT_OUT = REPO / "output" / "recipe-essentials"
UNITS = r"oz\.?|ounce(?:s)?|ml|cl|lit(?:re|er)s?|cup(?:s)?|glass(?:es)?|tbsp\.?|tablespoons?|tsp\.?|teaspoons?|dash(?:es)?|splash(?:es)?|shot(?:s)?|part(?:s)?|bottle(?:s)?|can(?:s)?|pinch(?:es)?|piece(?:s)?|wedge(?:s)?|slice(?:s)?|handfuls?|sprig(?:s)?|leaves|clove(?:s)?|sticks?|thumbs?|drops?"
NUMBER = r"(?:\d+\s+\d+\s*/\s*\d+|\d+\s*/\s*\d+|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚]|\d+(?:\.\d+)?|\.\d+)"
MEASURE_RE = re.compile(r"^\s*(?P<amount>" + NUMBER + r"(?:\s*[-–]\s*" + NUMBER + r")?)\s*(?P<unit>" + UNITS + r")\b\s*(?P<name>.*)$", re.I)
BARE_NUMBER_RE = re.compile(r"^\s*(?P<amount>" + NUMBER + r"(?:\s*[-–]\s*" + NUMBER + r")?)\s+(?P<name>.+)$", re.I)
SERVINGS_RE = re.compile(r"^\s*(?P<n>[1-9]\d*)\s*(?:servings?|cocktails?|drinks?|glasses?)\s*$", re.I)
BARE_SERVINGS_RE = re.compile(r"^\s*(?P<n>[1-9]\d*)\s*$")


def parse_ingredient(raw: str) -> tuple[dict, list[str]]:
    text = cc.clean_text(raw)
    top_up = bool(re.match(r"^fill\s+with\b", text, re.I))
    text = re.sub(r"^fill\s+with\s*,?\s*", "", text, flags=re.I)
    match = None if top_up else (MEASURE_RE.match(text) or BARE_NUMBER_RE.match(text))
    issues: list[str] = ["variable_quantity"] if top_up else []
    if match:
        amount = cc.clean_text(match.group("amount"))
        unit = cc.clean_text(match.groupdict().get("unit") or "") or None
        name = cc.clean_text(match.group("name")).strip(" ,.-") or None
    else:
        amount = unit = None
        name = text.strip(" ,.-") or None
    # A name is still useful for editorial review, but unknown quantity/unit is not guessed.
    if amount is None:
        issues.append("unknown_quantity")
    if name is None:
        issues.append("unknown_ingredient_name")
    if match and unit is None:
        issues.append("unknown_unit")
    return {"raw": raw, "name": name, "amount": amount, "unit": unit}, issues


def source_method(row: dict) -> str | None:
    text = cc.instruction_text(row).lower()
    hits = []
    for method, pattern in (("shake", r"\bshake|shaker"), ("stir", r"\bstir"),
                            ("blend", r"\bblend|puree"), ("hot", r"\b(?:warm|boil|simmer|heat)"),
                            ("batch", r"\bpitcher|\bbatch|\bpunch bowl")):
        if re.search(pattern, text):
            hits.append(method)
    if not hits and re.search(r"\b(?:pour|add|fill|layer|float)\b", text):
        hits.append("build")
    return hits[0] if len(set(hits)) == 1 else None


def servings(yield_text: str) -> int | None:
    match = SERVINGS_RE.match(yield_text)
    if match:
        return int(match.group("n"))
    # Mindful Mocktail uses a bare numeric yield; accept only a positive integer.
    match = BARE_SERVINGS_RE.match(yield_text)
    return int(match.group("n")) if match else None


def sql(value: object) -> str:
    if value is None:
        return "null"
    text = str(value).replace("'", "''")
    return "'" + text + "'"


def sql_json(value: object) -> str:
    return sql(json.dumps(value, ensure_ascii=False, separators=(",", ":"))) + "::jsonb"


def sql_array(values: list[str]) -> str:
    return "array[" + ",".join(sql(value) for value in values) + "]::text[]"


def write_sql(outdir: Path, rows: list[dict]) -> None:
    sql_dir = outdir / "sql"
    sql_dir.mkdir(exist_ok=True)
    for batch_no in range(0, len(rows), 500):
        batch = rows[batch_no:batch_no + 500]
        lines = [f"-- Essentials enrichment batch {batch_no // 500 + 1:03d}; draft/source/old-value guards.", "begin;"]
        for row in batch:
            sets = [f"ingredient_details = {sql_json(row['ingredient_details'])}", f"recipe_yield = {sql(row['recipe_yield'])}", f"servings = {sql(row['servings'])}", f"preparation_method = {sql(row['preparation_method'])}", f"recipe_quality_issues = {sql_array(row['recipe_quality_issues'])}", "strength = null", "sweetness = null", "has_caffeine = null", "allergens = null"]
            lines.append("update public.drinks set " + ", ".join(sets) +
                         f" where id = {sql(row['id'])} and source_url = {sql(row['source_url'])} and status = 'draft' and content_origin = 'allcheers_original_from_facts'" +
                         f" and ingredients = {sql_json(row['ingredients'])} and preparation = {sql_json(row['preparation'])}" +
                         " and ingredient_details is null and recipe_yield is null and servings is null and preparation_method is null and recipe_quality_issues is null" +
                         " and strength = 2 and sweetness = 5 and has_caffeine = false and allergens = '{}'::text[];")
        lines += ["commit;", ""]
        (sql_dir / f"enrich-{batch_no // 500 + 1:03d}.sql").write_text("\n".join(lines), encoding="utf-8", newline="\n")


def explicit_glassware(row: dict) -> str | None:
    text = cc.instruction_text(row)
    allowed = {"highball", "martini", "rocks", "wine", "coupe", "collins", "pint", "shot"}
    matches = re.findall(r"\b(?:in|into|serve in) (?:a|an|the) ([a-z][a-z -]{2,20}?)\s+glass\b", text, re.I)
    values = {cc.clean_text(m).lower() for m in matches}
    return next(iter(values)).title() + " glass" if len(values) == 1 and values <= allowed else None


def explicit_garnish(row: dict) -> str | None:
    text = cc.instruction_text(row)
    return None


def enrich(record: dict, source: dict) -> dict:
    details, ingredient_issues = [], set()
    for raw in record["ingredients"]:
        detail, bad = parse_ingredient(raw)
        details.append(detail)
        ingredient_issues.update(bad)
    method = source_method(source)
    inferred = record["method"]
    issues = ["template_preparation_needs_editorial_review", "source_classification_not_verified"]
    if ingredient_issues:
        issues.append("ambiguous_ingredient_quantity_or_unit")
        issues.extend(sorted(ingredient_issues))
    if method is None:
        issues.append("ambiguous_preparation_classification")
    if re.search(r"\b(?:soda|soda water|tonic|cola|ginger ale|sparkling|carbonated|kombucha|red bull|7[- ]up|sprite|beer|champagne|prosecco)\b", " ".join(record["ingredients"]), re.I) and inferred == "shake":
        issues.append("carbonation_plus_shake")
    return {
        "id": record["id"], "source_url": record["source_url"], "name": record["name"],
        "ingredients": record["ingredients"], "preparation": record["preparation"],
        "ingredient_details": details, "recipe_yield": cc.yield_text(source) or None,
        "servings": servings(cc.yield_text(source)), "preparation_method": method,
        "glassware": explicit_glassware(source), "garnish": explicit_garnish(source),
        "recipe_quality_issues": sorted(set(issues)),
    }


def run(inputs: tuple[Path, ...], outdir: Path) -> int:
    outdir.mkdir(parents=True, exist_ok=True)
    rows = []
    for path in inputs:
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            source = json.loads(line)
            _, record, _ = bc.transform(str(source.get("source") or "").strip().lower(), source)
            if record:
                rows.append(enrich(record, source))
    rows.sort(key=lambda row: row["id"])
    with (outdir / "enrichment.jsonl").open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
    counts = Counter(issue for row in rows for issue in row["recipe_quality_issues"])
    with (outdir / "review-queue.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["id", "source_url", "name", "issues"])
        writer.writeheader()
        for row in rows:
            writer.writerow({"id": row["id"], "source_url": row["source_url"], "name": row["name"], "issues": ";".join(row["recipe_quality_issues"])})
    write_sql(outdir, rows)
    (outdir / "summary.json").write_text(json.dumps({"accepted": len(rows), "issue_counts": dict(sorted(counts.items())), "null_servings": sum(row["servings"] is None for row in rows), "null_preparation_method": sum(row["preparation_method"] is None for row in rows)}, indent=2) + "\n", encoding="utf-8")
    print(f"accepted: {len(rows)}; review rows: {len(rows)}; output: {outdir}")
    return 0


def self_check() -> None:
    parsed, issues = parse_ingredient("1 1/2 oz. brand syrup")
    assert parsed["amount"] == "1 1/2" and parsed["unit"] == "oz" and not issues
    parsed, issues = parse_ingredient("Fill with, 1/2 7-up")
    assert parsed["amount"] is None and parsed["name"] == "1/2 7-up" and "variable_quantity" in issues
    parsed, issues = parse_ingredient("1 / 2 lime juice")
    assert parsed["amount"] == "1 / 2" and parsed["name"] == "lime juice" and issues == ["unknown_unit"]
    assert servings("") is None and servings("0") is None and servings("1 pitcher") is None
    assert servings("2 servings") == 2


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-check", action="store_true")
    parser.add_argument("--outdir", default=str(DEFAULT_OUT))
    parser.add_argument("--inputs", nargs="+", default=[str(path) for path in DEFAULT_INPUTS])
    args = parser.parse_args()
    if args.self_check:
        self_check()
        print("PASS: essentials self-check")
    else:
        raise SystemExit(run(tuple(Path(path) for path in args.inputs), Path(args.outdir)))
