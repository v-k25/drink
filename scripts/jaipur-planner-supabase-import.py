#!/usr/bin/env python3
"""Prepare and guardedly import the Jaipur planner catalogue through Supabase REST.

The default command is read-only preparation. ``--verify`` is read-only against
the target table. ``--import`` is the only mode that can POST, and only after a
complete empty-target preflight. The secret key is read privately and is never
printed or sent as an Authorization header.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener


ROOT = Path(__file__).resolve().parents[1]
EXTRACTOR_PATH = ROOT / "scripts" / "jaipur-planner-catalogue.py"
WORKBOOK = ROOT / "output" / "Jaipur_City_Product_Database.xlsx"
BUNDLED_JSON = ROOT / "app" / "party-planner" / "catalogue.json"
MOVE_DIR = ROOT / "output" / "jaipur-supabase-move"
PAYLOAD_PATH = MOVE_DIR / "planner-products-payload.json"
IDS_PATH = MOVE_DIR / "planner-products-expected-ids.txt"
EVIDENCE_PATH = MOVE_DIR / "prepare-evidence.json"
READBACK_PATH = MOVE_DIR / "planner-products-readback.json"
SCHEMA_PATH = MOVE_DIR / "schema.sql"
PROJECT_URL = "https://ojptrukzildmkilwponx.supabase.co"
TABLE_PATH = "/rest/v1/planner_products"
EXPECTED_ROWS = 1638
EXPECTED_OTHER = 227
SOURCE_NAME = "Rajasthan excise approved rate list"
SOURCE_STATE = "Rajasthan"
SOURCE_YEAR = "2026-27"
SOURCE_PRICE_TYPE = "Official MRP"
SOURCE_NOTE = "Official Rajasthan excise MRP; stock availability was not verified."
SOURCE_URL = "https://iems.rajasthan.gov.in/ApprovedRateList/ApprovedRateList/ApprovedRateGridList?type=0"


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, file, code, msg, headers, newurl):
        return None


HTTP = build_opener(NoRedirect)


def load_extractor():
    spec = importlib.util.spec_from_file_location("jaipur_catalogue_extractor", EXTRACTOR_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load extractor: {EXTRACTOR_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_env_file() -> None:
    env_path = ROOT / ".env.local"
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key and key not in os.environ:
            os.environ[key] = value.strip().strip('"').strip("'")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def prepare_payload() -> tuple[list[dict[str, object]], dict[str, object]]:
    module = load_extractor()
    catalogue, source_categories, output_categories = module.extract(WORKBOOK)
    rendered = json.dumps(catalogue, ensure_ascii=False, indent=2) + "\n"
    if not BUNDLED_JSON.exists() or BUNDLED_JSON.read_text(encoding="utf-8") != rendered:
        raise ValueError("Existing catalogue.json does not exactly match the workbook extractor output")
    if len(catalogue) != EXPECTED_ROWS or len({row["id"] for row in catalogue}) != EXPECTED_ROWS:
        raise ValueError("Catalogue does not contain exactly 1,638 unique products")
    if output_categories["Other / Unclassified"] != EXPECTED_OTHER:
        raise ValueError("Catalogue does not retain exactly 227 Other / Unclassified products")

    prices = {row["Product ID"]: row for row in module.workbook_rows(WORKBOOK, "City Prices")}
    payload: list[dict[str, object]] = []
    for product in catalogue:
        price = prices.get(product["id"])
        if price is None:
            raise ValueError(f"Missing City Prices row for {product['id']}")
        if price.get("Official Source URL") != SOURCE_URL or price.get("Excise / Price Year") != SOURCE_YEAR:
            raise ValueError(f"Unexpected source metadata for {product['id']}")
        payload.append({
            "id": product["id"],
            "category": product["category"],
            "name": product["name"],
            "brand": product["brand"],
            "size_ml": product["sizeMl"],
            "price_paise": product["pricePaise"],
            "city": "Jaipur",
            "source_name": SOURCE_NAME,
            "source_state": SOURCE_STATE,
            "source_year": SOURCE_YEAR,
            "source_price_type": SOURCE_PRICE_TYPE,
            "source_url": SOURCE_URL,
            "source_note": SOURCE_NOTE,
        })
    payload_bytes = (json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
    ids_bytes = ("\n".join(sorted(str(row["id"]) for row in payload)) + "\n").encode("utf-8")
    MOVE_DIR.mkdir(parents=True, exist_ok=True)
    existing_evidence: dict[str, object] = {}
    if EVIDENCE_PATH.exists():
        try:
            existing_evidence = json.loads(EVIDENCE_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            raise ValueError("Existing preparation evidence is not valid JSON; refusing to overwrite it") from error
        if existing_evidence.get("payload_sha256") not in (None, sha256_bytes(payload_bytes)):
            raise ValueError("Existing preparation evidence belongs to a different payload; refusing to overwrite it")
    if PAYLOAD_PATH.exists() and PAYLOAD_PATH.read_bytes() != payload_bytes:
        raise ValueError("Existing payload differs from the deterministic payload; refusing to overwrite it")
    if IDS_PATH.exists() and IDS_PATH.read_bytes() != ids_bytes:
        raise ValueError("Existing expected IDs differ from the deterministic IDs; refusing to overwrite them")
    if not PAYLOAD_PATH.exists():
        PAYLOAD_PATH.write_bytes(payload_bytes)
    if not IDS_PATH.exists():
        IDS_PATH.write_bytes(ids_bytes)
    evidence = {
        "project_url": PROJECT_URL,
        "table": "public.planner_products",
        "row_count": len(payload),
        "other_unclassified_count": output_categories["Other / Unclassified"],
        "reclassified_count": source_categories["Other / Unclassified"] - output_categories["Other / Unclassified"],
        "payload_sha256": sha256_bytes(payload_bytes),
        "ids_sha256": sha256_bytes(ids_bytes),
        "catalogue_sha256": sha256_bytes(rendered.encode("utf-8")),
        "workbook_sha256": sha256_bytes(WORKBOOK.read_bytes()),
        "source": {"name": SOURCE_NAME, "state": SOURCE_STATE, "year": SOURCE_YEAR, "price_type": SOURCE_PRICE_TYPE, "url": SOURCE_URL, "note": SOURCE_NOTE},
        "baseline": {"recipes_count": 9462, "recipes_hash": "54575d121506d7ad163ec84120aedcaf", "party_plans_count": 0, "party_plans_hash": "d41d8cd98f00b204e9800998ecf8427e", "planner_products_present": False},
        "write_performed": bool(existing_evidence.get("write_performed", False)),
    }
    for key in ("verification", "import"):
        if key in existing_evidence:
            evidence[key] = existing_evidence[key]
    EVIDENCE_PATH.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    return payload, evidence


def config() -> tuple[str, str, str]:
    load_env_file()
    base = os.environ.get("SUPABASE_URL", "").rstrip("/")
    anon = os.environ.get("SUPABASE_ANON_KEY", "")
    secret = os.environ.get("SUPABASE_SECRET_KEY", "")
    if base != PROJECT_URL:
        raise ValueError("SUPABASE_URL does not match the expected Jaipur project")
    if not secret.startswith("sb_secret_"):
        raise ValueError("SUPABASE_SECRET_KEY is missing or is not an sb_secret_ key")
    if not anon:
        raise ValueError("SUPABASE_ANON_KEY is missing")
    return base, anon, secret


def rest_get(base: str, key: str, start: int, end: int) -> tuple[int, object, str]:
    request = Request(base + TABLE_PATH + "?select=*&order=id.asc", headers={"apikey": key, "Range": f"{start}-{end}", "Prefer": "count=exact"})
    try:
        with HTTP.open(request, timeout=20) as response:
            body = response.read()
            return response.status, json.loads(body) if body else None, response.headers.get("Content-Range", "")
    except HTTPError as error:
        body = error.read()
        return error.code, json.loads(body) if body else None, error.headers.get("Content-Range", "")
    except URLError as error:
        raise RuntimeError(f"Supabase request failed: {error.reason}") from error


def read_all(base: str, key: str) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    start = 0
    page_size = 1000
    expected_total: int | None = None
    while True:
        status, body, content_range = rest_get(base, key, start, start + page_size - 1)
        if status not in (200, 206) or not isinstance(body, list) or any(not isinstance(row, dict) for row in body):
            raise RuntimeError(f"Supabase planner_products read failed with HTTP {status}")
        if content_range == "*/0":
            if start == 0 and not rows and not body:
                return []
            raise RuntimeError("Supabase planner_products returned an invalid empty Content-Range")
        if "/" not in content_range or "-" not in content_range.split("/", 1)[0]:
            raise RuntimeError("Supabase planner_products response had an invalid Content-Range")
        interval, total_text = content_range.split("/", 1)
        try:
            first_text, last_text = interval.split("-", 1)
            first, last, total = int(first_text), int(last_text), int(total_text)
        except ValueError as error:
            raise RuntimeError("Supabase planner_products response had a non-integer Content-Range") from error
        if total < 0 or total > EXPECTED_ROWS or first != start or (body and last - first + 1 != len(body)):
            raise RuntimeError("Supabase planner_products response range does not match the requested page")
        if not body and len(rows) < total:
            raise RuntimeError("Supabase planner_products pagination returned an empty incomplete page")
        if expected_total is None:
            expected_total = total
        elif total != expected_total:
            raise RuntimeError("Supabase planner_products total changed during pagination")
        rows.extend(body)
        if len(rows) > total:
            raise RuntimeError("Supabase planner_products pagination exceeded its declared total")
        if len(rows) >= total:
            break
        start += len(body)
        if start > EXPECTED_ROWS + page_size or (start >= total and len(rows) < total):
            raise RuntimeError("Supabase planner_products pagination did not terminate")
    return rows


def reconcile(expected: list[dict[str, object]], actual: list[dict[str, object]]) -> None:
    expected_sorted = sorted(expected, key=lambda row: str(row["id"]))
    actual_sorted = sorted(actual, key=lambda row: str(row.get("id", "")))
    if actual_sorted != expected_sorted:
        raise RuntimeError("Supabase planner_products readback differs in count, IDs, fields, or metadata")


def post_once(base: str, secret: str, payload: list[dict[str, object]]) -> tuple[int, object]:
    request = Request(base + TABLE_PATH, method="POST", data=json.dumps(payload, ensure_ascii=False).encode("utf-8"), headers={"apikey": secret, "Content-Type": "application/json", "Prefer": "return=minimal"})
    try:
        with HTTP.open(request, timeout=60) as response:
            body = response.read()
            return response.status, json.loads(body) if body else None
    except HTTPError as error:
        body = error.read()
        return error.code, json.loads(body) if body else None


def verify_or_import(mode: str, payload: list[dict[str, object]]) -> None:
    base, anon, secret = config()
    anonymous_status, _, _ = rest_get(base, anon, 0, 999)
    if anonymous_status not in (401, 403):
        raise RuntimeError("Anonymous planner_products GET was allowed")
    rows = read_all(base, secret)
    if rows:
        try:
            reconcile(payload, rows)
        except RuntimeError:
            raise RuntimeError("Target is non-empty and does not exactly match the prepared payload; aborting")
        READBACK_PATH.write_text(json.dumps(rows, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        evidence = json.loads(EVIDENCE_PATH.read_text(encoding="utf-8"))
        evidence["verification"] = {"anonymous_status": anonymous_status, "readback_count": len(rows), "readback_sha256": sha256_bytes(READBACK_PATH.read_bytes()), "exact_match": True}
        EVIDENCE_PATH.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
        print("PASS: existing planner_products exactly matches payload; verify-only")
        return
    if mode == "verify":
        raise RuntimeError("planner_products is empty; --verify requires an imported dataset")
    status, _ = post_once(base, secret, payload)
    if status not in (200, 201):
        raise RuntimeError(f"planner_products import failed with HTTP {status}")
    evidence = json.loads(EVIDENCE_PATH.read_text(encoding="utf-8"))
    evidence["write_performed"] = True
    evidence["import"] = {"anonymous_status": anonymous_status, "post_status": status, "write_performed": True, "readback_pending": True}
    EVIDENCE_PATH.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    final_rows = read_all(base, secret)
    reconcile(payload, final_rows)
    READBACK_PATH.write_text(json.dumps(final_rows, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    evidence["import"] = {"anonymous_status": anonymous_status, "post_status": status, "readback_count": len(final_rows), "readback_sha256": sha256_bytes(READBACK_PATH.read_bytes()), "exact_match": True, "write_performed": True}
    EVIDENCE_PATH.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print("PASS: atomic planner_products insert and complete paginated readback reconciled")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--prepare", action="store_true", help="write local schema, payload, IDs and evidence (default)")
    modes.add_argument("--verify", action="store_true", help="read-only verify target and anonymous denial")
    modes.add_argument("--import", dest="do_import", action="store_true", help="guarded single POST after empty-target precheck")
    args = parser.parse_args()
    payload, _ = prepare_payload()
    if args.verify or args.do_import:
        verify_or_import("import" if args.do_import else "verify", payload)
    else:
        print(f"PASS: prepared {len(payload)} products, schema, expected IDs and evidence; no live write")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
