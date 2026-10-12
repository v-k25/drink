#!/usr/bin/env python3
"""Independent validator for the AllCheers recipe catalogue artifacts.

Checks the generated artifacts against the copyright-safety and import
contract, independently of the builder's control flow:

1. Totals: every source record is accounted for (accepted + rejected, no
   sampling), and summary.json counts match the actual artifact contents.
2. Per-row structure: only contract fields present (no forbidden source
   fields such as images, ratings, nutrition, author, dates, source
   description/instructions), status=draft, full provenance and
   classification fields valid, serving/prep facts well-typed.
3. Generated wording provenance: every preparation step equals the finite
   fixed template set for the re-derived method, and every description is
   exactly one of the finite template instantiations for that record's
   facts (label, clause, ingredient-name prefixes, name, yield).
4. Six-word safety check: no run of six consecutive words from any generated
   description or preparation step appears in that record's source prose
   (description or instruction text).
5. Rejection report: every rejected record carries known reasons, rejected
   source URLs never appear among accepted rows, and the accepted/rejected
   dispositions match an independent re-derivation over all source records.
6. SQL/JSON batches: batch structure, column list, tuple counts, full ID
   coverage, description round-trip spot checks, and exact equality between
   the JSON batch rows and the accepted records.
7. Determinism: with --dir2, every artifact is byte-identical (SHA-256)
   across the two build runs.

The corpus-level six-gram intersection between generated wording and ALL
source prose is reported as a non-blocking audit metric (common method
phrases and factual names/quantities are not source-sentence reuse).

Stdlib-only; no new dependencies.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import catalogue_core as cc
import build_catalogue as bc

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUTS = bc.DEFAULT_INPUTS

REQUIRED_FIELDS = frozenset({
    "id", "name", "description", "category", "ingredients", "preparation",
    "serving_temp", "status", "source_name", "source_url",
    "source_retrieved_at", "content_origin", "alcohol_type",
    "strength", "sweetness", "has_caffeine", "allergens",
})
ALLOWED_FIELDS = REQUIRED_FIELDS | {"base_spirit", "prep_time_min", "method",
                                   "strength", "sweetness", "has_caffeine", "allergens"}
FORBIDDEN_FIELDS = frozenset({
    "image", "image_url", "nutrition", "aggregateRating", "author",
    "datePublished", "recipeInstructions", "recipeCategory", "recipeYield",
    "scraped_at", "video", "keywords", "source_description",
    "source_instructions", "rating", "prepTime", "cookTime", "totalTime",
})
ID_RE = re.compile(r"^(?:dn|mm)-[a-z0-9]+(?:-[a-z0-9]+)*$")
RETRIEVED_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}")
KNOWN_REASONS = frozenset({
    "unsafe_content", "non_beverage_category", "non_beverage_name",
    "non_beverage_ingredient", "duplicate_id", "duplicate_url",
    "missing_source_url", "missing_name", "missing_ingredients",
    "missing_source_retrieved_at", "unknown_source", "invalid_json",
})


def description_candidates(sid: str, name: str, alcohol_type: str, method: str,
                           ingredient_names: list[str], y_text: str) -> set[str]:
    """Every finite template instantiation possible for a record's facts."""
    label = "mocktail" if alcohol_type == "mocktail" else "cocktail"
    clause = cc.METHOD_CLAUSES[method]
    yield_part = cc.YIELD_SENTENCE.format(yield_value=y_text) if y_text else ""
    vi = cc.variant_index(sid)

    def assemble(core: str) -> str:
        return f"{core} {yield_part}" if yield_part else core

    candidates: set[str] = set()
    for count in (4, 2):
        if len(ingredient_names) < count:
            continue
        core = cc.DESC_VARIANTS[vi].format(
            label=label, ingredients=cc.join_names(ingredient_names[:count]),
            clause=clause, name=name,
        )
        candidates.add(assemble(core))
    core = cc.DESC_NO_INGREDIENTS.format(label=label, clause=clause)
    candidates.add(assemble(core))
    candidates.add(cc.DESC_BARE.format(label=label, clause=clause))
    return candidates


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Independent validator for the recipe catalogue artifacts.")
    parser.add_argument("--dir", required=True, help="artifact directory to validate")
    parser.add_argument("--dir2", help="second artifact directory for the determinism check")
    parser.add_argument("--inputs", nargs="+", default=[str(p) for p in DEFAULT_INPUTS])
    parser.add_argument("--results", help="optional path for a JSON results file")
    args = parser.parse_args()

    artifact_dir = Path(args.dir)
    inputs = tuple(Path(p) for p in args.inputs)
    failures: list[str] = []

    def check(condition: bool, message: str) -> bool:
        if condition:
            print(f"PASS: {message}")
        else:
            failures.append(message)
            print(f"FAIL: {message}")
        return condition

    # --- Load artifacts -------------------------------------------------------
    if not check(artifact_dir.is_dir(), f"artifact directory exists: {artifact_dir}"):
        return 1
    summary = json.loads((artifact_dir / "summary.json").read_text(encoding="utf-8"))
    accepted = [json.loads(line) for line in
                (artifact_dir / "accepted.jsonl").read_text(encoding="utf-8").splitlines()
                if line.strip()]
    rejected = [json.loads(line) for line in
                (artifact_dir / "rejected.jsonl").read_text(encoding="utf-8").splitlines()
                if line.strip()]
    sql_files = sorted((artifact_dir / "sql").glob("*.sql"))
    json_files = sorted((artifact_dir / "json").glob("*.json"))

    # --- Source recount ---------------------------------------------------------
    source_rows_by_url: dict[str, dict] = {}
    total = 0
    for input_path in inputs:
        with open(input_path, encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                total += 1
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if isinstance(row, dict):
                    source_rows_by_url[str(row.get("source_url") or "")] = row

    check(summary["totals"]["records"] == total,
          f"summary records {summary['totals']['records']} == source lines {total}")
    check(summary["totals"]["accepted"] == len(accepted),
          f"summary accepted {summary['totals']['accepted']} == accepted.jsonl rows {len(accepted)}")
    check(summary["totals"]["rejected"] == len(rejected),
          f"summary rejected {summary['totals']['rejected']} == rejected.jsonl rows {len(rejected)}")
    check(summary["totals"]["accepted"] + summary["totals"]["rejected"] == total,
          "accepted + rejected == total source records (no sampling)")

    # --- Per-row structure and forbidden fields ----------------------------------
    structural_failures: list[str] = []
    for record in accepted:
        rid = record.get("id", "?")
        keys = set(record)
        if not REQUIRED_FIELDS <= keys:
            structural_failures.append(f"{rid}: missing required fields")
        if keys - ALLOWED_FIELDS:
            structural_failures.append(f"{rid}: unexpected fields {sorted(keys - ALLOWED_FIELDS)}")
        if keys & FORBIDDEN_FIELDS:
            structural_failures.append(f"{rid}: forbidden source fields {sorted(keys & FORBIDDEN_FIELDS)}")
        if not ID_RE.match(str(record.get("id", ""))):
            structural_failures.append(f"{rid}: bad id format")
        if record.get("status") != "draft":
            structural_failures.append(f"{rid}: status is not draft")
        if record.get("content_origin") != cc.CONTENT_ORIGIN:
            structural_failures.append(f"{rid}: bad content_origin")
        if record.get("alcohol_type") not in cc.ALCOHOL_TYPES:
            structural_failures.append(f"{rid}: bad alcohol_type")
        for unknown in ("strength", "sweetness", "has_caffeine", "allergens"):
            if record.get(unknown) is not None:
                structural_failures.append(f"{rid}: {unknown} must remain null when unknown")
        if record.get("source_name") not in cc.SOURCES:
            structural_failures.append(f"{rid}: bad source_name")
        source_url = str(record.get("source_url", ""))
        if not source_url or source_url not in source_rows_by_url:
            structural_failures.append(f"{rid}: source_url missing or absent from inputs")
        if not RETRIEVED_RE.match(str(record.get("source_retrieved_at", ""))):
            structural_failures.append(f"{rid}: bad source_retrieved_at")
        if not isinstance(record.get("category"), str) or not record["category"]:
            structural_failures.append(f"{rid}: bad category")
        if not isinstance(record.get("base_spirit"), str) and record.get("base_spirit") is not None:
            structural_failures.append(f"{rid}: bad base_spirit")
        ingredients = record.get("ingredients")
        if (not isinstance(ingredients, list) or not ingredients
                or not all(isinstance(i, str) and i for i in ingredients)):
            structural_failures.append(f"{rid}: bad ingredients")
        preparation = record.get("preparation")
        if (not isinstance(preparation, list) or not preparation
                or not all(isinstance(s, str) and s for s in preparation)):
            structural_failures.append(f"{rid}: bad preparation")
        if record.get("serving_temp") not in ("iced", "hot"):
            structural_failures.append(f"{rid}: bad serving_temp")
        prep_time = record.get("prep_time_min")
        if prep_time is not None and (not isinstance(prep_time, int) or prep_time < 0):
            structural_failures.append(f"{rid}: bad prep_time_min")
        if not isinstance(record.get("description"), str) or not record["description"]:
            structural_failures.append(f"{rid}: missing description")
    check(not structural_failures,
          f"per-row structure/provenance/classification valid for all {len(accepted)} accepted rows"
          + ("" if not structural_failures else f" ({len(structural_failures)} problems)"))
    for problem in structural_failures[:20]:
        print(f"  {problem}")

    # --- Generated wording provenance (templates) and six-word safety ------------
    template_failures: list[str] = []
    ngram_failures: list[str] = []
    gen6_all: set[str] = set()
    for record in accepted:
        rid = record["id"]
        src_row = source_rows_by_url.get(record["source_url"], {})
        name = cc.clean_text(str(src_row.get("name") or ""))
        ings = bc.ingredient_strings(src_row)
        y_text = cc.yield_text(src_row)
        method = cc.classify_method(src_row, name, ings, y_text)
        if record.get("method") != method:
            template_failures.append(f"{rid}: method {record.get('method')!r} != re-derived {method!r}")
        if record["preparation"] != list(cc.PREP_TEMPLATES[method]):
            template_failures.append(f"{rid}: preparation steps are not the fixed template set")
        names = [n for n in (cc.ingredient_name(i) for i in ings) if n]
        candidates = description_candidates(rid, name, record["alcohol_type"],
                                            method, names, y_text)
        if record["description"] not in candidates:
            template_failures.append(f"{rid}: description is not a finite template instantiation")
        source_6grams = (
            cc.ngrams(cc.clean_text(str(src_row.get("description") or "")))
            | cc.ngrams(cc.instruction_text(src_row))
        )
        generated = cc.ngrams(record["description"])
        for step in record["preparation"]:
            generated |= cc.ngrams(step)
        gen6_all |= generated
        overlap = generated & source_6grams
        if overlap:
            ngram_failures.append(f"{rid}: {len(overlap)} six-word window(s) overlap source prose")
    check(not template_failures,
          f"generated wording only from finite templates for all {len(accepted)} rows"
          + ("" if not template_failures else f" ({len(template_failures)} problems)"))
    for problem in template_failures[:20]:
        print(f"  {problem}")
    check(not ngram_failures,
          f"no six-word window of generated wording appears in source prose for all {len(accepted)} rows"
          + ("" if not ngram_failures else f" ({len(ngram_failures)} problems)"))
    for problem in ngram_failures[:20]:
        print(f"  {problem}")

    # --- Rejection report ---------------------------------------------------------
    reason_failures: list[str] = []
    for rejection in rejected:
        if not isinstance(rejection.get("reasons"), list) or not rejection["reasons"]:
            reason_failures.append(f"rejected row without reasons: {rejection.get('source_url', '?')}")
        elif set(rejection["reasons"]) - KNOWN_REASONS:
            reason_failures.append(f"unknown reasons {sorted(set(rejection['reasons']) - KNOWN_REASONS)}")
    accepted_urls = {record["source_url"] for record in accepted}
    accepted_ids = {record["id"] for record in accepted}
    leaked_urls = [r.get("source_url") for r in rejected
                   if r.get("source_url") in accepted_urls]
    leaked_ids = [r.get("source_url") for r in rejected
                  if r.get("source") in cc.SOURCES
                  and cc.stable_id(r.get("source"), r.get("source_url", "")) in accepted_ids
                  and r.get("source_url") not in accepted_urls]
    if leaked_urls:
        reason_failures.append(f"{len(leaked_urls)} rejected source_url(s) also appear in accepted rows")
    if leaked_ids:
        reason_failures.append(f"{len(leaked_ids)} rejected stable id(s) also appear in accepted rows")
    check(not reason_failures,
          f"explicit rejection report valid for all {len(rejected)} rejected records"
          + ("" if not reason_failures else f" ({len(reason_failures)} problems)"))
    for problem in reason_failures[:20]:
        print(f"  {problem}")

    # --- Independent re-derivation of dispositions (all records) -------------------
    expected_accepted_ids: list[str] = []
    expected_rejected: list[tuple[str, frozenset]] = []
    seen_ids: set[str] = set()
    seen_urls: set[str] = set()
    for input_path in inputs:
        with open(input_path, encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    expected_rejected.append(("", frozenset({"invalid_json"})))
                    continue
                if not isinstance(row, dict):
                    expected_rejected.append(("", frozenset({"invalid_json"})))
                    continue
                source_name = str(row.get("source") or "").strip().lower()
                sid, record, rejection = bc.transform(source_name, row)
                if record is None:
                    if sid and sid in seen_ids:
                        rejection["reasons"].append("duplicate_id")
                    if rejection["source_url"] and rejection["source_url"] in seen_urls:
                        rejection["reasons"].append("duplicate_url")
                    expected_rejected.append((rejection["source_url"],
                                              frozenset(rejection["reasons"])))
                    continue
                if sid in seen_ids or record["source_url"] in seen_urls:
                    reasons = []
                    if sid in seen_ids:
                        reasons.append("duplicate_id")
                    if record["source_url"] in seen_urls:
                        reasons.append("duplicate_url")
                    expected_rejected.append((record["source_url"], frozenset(reasons)))
                    continue
                seen_ids.add(sid)
                seen_urls.add(record["source_url"])
                expected_accepted_ids.append(record["id"])
    check([record["id"] for record in accepted] == expected_accepted_ids,
          "all accepted records handled: accepted ids match independent re-derivation")
    actual_rejected = [(r.get("source_url", ""), frozenset(r.get("reasons", [])))
                       for r in rejected]
    check(actual_rejected == expected_rejected,
          "rejected dispositions (url + reasons) match independent re-derivation")

    # --- SQL batches ------------------------------------------------------------------
    expected_batches = [accepted[i:i + bc.BATCH_SIZE]
                        for i in range(0, len(accepted), bc.BATCH_SIZE)]
    check(len(sql_files) == len(expected_batches),
          f"sql batch count {len(sql_files)} == expected {len(expected_batches)}")
    sql_all_text = ""
    if len(sql_files) == len(expected_batches):
        tuple_total = 0
        sql_problems: list[str] = []
        col_list = ",".join(bc.SQL_COLUMNS)
        for batch_no, (path, expected_rows) in enumerate(zip(sql_files, expected_batches), 1):
            text = path.read_text(encoding="utf-8")
            sql_all_text += text
            if f"import batch {batch_no:03d}" not in text:
                sql_problems.append(f"{path.name}: wrong batch header")
            if "set client_encoding = 'UTF8';" not in text:
                sql_problems.append(f"{path.name}: missing client_encoding guard")
            if f"insert into public.drinks ({col_list}) values" not in text:
                sql_problems.append(f"{path.name}: wrong insert column list")
            if not text.rstrip().endswith("on conflict (id) do nothing;"):
                sql_problems.append(f"{path.name}: missing idempotent on-conflict clause")
            tuple_lines = [l for l in text.splitlines() if l.startswith("(")]
            # Statement shape must be `values (...), (...)\non conflict (id) do
            # nothing;`: comma-separated tuples with a bare final tuple, and the
            # on-conflict clause directly after the last tuple. A tuple line that
            # terminates with ';' before `on conflict` is the malformed shape
            # PostgreSQL rejects.
            semicolon_tuples = [l for l in tuple_lines if l.rstrip().endswith(";")]
            if semicolon_tuples:
                sql_problems.append(
                    f"{path.name}: {len(semicolon_tuples)} tuple line(s) terminate with ';' "
                    "before the on-conflict clause (malformed `;\\non conflict` shape)")
            elif tuple_lines and text.rstrip().endswith("on conflict (id) do nothing;"):
                if not tuple_lines[-1].rstrip().endswith(")"):
                    sql_problems.append(
                        f"{path.name}: final tuple does not terminate with ')' "
                        "before the on-conflict clause")
            tuple_total += len(tuple_lines)
            if len(tuple_lines) != len(expected_rows):
                sql_problems.append(f"{path.name}: {len(tuple_lines)} tuples != {len(expected_rows)} rows")
            for idx, row in enumerate(expected_rows):
                if idx % 200:
                    continue
                name_esc = row["name"].replace("'", "''")
                desc_esc = row["description"].replace("'", "''")
                needle = f"('{row['id']}','{name_esc}','{desc_esc}'"
                if needle not in text:
                    sql_problems.append(f"{path.name}: round-trip mismatch for {row['id']}")
        check(not sql_problems, "sql batch structure/round-trip valid" +
              ("" if not sql_problems else f" ({len(sql_problems)} problems)"))
        for problem in sql_problems[:20]:
            print(f"  {problem}")
        check(tuple_total == len(accepted),
              f"sql tuple total {tuple_total} == accepted rows {len(accepted)}")
        missing_ids = [record["id"] for record in accepted
                       if f"('{record['id']}'," not in sql_all_text]
        check(not missing_ids,
              f"all {len(accepted)} accepted ids present in sql batches"
              + ("" if not missing_ids else f" (missing {len(missing_ids)})"))

    # --- JSON batches --------------------------------------------------------------------
    check(len(json_files) == len(expected_batches),
          f"json batch count {len(json_files)} == expected {len(expected_batches)}")
    if len(json_files) == len(expected_batches):
        json_rows: list[dict] = []
        for path in json_files:
            payload = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(payload.get("rows"), list):
                failures.append(f"{path.name}: json batch has no rows array")
                continue
            json_rows.extend(payload["rows"])
        expected_projection = [bc.db_projection(record) for record in accepted]
        check(json_rows == expected_projection,
              "json batch rows exactly equal the accepted records (in order)")

    # --- Summary consistency ----------------------------------------------------------------
    hash_problems: list[str] = []
    for name, digest in summary["artifact_hashes"].items():
        path = artifact_dir / name
        if not path.is_file():
            hash_problems.append(f"missing hashed artifact: {name}")
        elif sha256_file(path) != digest:
            hash_problems.append(f"hash mismatch: {name}")
    actual_files = {"accepted.jsonl", "rejected.jsonl", "summary.json"}
    actual_files |= {f"sql/{p.name}" for p in sql_files}
    actual_files |= {f"json/{p.name}" for p in json_files}
    if set(summary["artifact_hashes"]) | {"summary.json"} != actual_files:
        hash_problems.append("hashed artifact set does not match directory contents")
    check(not hash_problems, "summary artifact hashes match actual files"
          + ("" if not hash_problems else f" ({len(hash_problems)} problems)"))
    for problem in hash_problems[:20]:
        print(f"  {problem}")

    rejected_reason_total = sum(len(r.get("reasons", [])) for r in rejected)
    check(sum(summary["rejection_reason_counts"].values()) == rejected_reason_total,
          f"summary rejection reason counts sum {sum(summary['rejection_reason_counts'].values())} == {rejected_reason_total}")
    check(sum(summary["accepted_method_counts"].values()) == len(accepted),
          "summary method counts sum == accepted rows")

    # --- Determinism (two runs) ---------------------------------------------------------------
    if args.dir2:
        dir2 = Path(args.dir2)
        canonical = sorted(actual_files - {"summary.json"} | {"summary.json"})
        det_problems: list[str] = []
        for name in canonical:
            path1 = artifact_dir / name
            path2 = dir2 / name
            if not path2.is_file():
                det_problems.append(f"missing in second run: {name}")
            elif sha256_file(path1) != sha256_file(path2):
                det_problems.append(f"hash differs across runs: {name}")
        check(not det_problems, f"determinism: all {len(canonical)} artifacts byte-identical across runs"
              + ("" if not det_problems else f" ({len(det_problems)} differ)"))
        for problem in det_problems[:20]:
            print(f"  {problem}")

    # --- Corpus audit (report-only) --------------------------------------------------------------
    global6: set[str] = set()
    for row in source_rows_by_url.values():
        global6 |= cc.ngrams(cc.clean_text(str(row.get("description") or "")))
        global6 |= cc.ngrams(cc.instruction_text(row))
    corpus_overlap = gen6_all & global6
    print(f"AUDIT: {len(corpus_overlap)} distinct six-word window(s) shared between generated "
          f"wording and any source prose (report-only; common method phrases and factual "
          f"names/quantities are not source-sentence reuse)")
    if corpus_overlap:
        print(f"AUDIT samples: {sorted(corpus_overlap)[:10]}")

    if failures:
        print(f"FAIL: {len(failures)} check(s) failed")
        return 1
    print("PASS: all catalogue validation checks passed")
    if args.results:
        results_path = Path(args.results)
        results_path.parent.mkdir(parents=True, exist_ok=True)
        with open(results_path, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(json.dumps({
                "status": "pass",
                "artifact_dir": str(artifact_dir),
                "accepted": len(accepted),
                "rejected": len(rejected),
                "source_records": total,
                "corpus_audit_sixgram_windows": len(corpus_overlap),
                "checks_passed": True,
            }, ensure_ascii=False, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
