#!/usr/bin/env python3
"""Guarded importer for the isolated updated Jaipur candidate table.

The default mode verifies the deterministic local source only. ``--verify`` is
read-only. ``--import`` sends exactly one POST only when the candidate table is
entirely empty, then reconciles every returned row. Credentials are read from
``.env.local`` and are never printed. ``--verify-live`` is a separate
read-only reconciliation of the cut-over live table.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener


ROOT = Path(__file__).resolve().parents[1]
PREPARE_PATH = ROOT / "scripts" / "jaipur-planner-updated-prepare.py"
OUTPUT_DIR = ROOT / "output" / "jaipur-replacement-1311"
EVIDENCE_PATH = OUTPUT_DIR / "candidate-verification.json"
LIVE_EVIDENCE_PATH = OUTPUT_DIR / "live-verification.json"
PROJECT_URL = "https://ojptrukzildmkilwponx.supabase.co"
TABLE_PATH = "/rest/v1/planner_products_candidate_20261004"
LIVE_TABLE_PATH = "/rest/v1/planner_products"
EXPECTED_ROWS = 1311
PAGE_SIZE = 1000
CONTENT_RANGE = re.compile(r"(\d+)-(\d+)/(\d+)\Z")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, file, code, msg, headers, newurl):
        return None


HTTP = build_opener(NoRedirect)


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def load_prepare_module():
    spec = importlib.util.spec_from_file_location("jaipur_updated_prepare", PREPARE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load the deterministic updated-workbook preparer")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def prepared_source() -> tuple[list[dict[str, object]], dict[str, object]]:
    """Load the source dynamically and fail before any network operation on drift."""
    module = load_prepare_module()
    payload, manifest = module.prepare()
    module.verify_artifacts(payload, manifest)
    rendered = module.render(payload)
    if len(payload) != EXPECTED_ROWS or manifest.get("row_count") != EXPECTED_ROWS:
        raise ValueError("Prepared source does not contain exactly 1,311 rows")
    if manifest.get("payload_sha256") != sha256_bytes(rendered):
        raise ValueError("Prepared manifest payload hash does not match the deterministic payload")
    if not isinstance(manifest.get("source_semantics"), dict):
        raise ValueError("Prepared manifest source semantics are missing")
    if any(not isinstance(row, dict) for row in payload):
        raise ValueError("Prepared payload has an invalid row")
    expected = sorted(payload, key=lambda row: str(row.get("id", "")))
    ids = [row.get("id") for row in expected]
    if expected != payload or len(set(ids)) != EXPECTED_ROWS or any(not isinstance(identifier, str) for identifier in ids):
        raise ValueError("Prepared payload IDs are not unique ascending strings")
    return payload, manifest


def read_api_keys() -> tuple[str, str]:
    env_path = ROOT / ".env.local"
    if not env_path.is_file():
        raise ValueError("Required private .env.local file is missing")
    anon = ""
    secret = ""
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() == "SUPABASE_ANON_KEY":
            anon = value.strip().strip('"').strip("'")
        elif key.strip() == "SUPABASE_SECRET_KEY":
            secret = value.strip().strip('"').strip("'")
    if not anon:
        raise ValueError("SUPABASE_ANON_KEY is missing")
    if not secret.startswith("sb_secret_"):
        raise ValueError("SUPABASE_SECRET_KEY is missing or is not an sb_secret_ key")
    return anon, secret


def request_get(key: str | None, start: int, end: int, table_path: str = TABLE_PATH) -> tuple[int, object, str]:
    headers = {"Range": f"{start}-{end}", "Prefer": "count=exact"}
    if key is not None:
        headers["apikey"] = key
    request = Request(PROJECT_URL + table_path + "?select=*&order=id.asc", headers=headers)
    try:
        with HTTP.open(request, timeout=20) as response:
            body = response.read()
            return response.status, json.loads(body) if body else None, response.headers.get("Content-Range", "")
    except HTTPError as error:
        body = error.read()
        try:
            parsed = json.loads(body) if body else None
        except json.JSONDecodeError:
            parsed = None
        return error.code, parsed, error.headers.get("Content-Range", "")
    except URLError as error:
        raise RuntimeError("Candidate-table request failed") from error


def parse_page(content_range: str, start: int, body: object) -> tuple[list[dict[str, object]], int]:
    if content_range == "*/0":
        if start == 0 and body == []:
            return [], 0
        raise RuntimeError("Candidate-table response has an invalid empty Content-Range")
    match = CONTENT_RANGE.fullmatch(content_range)
    if match is None or not isinstance(body, list) or any(not isinstance(row, dict) for row in body):
        raise RuntimeError("Candidate-table response has an invalid Content-Range or JSON body")
    first, last, total = (int(value) for value in match.groups())
    if total <= 0 or total > EXPECTED_ROWS or first != start or last < first or last - first + 1 != len(body):
        raise RuntimeError("Candidate-table response range does not match its requested page")
    return body, total


def read_all(secret: str, table_path: str = TABLE_PATH, table_label: str = "Candidate-table") -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    expected_total: int | None = None
    start = 0
    while True:
        status, body, content_range = request_get(secret, start, start + PAGE_SIZE - 1, table_path)
        if status not in (200, 206):
            raise RuntimeError(f"{table_label} read failed with HTTP {status}")
        try:
            page, total = parse_page(content_range, start, body)
        except RuntimeError as error:
            raise RuntimeError(str(error).replace("Candidate-table", table_label)) from error
        if total == 0:
            return []
        if expected_total is None:
            expected_total = total
        elif total != expected_total:
            raise RuntimeError(f"{table_label} total changed during pagination")
        if not page or len(rows) + len(page) > total:
            raise RuntimeError(f"{table_label} pagination is incomplete or exceeded its declared total")
        rows.extend(page)
        if len(rows) == total:
            return rows
        start += len(page)


def reconcile(expected: list[dict[str, object]], actual: list[dict[str, object]]) -> None:
    if len(actual) != EXPECTED_ROWS or actual != expected:
        raise RuntimeError("Candidate-table readback differs in count, order, IDs, fields, or metadata")


def post_once(secret: str, payload: list[dict[str, object]]) -> int:
    # This importer is permanently write-scoped to the isolated candidate route.
    request = Request(
        PROJECT_URL + TABLE_PATH,
        method="POST",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"apikey": secret, "Content-Type": "application/json", "Prefer": "return=minimal"},
    )
    try:
        with HTTP.open(request, timeout=60) as response:
            response.read()
            return response.status
    except HTTPError as error:
        error.read()
        return error.code
    except URLError as error:
        raise RuntimeError("Candidate-table import request failed") from error


def write_evidence(
    manifest: dict[str, object],
    anonymous_status: int,
    *,
    rows: list[dict[str, object]] | None = None,
    post_status: int | None = None,
    readback_pending: bool = False,
) -> None:
    prior: dict[str, object] = {}
    if EVIDENCE_PATH.exists():
        try:
            prior = json.loads(EVIDENCE_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            raise ValueError("Existing candidate verification evidence is invalid; refusing to overwrite it") from error
        if prior.get("payload_sha256") != manifest["payload_sha256"] or prior.get("table") != "public.planner_products_candidate_20261004":
            raise ValueError("Existing candidate verification evidence belongs to a different target or payload")
    wrote_now = post_status in (200, 201)
    wrote_before = prior.get("write_performed") is True
    write_performed = wrote_now or wrote_before
    preserved_post_status = prior.get("post_status") if wrote_before else None
    evidence = {
        "project_url": PROJECT_URL,
        "table": "public.planner_products_candidate_20261004",
        "payload_sha256": manifest["payload_sha256"],
        "row_count": EXPECTED_ROWS,
        "anonymous_get_status": anonymous_status,
        "post_status": post_status if wrote_now else preserved_post_status,
        "write_performed": write_performed,
        "readback_pending": readback_pending,
    }
    if rows is not None:
        evidence["readback_sha256"] = sha256_bytes(json.dumps(rows, ensure_ascii=False, indent=2, sort_keys=True).encode("utf-8"))
        evidence["exact_row_by_row_match"] = True
    EVIDENCE_PATH.write_text(json.dumps(evidence, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_live_evidence(manifest: dict[str, object], anonymous_status: int, rows: list[dict[str, object]]) -> None:
    """Write only successful, non-sensitive live reconciliation evidence."""
    evidence = {
        "anonymous_get_status": anonymous_status,
        "exact_row_by_row_match": True,
        "payload_sha256": manifest["payload_sha256"],
        "readback_sha256": sha256_bytes(json.dumps(rows, ensure_ascii=False, indent=2, sort_keys=True).encode("utf-8")),
        "row_count": EXPECTED_ROWS,
        "table": "public.planner_products",
    }
    LIVE_EVIDENCE_PATH.write_text(json.dumps(evidence, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def verify_or_import(do_import: bool, payload: list[dict[str, object]], manifest: dict[str, object]) -> None:
    anon, secret = read_api_keys()
    anonymous_status, _, _ = request_get(anon, 0, PAGE_SIZE - 1)
    if anonymous_status not in (401, 403):
        raise RuntimeError("Anonymous candidate-table GET was allowed")
    rows = read_all(secret)
    if rows:
        reconcile(payload, rows)
        write_evidence(manifest, anonymous_status, rows=rows)
        print("PASS: existing candidate table exactly matches the prepared payload; verify-only")
        return
    if not do_import:
        raise RuntimeError("Candidate table is empty; --verify requires an imported candidate dataset")
    post_status = post_once(secret, payload)
    if post_status not in (200, 201):
        raise RuntimeError(f"Candidate-table import failed with HTTP {post_status}")
    write_evidence(manifest, anonymous_status, post_status=post_status, readback_pending=True)
    final_rows = read_all(secret)
    reconcile(payload, final_rows)
    write_evidence(manifest, anonymous_status, rows=final_rows)
    print("PASS: one candidate-table POST and full paginated readback reconciled")


def verify_live(payload: list[dict[str, object]], manifest: dict[str, object]) -> None:
    """Reconcile live rows without exposing a write-capable route."""
    anon, secret = read_api_keys()
    anonymous_status, _, _ = request_get(anon, 0, PAGE_SIZE - 1, LIVE_TABLE_PATH)
    if anonymous_status not in (401, 403):
        raise RuntimeError("Anonymous live-table GET was allowed")
    rows = read_all(secret, LIVE_TABLE_PATH, "Live-table")
    reconcile(payload, rows)
    write_live_evidence(manifest, anonymous_status, rows)
    print("PASS: live table exactly matches the prepared payload; read-only verification")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--verify", action="store_true", help="read-only candidate verification")
    modes.add_argument("--verify-live", action="store_true", help="read-only live-table verification")
    modes.add_argument("--import", dest="do_import", action="store_true", help="guarded single POST to an empty candidate table")
    args = parser.parse_args()
    payload, manifest = prepared_source()
    if args.verify_live:
        verify_live(payload, manifest)
    elif args.verify or args.do_import:
        verify_or_import(args.do_import, payload, manifest)
    else:
        print(f"PASS: deterministic 1,311-row source and manifest verified; no network request or write")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
