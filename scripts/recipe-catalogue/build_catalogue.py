#!/usr/bin/env python3
"""Deterministic, copyright-safe recipe transformation/import-preparation
pipeline for the AllCheers drinks catalogue.

Reads the two authorized extraction exports (DrinkNation and Mindful Mocktail
JSON-LD), screens every record, classifies each accepted record, generates
AllCheers-owned descriptions and preparation steps from the finite template
set in catalogue_core, and emits deterministic compact SQL/JSON import
batches plus a summary and an explicit rejection report.

Copyright-safety contract (enforced here and independently verified by
validate_catalogue.py):

- Retained fields are factual only: the recipe name, verbatim ingredient
  strings (HTML-entity unescaped, whitespace normalised), yield/time facts
  and the source URL/retrieval timestamp.
- Source descriptions, source instruction wording, images, ratings,
  nutrition and author fields are never carried into generated rows. They are
  read only as classification and safety-screening signals.
- Generated wording comes exclusively from the finite template set plus
  structured facts. No run of six consecutive words from any generated
  description or preparation step may appear in that record's source prose.
- Generated rows are status=draft with full provenance
  (source_name/source_url/source_retrieved_at/content_origin) and
  classification (alcohol_type/method/base_spirit/category).

Stdlib-only; no new dependencies. Artifacts are byte-identical across runs:
no runtime timestamps or absolute paths are written. All records are
processed — no sampling.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

import catalogue_core as cc

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUTS = (
    REPO_ROOT / "output" / "recipe-extract" / "drinknation-recipes.jsonl",
    REPO_ROOT / "output" / "recipe-extract" / "mindfulmocktail-recipes.jsonl",
)
DEFAULT_OUTDIR = REPO_ROOT / "tmp" / "recipe-catalogue" / "run-1"
BATCH_SIZE = 500
MIGRATION = "20260923_drink_provenance"

# Column list for the generated INSERT statements. Requires the provenance
# migration to be applied first; `method` is classification-only and is not
# stored in public.drinks.
SQL_COLUMNS = (
    "id", "name", "description", "category", "base_spirit", "ingredients",
    "preparation", "serving_temp", "prep_time_min", "status", "source_name",
    "source_url", "source_retrieved_at", "content_origin", "alcohol_type",
    "strength", "sweetness", "has_caffeine", "allergens",
)
# Exact public.drinks row projection (the accepted record minus `method`).
SQL_RECORD_FIELDS = SQL_COLUMNS
# Full pipeline record: SQL fields plus the classification-only method field.
ROW_FIELDS = SQL_COLUMNS + ("method",)

REQUIRED_ROW_KEYS = frozenset({
    "id", "name", "description", "category", "ingredients", "preparation",
    "serving_temp", "status", "source_name", "source_url",
    "source_retrieved_at", "content_origin", "alcohol_type",
    "strength", "sweetness", "has_caffeine", "allergens",
})
FORBIDDEN_ROW_KEYS = frozenset({
    "image", "image_url", "nutrition", "aggregateRating", "author",
    "datePublished", "recipeInstructions", "recipeCategory", "recipeYield",
    "scraped_at", "video", "keywords", "source_description",
    "source_instructions", "rating",
})

REJECTION_FIELDS = ("source", "source_url", "name", "reasons", "signals",
                    "input_line")


# --- Safety screening (rejection signals) ------------------------------------


def unsafe_signals(row: dict, name: str, ingredients: list[str]) -> list[str]:
    """Regex patterns from catalogue_core that matched name/ingredients/
    instructions. Pattern strings are pipeline vocabulary, not source text."""
    blob = " ".join([name, *ingredients, cc.instruction_text(row)])
    return [pattern.pattern for pattern in cc.UNSAFE_PATTERNS if pattern.search(blob)]


def non_beverage_reason(row: dict, name: str, ingredients: list[str]) -> str | None:
    categories = row.get("recipeCategory")
    items = categories if isinstance(categories, list) else ([categories] if categories else [])
    if any(str(cat).strip().lower() in cc.NON_BEVERAGE_CATEGORIES for cat in items):
        return "non_beverage_category"
    if any(pattern.search(name) for pattern in cc.NON_BEVERAGE_NAME_PATTERNS):
        return "non_beverage_name"
    if any(pattern.search(" ".join(ingredients)) for pattern in cc.NON_BEVERAGE_ING_PATTERNS):
        return "non_beverage_ingredient"
    return None


# --- Per-record transformation -------------------------------------------------


def ingredient_strings(row: dict) -> list[str]:
    raw = row.get("recipeIngredient")
    if raw is None:
        items: list = []
    elif isinstance(raw, list):
        items = raw
    else:
        items = [raw]
    return [cc.clean_text(str(item)) for item in items]


def transform(source_name: str, row: dict) -> tuple[str, dict | None, dict | None]:
    """Screen, classify and generate one record.

    Returns (stable_id, record, rejection) where exactly one of record and
    rejection is not None. stable_id is "" when it cannot be computed.
    """
    url = str(row.get("source_url") or "").strip()
    name = cc.clean_text(str(row.get("name") or ""))
    ings = ingredient_strings(row)
    retrieved = str(row.get("scraped_at") or "").strip()

    problems: list[str] = []
    if source_name not in cc.SOURCES:
        problems.append("unknown_source")
    if not url:
        problems.append("missing_source_url")
    if not name:
        problems.append("missing_name")
    if not ings:
        problems.append("missing_ingredients")
    if not retrieved:
        problems.append("missing_source_retrieved_at")

    sid = cc.stable_id(source_name, url) if source_name in cc.SOURCES and url else ""
    signals = unsafe_signals(row, name, ings)
    if signals:
        problems.append("unsafe_content")
    else:
        non_beverage = non_beverage_reason(row, name, ings)
        if non_beverage:
            problems.append(non_beverage)

    if problems:
        rejection = {
            "source": source_name,
            "source_url": url,
            "name": name,
            "reasons": problems,
            "signals": signals,
            "input_line": 0,
        }
        return sid, None, rejection

    alcohol_type = cc.SOURCES[source_name]["alcohol_type"]
    y_text = cc.yield_text(row)
    method = cc.classify_method(row, name, ings, y_text)
    base_spirit = cc.classify_base_spirit(ings, alcohol_type)
    category = cc.category_for(base_spirit, alcohol_type)
    ingredient_names = [n for n in (cc.ingredient_name(i) for i in ings) if n]
    source_6grams = (
        cc.ngrams(cc.clean_text(str(row.get("description") or "")))
        | cc.ngrams(cc.instruction_text(row))
    )
    description, _ = cc.build_description(
        sid, name, category, alcohol_type, method, ingredient_names, y_text,
        source_6grams,
    )
    record = {
        "id": sid,
        "name": name,
        "description": description,
        "category": category,
        "base_spirit": base_spirit,
        "ingredients": ings,
        "preparation": list(cc.PREP_TEMPLATES[method]),
        "serving_temp": "hot" if method == "hot" else "iced",
        "prep_time_min": cc.prep_time_minutes(row),
        "status": "draft",
        "method": method,
        "source_name": source_name,
        "source_url": url,
        "source_retrieved_at": retrieved,
        "content_origin": cc.CONTENT_ORIGIN,
        "alcohol_type": alcohol_type,
        # These editorial attributes are unknown in the source export. Keep
        # them explicit so database defaults cannot masquerade as facts.
        "strength": None,
        "sweetness": None,
        "has_caffeine": None,
        "allergens": None,
    }
    return sid, record, None


# --- Self-validation (results included in summary.json) ------------------------


def self_validate(accepted: list[dict], source_6grams: list[set[str]],
                 source_descriptions: list[str]) -> Counter:
    violations: Counter = Counter()
    for record, record_6grams, source_desc in zip(
            accepted, source_6grams, source_descriptions):
        keys = set(record)
        if keys - set(ROW_FIELDS):
            violations["unexpected_row_keys"] += 1
        if REQUIRED_ROW_KEYS - keys:
            violations["missing_required_fields"] += 1
        if FORBIDDEN_ROW_KEYS & keys:
            violations["forbidden_source_keys"] += 1
        if record["status"] != "draft":
            violations["status_not_draft"] += 1
        if record["content_origin"] != cc.CONTENT_ORIGIN:
            violations["content_origin_invalid"] += 1
        if record["alcohol_type"] not in cc.ALCOHOL_TYPES:
            violations["alcohol_type_invalid"] += 1
        if record["source_name"] not in cc.SOURCES:
            violations["source_name_invalid"] += 1
        if not record["source_url"] or not record["source_retrieved_at"]:
            violations["provenance_missing"] += 1
        if not record["description"] or not record["category"]:
            violations["description_or_category_missing"] += 1
        if not record["ingredients"] or not record["preparation"]:
            violations["ingredients_or_preparation_missing"] += 1
        if record["serving_temp"] not in ("iced", "hot"):
            violations["serving_temp_invalid"] += 1
        if record["method"] not in cc.METHODS:
            violations["method_invalid"] += 1
        elif record["preparation"] != list(cc.PREP_TEMPLATES[record["method"]]):
            violations["preparation_not_template"] += 1
        if source_desc and record["description"] == source_desc:
            violations["description_equals_source"] += 1
        generated = cc.ngrams(record["description"])
        for step in record["preparation"]:
            generated |= cc.ngrams(step)
        if generated & record_6grams:
            violations["generated_6gram_overlap"] += 1
    if len({record["id"] for record in accepted}) != len(accepted):
        violations["duplicate_ids_in_accepted"] += 1
    if len({record["source_url"] for record in accepted}) != len(accepted):
        violations["duplicate_urls_in_accepted"] += 1
    return violations


# --- Serialization ---------------------------------------------------------------


def sql_str(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def sql_json(value: list) -> str:
    payload = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return sql_str(payload) + "::jsonb"


def sql_values(record: dict) -> list[str]:
    return [
        sql_str(record["id"]),
        sql_str(record["name"]),
        sql_str(record["description"]),
        sql_str(record["category"]),
        sql_str(record["base_spirit"]) if record["base_spirit"] else "null",
        sql_json(record["ingredients"]),
        sql_json(record["preparation"]),
        sql_str(record["serving_temp"]),
        str(record["prep_time_min"]) if record["prep_time_min"] is not None else "null",
        sql_str(record["status"]),
        sql_str(record["source_name"]),
        sql_str(record["source_url"]),
        sql_str(record["source_retrieved_at"]),
        sql_str(record["content_origin"]),
        sql_str(record["alcohol_type"]),
        "null", "null", "null", "null",
    ]


def db_projection(record: dict) -> dict:
    """Exact public.drinks row shape (record minus the pipeline-only method)."""
    return {key: record[key] for key in SQL_RECORD_FIELDS}


def write_text(path: Path, text: str) -> None:
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)


def write_sql_batch(path: Path, batch_no: int, records: list[dict]) -> None:
    lines = [
        f"-- AllCheers recipe catalogue import batch {batch_no:03d} ({len(records)} rows).",
        "-- Generated by scripts/recipe-catalogue/build_catalogue.py from the two authorized",
        "-- extraction exports. Factual fields + AllCheers-generated wording only.",
        f"-- Apply only after migration {MIGRATION} (adds provenance/classification columns).",
        "set client_encoding = 'UTF8';",
        f"insert into public.drinks ({','.join(SQL_COLUMNS)}) values",
    ]
    for record in records:
        lines.append("(" + ",".join(sql_values(record)) + "),")
    # The final tuple must be bare (no trailing ';' or ',') so the statement
    # reads `values (...), (...)\non conflict (id) do nothing;` — a tuple line
    # terminating with ';' before the on-conflict clause is invalid PostgreSQL.
    lines[-1] = lines[-1][:-1]
    lines.append("on conflict (id) do nothing;")
    write_text(path, "\n".join(lines) + "\n")


def write_json_batch(path: Path, batch_no: int, records: list[dict]) -> None:
    payload = {"batch": batch_no, "rows": [db_projection(record) for record in records]}
    write_text(path, json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sorted_counts(counter: Counter) -> dict:
    return {key: counter[key] for key in sorted(counter)}


# --- Pipeline ----------------------------------------------------------------


def run(outdir: Path, inputs: tuple[Path, ...]) -> int:
    outdir.mkdir(parents=True, exist_ok=True)
    sql_dir = outdir / "sql"
    json_dir = outdir / "json"
    sql_dir.mkdir(exist_ok=True)
    json_dir.mkdir(exist_ok=True)

    accepted: list[dict] = []
    accepted_6grams: list[set[str]] = []
    accepted_source_descriptions: list[str] = []
    rejected: list[dict] = []
    seen_ids: set[str] = set()
    seen_urls: set[str] = set()
    input_stats: list[dict] = []
    per_source = {name: {"records": 0, "accepted": 0, "rejected": 0}
                  for name in sorted(cc.SOURCES)}
    per_source["unparsed"] = {"records": 0, "accepted": 0, "rejected": 0}
    total = 0

    for input_path in inputs:
        try:
            rel = input_path.resolve().relative_to(REPO_ROOT).as_posix()
        except ValueError:
            rel = input_path.resolve().as_posix()
        lines = 0
        with open(input_path, encoding="utf-8") as handle:
            for line_no, line in enumerate(handle, 1):
                line = line.strip()
                if not line:
                    continue
                lines += 1
                total += 1
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    rejected.append({"source": "", "source_url": "", "name": "",
                                     "reasons": ["invalid_json"], "signals": [],
                                     "input_line": line_no})
                    per_source["unparsed"]["records"] += 1
                    per_source["unparsed"]["rejected"] += 1
                    continue
                if not isinstance(row, dict):
                    rejected.append({"source": "", "source_url": "", "name": "",
                                     "reasons": ["invalid_json"], "signals": [],
                                     "input_line": line_no})
                    per_source["unparsed"]["records"] += 1
                    per_source["unparsed"]["rejected"] += 1
                    continue
                source_name = str(row.get("source") or "").strip().lower()
                if source_name in per_source:
                    bucket = per_source[source_name]
                else:
                    bucket = per_source["unparsed"]
                bucket["records"] += 1
                sid, record, rejection = transform(source_name, row)
                if record is None:
                    if sid and sid in seen_ids:
                        rejection["reasons"].append("duplicate_id")
                    if rejection["source_url"] and rejection["source_url"] in seen_urls:
                        rejection["reasons"].append("duplicate_url")
                    rejection["input_line"] = line_no
                    rejected.append(rejection)
                    bucket["rejected"] += 1
                    continue
                if sid in seen_ids or record["source_url"] in seen_urls:
                    collision = {"source": record["source_name"],
                                 "source_url": record["source_url"],
                                 "name": record["name"], "reasons": [],
                                 "signals": [], "input_line": line_no}
                    if sid in seen_ids:
                        collision["reasons"].append("duplicate_id")
                    if record["source_url"] in seen_urls:
                        collision["reasons"].append("duplicate_url")
                    rejected.append(collision)
                    bucket["rejected"] += 1
                    continue
                seen_ids.add(sid)
                seen_urls.add(record["source_url"])
                accepted.append(record)
                accepted_6grams.append(
                    cc.ngrams(cc.clean_text(str(row.get("description") or "")))
                    | cc.ngrams(cc.instruction_text(row))
                )
                accepted_source_descriptions.append(
                    cc.clean_text(str(row.get("description") or "")))
                bucket["accepted"] += 1
        input_stats.append({"input": rel, "lines": lines})

    # --- Self-validation ------------------------------------------------------
    violations = self_validate(accepted, accepted_6grams, accepted_source_descriptions)
    if violations:
        print("FAIL: self-validation found contract violations:", file=sys.stderr)
        for key, count in sorted(violations.items()):
            print(f"  {key}: {count}", file=sys.stderr)
        offending = [record["id"] for record, record_6grams in
                     zip(accepted, accepted_6grams)
                     if cc.ngrams(record["description"]) & record_6grams]
        if offending:
            print(f"  first offending ids: {offending[:10]}", file=sys.stderr)
        return 1

    # --- Artifacts --------------------------------------------------------------
    accepted_path = outdir / "accepted.jsonl"
    rejected_path = outdir / "rejected.jsonl"
    with open(accepted_path, "w", encoding="utf-8", newline="\n") as handle:
        for record in accepted:
            handle.write(json.dumps(record, ensure_ascii=False,
                                    separators=(",", ":")) + "\n")
    with open(rejected_path, "w", encoding="utf-8", newline="\n") as handle:
        for rejection in rejected:
            handle.write(json.dumps(rejection, ensure_ascii=False,
                                    separators=(",", ":")) + "\n")

    batches = [accepted[i:i + BATCH_SIZE] for i in range(0, len(accepted), BATCH_SIZE)]
    artifact_hashes: dict[str, str] = {
        "accepted.jsonl": sha256_file(accepted_path),
        "rejected.jsonl": sha256_file(rejected_path),
    }
    for batch_no, batch_records in enumerate(batches, 1):
        sql_path = sql_dir / f"import-{batch_no:03d}.sql"
        json_path = json_dir / f"import-{batch_no:03d}.json"
        write_sql_batch(sql_path, batch_no, batch_records)
        write_json_batch(json_path, batch_no, batch_records)
        artifact_hashes[f"sql/import-{batch_no:03d}.sql"] = sha256_file(sql_path)
        artifact_hashes[f"json/import-{batch_no:03d}.json"] = sha256_file(json_path)

    reason_counts: Counter = Counter()
    signal_counts: Counter = Counter()
    for rejection in rejected:
        for reason in rejection["reasons"]:
            reason_counts[reason] += 1
        for signal in rejection["signals"]:
            signal_counts[signal] += 1
    method_counts = Counter(record["method"] for record in accepted)
    category_counts = Counter(record["category"] for record in accepted)
    alcohol_counts = Counter(record["alcohol_type"] for record in accepted)
    serving_counts = Counter(record["serving_temp"] for record in accepted)

    summary = {
        "pipeline": "scripts/recipe-catalogue/build_catalogue.py",
        "migration": MIGRATION,
        "batch_size": BATCH_SIZE,
        "inputs": input_stats,
        "totals": {"records": total, "accepted": len(accepted), "rejected": len(rejected)},
        "per_source": per_source,
        "accepted_method_counts": sorted_counts(method_counts),
        "accepted_category_counts": sorted_counts(category_counts),
        "accepted_alcohol_type_counts": sorted_counts(alcohol_counts),
        "accepted_serving_temp_counts": sorted_counts(serving_counts),
        "rejection_reason_counts": sorted_counts(reason_counts),
        "rejection_signal_counts": sorted_counts(signal_counts),
        "forbidden_field_validation": {
            "forbidden_source_keys_absent": {"checked": len(accepted), "violations": violations["forbidden_source_keys"]},
            "description_not_source_description": {"checked": len(accepted), "violations": violations["description_equals_source"]},
            "generated_wording_6gram_clean": {"checked": len(accepted), "violations": violations["generated_6gram_overlap"]},
            "preparation_steps_from_templates": {"checked": len(accepted), "violations": violations["preparation_not_template"]},
            "all_rows_status_draft": {"checked": len(accepted), "violations": violations["status_not_draft"]},
            "provenance_fields_present": {"checked": len(accepted), "violations": violations["provenance_missing"]},
            "classification_fields_valid": {"checked": len(accepted), "violations": violations["alcohol_type_invalid"] + violations["content_origin_invalid"] + violations["method_invalid"]},
        },
        "artifact_hashes": artifact_hashes,
    }
    write_text(outdir / "summary.json",
               json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=False) + "\n")

    print(f"records: {total}  accepted: {len(accepted)}  rejected: {len(rejected)}")
    print(f"batches: {len(batches)} x {BATCH_SIZE} rows (last partial)")
    print(f"rejections: {dict(sorted(reason_counts.items()))}")
    print(f"artifacts: {outdir}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Deterministic AllCheers recipe catalogue import-preparation pipeline.")
    parser.add_argument("--outdir", default=str(DEFAULT_OUTDIR),
                        help="artifact output directory (default: tmp/recipe-catalogue/run-1)")
    parser.add_argument("--inputs", nargs="+", default=[str(p) for p in DEFAULT_INPUTS],
                        help="source JSONL exports (default: the two authorized extracts)")
    args = parser.parse_args()
    inputs = tuple(Path(p) for p in args.inputs)
    for input_path in inputs:
        if not input_path.is_file():
            print(f"FAIL: missing input file: {input_path}", file=sys.stderr)
            return 1
    return run(Path(args.outdir), inputs)


if __name__ == "__main__":
    raise SystemExit(main())
