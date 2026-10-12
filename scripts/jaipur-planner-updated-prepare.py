#!/usr/bin/env python3
"""Prepare-only validator for the updated Jaipur Livcheers workbook.

This utility makes deterministic review artifacts only.  It never writes SQL,
contacts a service, reads credentials, or modifies application data.
"""

from __future__ import annotations

import argparse
from collections import Counter
from datetime import date
from decimal import Decimal, InvalidOperation
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlparse
import xml.etree.ElementTree as ET
import zipfile


ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "output" / "Updated_Jaipur_City_Product_Database.xlsx"
OUTPUT_DIR = ROOT / "output" / "jaipur-replacement-1311"
PAYLOAD_PATH = OUTPUT_DIR / "planner-products-payload.json"
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"
EXPECTED_ROWS = 1311
EXPECTED_CATEGORIES = {
    "Beers": 107,
    "Blended Scotch": 51,
    "Brandy": 22,
    "Champagne": 10,
    "Gin": 84,
    "Liqueurs": 38,
    "Made in India Whisky": 228,
    "Ready to Drink": 23,
    "Red Wine": 168,
    "Rose Wine": 27,
    "Rum": 92,
    "Sake": 7,
    "Single Malts": 88,
    "Sparkling Wine": 39,
    "Tequila": 47,
    "Vodka": 152,
    "White Wine": 92,
    "World Whisky": 36,
}
EXPECTED_STATUSES = {"CATEGORY_ONLY_REVIEW": 1, "LIVE_RETRIEVED": 1310}
FLAGGED_ID = "JPR-E3EEB807D525"
EXPECTED_HEADERS = {
    "sku_id", "brand", "product_name", "category", "type", "size_label",
    "volume_ml", "jaipur_listed_price_inr", "currency", "country",
    "rating_out_of_5", "abv_percent", "tasting_note_excerpt", "product_url",
    "image_url", "photo_status", "source_product_id", "source_product_code",
    "city", "state", "checked_on", "price_kind", "record_status",
    "image_label_status", "source_image_url_reference_only",
    "commercial_permission_status", "placeholder_asset",
}
WORKSHEET_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
RELATIONSHIP_ID = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
ID_PATTERN = re.compile(r"JPR-[0-9A-F]{12}\Z")

SOURCE_NAME = "Livcheers Jaipur product listings"
SOURCE_PRICE_TYPE = "Livcheers Jaipur listed price"
SOURCE_NOTE = (
    "Website-listed Jaipur price; owner asserts manual price checks. "
    "Checked on 2026-10-03. Not an Official MRP; stock availability was not verified."
)
CATEGORY_ONLY_REVIEW_NOTE = " Category-only review; detail page was unavailable when checked."


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def cell_column(reference: str) -> str:
    return "".join(character for character in reference if character.isalpha())


def cell_text(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        return "".join(text.text or "" for text in cell.iter(WORKSHEET_NS + "t"))
    value = cell.find(WORKSHEET_NS + "v")
    raw = "" if value is None else value.text or ""
    if cell_type == "s":
        try:
            return shared_strings[int(raw)]
        except (IndexError, ValueError) as error:
            raise ValueError(f"Invalid shared-string cell value: {raw!r}") from error
    return raw


def workbook_rows(workbook: Path, sheet_name: str) -> list[dict[str, str]]:
    with zipfile.ZipFile(workbook) as archive:
        workbook_xml = ET.fromstring(archive.read("xl/workbook.xml"))
        rels_xml = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {item.attrib["Id"]: item.attrib["Target"].lstrip("/") for item in rels_xml}
        sheets = workbook_xml.find(WORKSHEET_NS + "sheets")
        sheet = next((item for item in sheets if item.attrib["name"] == sheet_name), None) if sheets is not None else None
        if sheet is None:
            raise ValueError(f"Missing worksheet: {sheet_name}")
        sheet_xml = ET.fromstring(archive.read(targets[sheet.attrib[RELATIONSHIP_ID]]))
        shared_strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared_strings = ["".join(text.text or "" for text in item.iter(WORKSHEET_NS + "t")) for item in shared_root]

    raw_rows: list[dict[str, str]] = []
    for row in sheet_xml.iter(WORKSHEET_NS + "row"):
        values = {cell_column(cell.attrib["r"]): cell_text(cell, shared_strings) for cell in row.findall(WORKSHEET_NS + "c")}
        if values:
            raw_rows.append(values)
    if not raw_rows:
        raise ValueError(f"Worksheet has no rows: {sheet_name}")
    headers = {column: value.strip() for column, value in raw_rows[0].items()}
    if len(headers) != len(set(headers.values())) or set(headers.values()) != EXPECTED_HEADERS:
        raise ValueError("Products headers do not exactly match the expected workbook schema")
    return [{headers[column]: value.strip() for column, value in row.items() if column in headers} for row in raw_rows[1:]]


def require(row: dict[str, str], field: str, label: str) -> str:
    value = row.get(field, "").strip()
    if not value:
        raise ValueError(f"{label} has no {field}")
    return value


def positive_integer(value: str, label: str) -> int:
    if not re.fullmatch(r"[1-9]\d*", value):
        raise ValueError(f"{label} is not a positive integer: {value!r}")
    integer = int(value)
    if integer > 2_147_483_647:
        raise ValueError(f"{label} exceeds the safe planner integer range")
    return integer


def integer_paise(value: str, label: str) -> int:
    try:
        price = Decimal(value)
    except InvalidOperation as error:
        raise ValueError(f"{label} has invalid INR price: {value!r}") from error
    if not price.is_finite() or price <= 0:
        raise ValueError(f"{label} has non-positive INR price: {value!r}")
    paise = price * 100
    if paise != paise.to_integral_value() or paise > 2_147_483_647:
        raise ValueError(f"{label} is not an exact safe paise value: {value!r}")
    return int(paise)


def product_url(value: str, label: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme != "https" or parsed.hostname != "www.livcheers.com" or parsed.username or parsed.password:
        raise ValueError(f"{label} has no HTTPS www.livcheers.com product URL: {value!r}")
    return value


def prepare() -> tuple[list[dict[str, object]], dict[str, object]]:
    rows = workbook_rows(WORKBOOK, "Products")
    if len(rows) != EXPECTED_ROWS:
        raise ValueError(f"Expected {EXPECTED_ROWS} Products rows, found {len(rows)}")

    payload: list[dict[str, object]] = []
    ids: set[str] = set()
    category_counts: Counter[str] = Counter()
    status_counts: Counter[str] = Counter()
    for row in rows:
        identifier = require(row, "sku_id", "Products row")
        label = f"Products {identifier}"
        if not ID_PATTERN.fullmatch(identifier) or identifier in ids:
            raise ValueError(f"{label} has an invalid or duplicate planner ID")
        ids.add(identifier)
        category = require(row, "category", label)
        if category not in EXPECTED_CATEGORIES:
            raise ValueError(f"{label} has unknown category: {category!r}")
        status = require(row, "record_status", label)
        if status not in EXPECTED_STATUSES:
            raise ValueError(f"{label} has unknown record status: {status!r}")
        expected_status = "CATEGORY_ONLY_REVIEW" if identifier == FLAGGED_ID else "LIVE_RETRIEVED"
        if status != expected_status:
            raise ValueError(f"{label} has an unexpected record status")
        if require(row, "city", label) != "Jaipur" or require(row, "state", label) != "Rajasthan" or require(row, "currency", label) != "INR":
            raise ValueError(f"{label} does not have Jaipur, Rajasthan, INR source values")
        if require(row, "price_kind", label) != "LIVCHEERS_JAIPUR_LISTED_PRICE":
            raise ValueError(f"{label} has an unexpected price kind")
        try:
            date.fromisoformat(require(row, "checked_on", label))
        except ValueError as error:
            raise ValueError(f"{label} has an invalid checked_on date") from error
        if row["checked_on"] != "2026-10-03":
            raise ValueError(f"{label} has an unexpected checked_on date")
        if row.get("image_url", "").strip() or row.get("commercial_permission_status", "").strip() != "NOT_VERIFIED" or row.get("image_label_status", "").strip() != "GENERIC_PLACEHOLDER_NOT_PRODUCT_PHOTO":
            raise ValueError(f"{label} has unreviewed image or commercial-permission data")
        category_counts[category] += 1
        status_counts[status] += 1
        payload.append({
            "id": identifier,
            "category": category,
            "name": require(row, "product_name", label),
            "brand": require(row, "brand", label),
            "size_ml": positive_integer(require(row, "volume_ml", label), f"{label} volume_ml"),
            "price_paise": integer_paise(require(row, "jaipur_listed_price_inr", label), label),
            "city": "Jaipur",
            "source_name": SOURCE_NAME,
            "source_state": "Rajasthan",
            "source_year": "2026",
            "source_price_type": SOURCE_PRICE_TYPE,
            "source_url": product_url(require(row, "product_url", label), label),
            "source_note": SOURCE_NOTE + (CATEGORY_ONLY_REVIEW_NOTE if identifier == FLAGGED_ID else ""),
        })
    if category_counts != Counter(EXPECTED_CATEGORIES) or status_counts != Counter(EXPECTED_STATUSES):
        raise ValueError("Workbook category or record-status counts differ from the frozen audit")
    flagged_rows = [row for row in rows if row.get("sku_id") == FLAGGED_ID]
    if len(flagged_rows) != 1 or flagged_rows[0].get("category") != "Rose Wine" or flagged_rows[0].get("record_status") != "CATEGORY_ONLY_REVIEW":
        raise ValueError("The required CATEGORY_ONLY_REVIEW row is absent or changed")
    payload.sort(key=lambda row: str(row["id"]))
    payload_bytes = render(payload)
    ids_bytes = ("\n".join(row["id"] for row in payload) + "\n").encode("utf-8")
    manifest = {
        "artifact": "jaipur-replacement-1311 prepare-only planner payload",
        "row_count": len(payload),
        "payload_sha256": sha256(payload_bytes),
        "workbook_sha256": sha256(WORKBOOK.read_bytes()),
        "ids_sha256": sha256(ids_bytes),
        "category_counts": dict(sorted(category_counts.items())),
        "record_status_counts": dict(sorted(status_counts.items())),
        "flagged_category_only_review_id": FLAGGED_ID,
        "source_semantics": {
            "website": "Livcheers Jaipur product pages",
            "price_kind": "LIVCHEERS_JAIPUR_LISTED_PRICE",
            "checked_on": "2026-10-03",
            "owner_authorization": "Owner authorized all 1,311 rows and asserts manual price checks.",
            "price_claim_limit": "Prices are website-listed Jaipur prices, not Official MRP; stock availability is not asserted.",
            "images": "No product image field is included. Workbook image references are not product-image or commercial-use claims; no image rights are asserted.",
        },
    }
    return payload, manifest


def render(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def verify_artifacts(payload: list[dict[str, object]], manifest: dict[str, object]) -> None:
    for path, expected in ((PAYLOAD_PATH, render(payload)), (MANIFEST_PATH, render(manifest))):
        if not path.is_file():
            raise ValueError(f"Missing prepared artifact: {path.relative_to(ROOT)}")
        if path.read_bytes() != expected:
            raise ValueError(f"Prepared artifact differs from deterministic output: {path.relative_to(ROOT)}")


def write_if_absent(path: Path, expected: bytes) -> None:
    if path.exists() and path.read_bytes() != expected:
        raise ValueError(f"Refusing to overwrite mismatched artifact: {path.relative_to(ROOT)}")
    if not path.exists():
        path.write_bytes(expected)


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare-only updated Jaipur planner payload.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--prepare", action="store_true", help="Write only absent deterministic artifacts.")
    mode.add_argument("--check", action="store_true", help="Validate existing artifacts without writing.")
    args = parser.parse_args()
    payload, manifest = prepare()
    if args.check:
        verify_artifacts(payload, manifest)
        print(f"PASS: {len(payload)} prepared rows and manifest match deterministic workbook output.")
        return 0
    if not OUTPUT_DIR.parent.is_dir():
        raise ValueError(f"Required output parent does not exist: {OUTPUT_DIR.parent}")
    OUTPUT_DIR.mkdir(exist_ok=True)
    write_if_absent(PAYLOAD_PATH, render(payload))
    write_if_absent(MANIFEST_PATH, render(manifest))
    print(f"PASS: prepared {len(payload)} rows in {OUTPUT_DIR.relative_to(ROOT)}.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
