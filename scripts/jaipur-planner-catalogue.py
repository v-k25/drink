#!/usr/bin/env python3
"""Build the Jaipur party-planner catalogue from the verified workbook.

Uses only the Python standard library so the generated JSON is reproducible
without adding a spreadsheet dependency. Run from the repository root:
    python scripts/jaipur-planner-catalogue.py
"""

from __future__ import annotations

from collections import Counter
from decimal import Decimal, InvalidOperation
import argparse
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET
from urllib.parse import urlparse
import zipfile


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WORKBOOK = ROOT / "output" / "Jaipur_City_Product_Database.xlsx"
DEFAULT_OUTPUT = ROOT / "app" / "party-planner" / "catalogue.json"
EXPECTED_ROWS = 1638
EXPECTED_PRICE_YEAR = "2026-27"
EXPECTED_RECLASSIFICATIONS = 22
EXPECTED_OTHER_PRODUCTS = 227
WORKSHEET_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
RELATIONSHIP_ID = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def cell_column(cell_ref: str) -> str:
    return "".join(character for character in cell_ref if character.isalpha())


def cell_text(cell: ET.Element, shared_strings: list[str]) -> str:
    """Return a worksheet cell's text, including inline strings."""
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        return "".join(text.text or "" for text in cell.iter(WORKSHEET_NS + "t"))
    value = cell.find(WORKSHEET_NS + "v")
    text = "" if value is None else value.text or ""
    if cell_type == "s":
        try:
            return shared_strings[int(text)]
        except (IndexError, ValueError) as error:
            raise ValueError(f"Invalid shared-string cell value: {text!r}") from error
    return text


def workbook_rows(workbook: Path, sheet_name: str) -> list[dict[str, str]]:
    """Read a simple XLSX worksheet without depending on Excel or openpyxl."""
    with zipfile.ZipFile(workbook) as archive:
        workbook_xml = ET.fromstring(archive.read("xl/workbook.xml"))
        relationships_xml = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {relationship.attrib["Id"]: relationship.attrib["Target"].lstrip("/") for relationship in relationships_xml}
        sheet = next((candidate for candidate in workbook_xml.find(WORKSHEET_NS + "sheets") if candidate.attrib["name"] == sheet_name), None)
        if sheet is None:
            raise ValueError(f"Missing worksheet: {sheet_name}")
        sheet_xml = ET.fromstring(archive.read(targets[sheet.attrib[RELATIONSHIP_ID]]))
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared_strings = ["".join(text.text or "" for text in item.iter(WORKSHEET_NS + "t")) for item in shared_root]

    rows: list[dict[str, str]] = []
    for row in sheet_xml.iter(WORKSHEET_NS + "row"):
        values: dict[str, str] = {}
        for cell in row.findall(WORKSHEET_NS + "c"):
            values[cell_column(cell.attrib["r"])] = cell_text(cell, shared_strings)
        if values:
            rows.append(values)
    if not rows:
        raise ValueError(f"Worksheet has no rows: {sheet_name}")
    headers = {column: value.strip() for column, value in rows[0].items()}
    if len(set(headers.values())) != len(headers):
        raise ValueError(f"Worksheet has duplicate headers: {sheet_name}")
    return [{headers[column]: value.strip() for column, value in row.items() if column in headers} for row in rows[1:]]


def require_text(row: dict[str, str], header: str, label: str) -> str:
    value = row.get(header, "").strip()
    if not value:
        raise ValueError(f"{label} has no {header}")
    return value


def integer_paise(value: str, label: str) -> int:
    try:
        paise = Decimal(value) * 100
    except InvalidOperation as error:
        raise ValueError(f"{label} has invalid MRP: {value!r}") from error
    if paise != paise.to_integral_value() or paise <= 0:
        raise ValueError(f"{label} has non-positive or fractional-paise MRP: {value!r}")
    return int(paise)


def require_value(row: dict[str, str], header: str, expected: str, label: str) -> None:
    if require_text(row, header, label) != expected:
        raise ValueError(f"{label} is not {expected} {header}")


def require_https_url(row: dict[str, str], header: str, label: str) -> None:
    value = require_text(row, header, label)
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError(f"{label} has invalid official source URL: {value!r}")


# The workbook's categories remain authoritative. These narrow rules only rescue
# unmistakable names that landed in Other / Unclassified; every other such row
# deliberately remains Other / Unclassified rather than receiving a guessed type.
OTHER_RECLASSIFICATIONS: tuple[tuple[str, str], ...] = (
    (r"\b(COGNAC|BRANDY)\b", "Brandy"),
    (r"\b(TEQUILA|TEQUILLA|AGAVEPURA|AGAVE SPIRIT)\b", "Tequila / Agave Spirit"),
    (r"\b(APEROL|CAMPARI|BAILEYS|LILLET)\b", "Liqueur / Aperitif"),
    (r"\b(WHISKY|WHISKEY)\b", "Whisky"),
    (r"\b(BEER|LAGER|WITBIER|PILS|STOUT|ALE)\b", "Beer"),
    (r"\b(RUM)\b", "Rum"),
    (r"\b(GIN)\b", "Gin"),
    (r"\b(VODKA)\b", "Vodka"),
)


def category_for(workbook_category: str, name: str) -> str:
    if workbook_category != "Other / Unclassified":
        return workbook_category
    upper_name = name.upper()
    for pattern, category in OTHER_RECLASSIFICATIONS:
        if re.search(pattern, upper_name):
            return category
    return workbook_category


def extract(workbook: Path) -> tuple[list[dict[str, object]], Counter[str], Counter[str]]:
    products = workbook_rows(workbook, "Product Master")
    prices = workbook_rows(workbook, "City Prices")
    if len(products) != EXPECTED_ROWS or len(prices) != EXPECTED_ROWS:
        raise ValueError(f"Expected {EXPECTED_ROWS} Product Master and City Prices rows; found {len(products)} and {len(prices)}")

    prices_by_product: dict[str, dict[str, str]] = {}
    for price in prices:
        product_id = require_text(price, "Product ID", "City Prices row")
        if product_id in prices_by_product:
            raise ValueError(f"Duplicate City Prices Product ID: {product_id}")
        label = f"City Prices {product_id}"
        require_value(price, "Market Code", "JAI", label)
        require_value(price, "City", "Jaipur", label)
        require_value(price, "State / UT", "Rajasthan", label)
        require_value(price, "Price Type", "Official MRP", label)
        require_value(price, "Verification Status", "Verified", label)
        require_value(price, "Publication Status", "Ready with source/date", label)
        require_value(price, "Data Quality Flag", "Ready", label)
        require_value(price, "Excise / Price Year", EXPECTED_PRICE_YEAR, label)
        require_https_url(price, "Official Source URL", label)
        prices_by_product[product_id] = price

    catalogue: list[dict[str, object]] = []
    source_categories: Counter[str] = Counter()
    output_categories: Counter[str] = Counter()
    ids: set[str] = set()
    for product in products:
        product_id = require_text(product, "Product ID", "Product Master row")
        if product_id in ids:
            raise ValueError(f"Duplicate Product Master Product ID: {product_id}")
        ids.add(product_id)
        price = prices_by_product.pop(product_id, None)
        if price is None:
            raise ValueError(f"Product Master {product_id} has no Jaipur price")
        name = require_text(product, "Official Product / Variant Name", f"Product Master {product_id}")
        source_category = require_text(product, "Category", f"Product Master {product_id}")
        size = require_text(product, "Pack Size (ml)", f"Product Master {product_id}")
        if not re.fullmatch(r"[1-9]\d*", size):
            raise ValueError(f"Product Master {product_id} has invalid pack size: {size!r}")
        if price.get("Pack Size (ml)", "").strip() != size:
            raise ValueError(f"Product Master {product_id} pack size disagrees with Jaipur price")
        category = category_for(source_category, name)
        source_categories[source_category] += 1
        output_categories[category] += 1
        catalogue.append({
            "id": product_id,
            "category": category,
            "name": name,
            "brand": require_text(product, "Product Family / Brand", f"Product Master {product_id}"),
            "sizeMl": int(size),
            "pricePaise": integer_paise(require_text(price, "MRP (INR)", f"City Prices {product_id}"), f"City Prices {product_id}"),
        })
    if prices_by_product:
        raise ValueError(f"Jaipur prices without Product Master rows: {', '.join(sorted(prices_by_product))}")
    if len(catalogue) != EXPECTED_ROWS or len(ids) != EXPECTED_ROWS:
        raise ValueError("Catalogue product IDs are not exactly the expected unique count")
    reclassified = source_categories["Other / Unclassified"] - output_categories["Other / Unclassified"]
    if reclassified != EXPECTED_RECLASSIFICATIONS or output_categories["Other / Unclassified"] != EXPECTED_OTHER_PRODUCTS:
        raise ValueError(
            "Unexpected Other / Unclassified classification counts: "
            f"{reclassified} reclassified, {output_categories['Other / Unclassified']} remaining"
        )
    return catalogue, source_categories, output_categories


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract and validate the Jaipur planner catalogue.")
    parser.add_argument("--workbook", type=Path, default=DEFAULT_WORKBOOK)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true", help="Validate the existing output instead of writing it.")
    args = parser.parse_args()
    catalogue, source_categories, output_categories = extract(args.workbook)
    rendered = json.dumps(catalogue, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not args.output.exists() or args.output.read_text(encoding="utf-8") != rendered:
            raise ValueError("Existing catalogue does not match deterministic extractor output")
    else:
        args.output.write_text(rendered, encoding="utf-8", newline="\n")
    reclassified = source_categories["Other / Unclassified"] - output_categories["Other / Unclassified"]
    print(f"PASS: {len(catalogue)} unique Jaipur products; {reclassified} obvious Other / Unclassified reclassifications.")
    print("Workbook categories: " + ", ".join(f"{category}={count}" for category, count in sorted(source_categories.items())))
    print("Planner categories: " + ", ".join(f"{category}={count}" for category, count in sorted(output_categories.items())))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
