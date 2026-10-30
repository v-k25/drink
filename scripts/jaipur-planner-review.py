#!/usr/bin/env python3
"""Generate a conservative, row-by-row review of Jaipur planner Other products.

Run from the repository root:
    python scripts/jaipur-planner-review.py
    python scripts/jaipur-planner-review.py --check

The review is documentation only. It never writes the catalogue or workbook.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "output" / "Jaipur_City_Product_Database.xlsx"
CATALOGUE = ROOT / "app" / "party-planner" / "catalogue.json"
OUTPUT = ROOT / "docs" / "jaipur-product-category-review.md"
OTHER = "Other / Unclassified"
EXPECTED_REMAINING = 227
EXPECTED_RECLASSIFIED = 22


def load_catalogue_module():
    spec = importlib.util.spec_from_file_location(
        "jaipur_planner_catalogue", ROOT / "scripts" / "jaipur-planner-catalogue.py"
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load Jaipur catalogue extractor")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def inr(paise: object) -> str:
    return f"₹{int(paise) / 100:,.2f}"


def table(rows: list[list[str]], headers: list[str]) -> list[str]:
    escaped = [[value.replace("|", r"\|").replace("\n", " ") for value in row] for row in rows]
    return [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
        *["| " + " | ".join(row) + " |" for row in escaped],
    ]


def render() -> str:
    extractor = load_catalogue_module()
    products = extractor.workbook_rows(WORKBOOK, "Product Master")
    prices = {
        row["Product ID"]: row
        for row in extractor.workbook_rows(WORKBOOK, "City Prices")
    }
    catalogue = json.loads(CATALOGUE.read_text(encoding="utf-8"))
    catalogue_by_id = {row["id"]: row for row in catalogue}

    original_other = [row for row in products if row.get("Category") == OTHER]
    original_ids = {row["Product ID"] for row in original_other}
    current_other_ids = {
        row["id"] for row in catalogue if row["category"] == OTHER
    }
    reclassified_ids = original_ids - current_other_ids
    remaining_ids = original_ids & current_other_ids

    if len(remaining_ids) != EXPECTED_REMAINING or len(reclassified_ids) != EXPECTED_RECLASSIFIED:
        raise ValueError(
            f"Expected {EXPECTED_REMAINING} remaining and {EXPECTED_RECLASSIFIED} reclassified "
            f"original Other products; found {len(remaining_ids)} and {len(reclassified_ids)}"
        )
    if current_other_ids != remaining_ids:
        raise ValueError("Catalogue Other IDs are not exactly the remaining original Other IDs")
    if set(catalogue_by_id) != {row["Product ID"] for row in products}:
        raise ValueError("Workbook and catalogue Product ID sets differ")

    source_categories = {}
    planner_categories = {}
    for row in products:
        source_categories[row["Category"]] = source_categories.get(row["Category"], 0) + 1
    for row in catalogue:
        planner_categories[row["category"]] = planner_categories.get(row["category"], 0) + 1

    product_by_id = {row["Product ID"]: row for row in products}
    remaining_rows: list[list[str]] = []
    for product_id in sorted(remaining_ids):
        product = product_by_id[product_id]
        current = catalogue_by_id[product_id]
        excise_class = product.get("Excise Class", "Not supplied in workbook")
        remaining_rows.append([
            product_id,
            current["name"],
            f"{current['sizeMl']} mL",
            inr(current["pricePaise"]),
            excise_class,
            "Needs manual review",
            "Low — the official product name has no explicit category term matched by the catalogue's narrow reclassification rules; Excise Class alone is not treated as a planner-category determination.",
        ])

    audit_rows: list[list[str]] = []
    for product_id in sorted(reclassified_ids):
        product = product_by_id[product_id]
        current = catalogue_by_id[product_id]
        matching_rule = next(
            pattern for pattern, category in extractor.OTHER_RECLASSIFICATIONS
            if category == current["category"] and extractor.re.search(pattern, current["name"].upper())
        )
        price = prices[product_id]
        audit_rows.append([
            product_id,
            current["name"],
            OTHER,
            current["category"],
            f"Official name matches narrow rule `{matching_rule}`; Rajasthan Excise Jaipur Official MRP source: {price['Official Source URL']}.",
        ])

    lines = [
        "# Jaipur Party Planner product-category review",
        "",
        "## Scope and evidence boundary",
        "",
        "This is a documentation-only, reproducible review of the Jaipur Party Planner catalogue generated from `output/Jaipur_City_Product_Database.xlsx`. It covers every product whose **current planner category** is `Other / Unclassified` and the 22 original `Other / Unclassified` products that the existing extractor reclassified using only explicit name terms.",
        "",
        "- **Pricing/source:** INR MRP and source links are the workbook's verified Jaipur **Rajasthan excise / price** records for 2026–27. They are not FSSAI records or FSSAI verification.",
        "- **No stock claim:** this review does not verify shop inventory, availability, case quantity, or pack wording beyond the workbook fields.",
        "- **No catalogue changes:** suggestions in this document are review notes only. They do not modify `catalogue.json`, the workbook, or planner behavior.",
        "- **Conservative method:** no category is inferred from broad brand knowledge. A suggestion appears only where an official product name contains one of the extractor's narrow, explicit type terms; every remaining row is deliberately marked `Needs manual review`.",
        "",
        "## Reproducibility and ID-set controls",
        "",
        f"The generator checks that the workbook and catalogue have the identical Product ID set, that exactly **{EXPECTED_REMAINING}** original-Other IDs remain current Other IDs, and that exactly **{EXPECTED_RECLASSIFIED}** original-Other IDs were reclassified. Run `python scripts/jaipur-planner-review.py --check` to reproduce and compare this document byte-for-byte.",
        "",
        "## Aggregate category counts",
        "",
        "### Workbook original-category counts",
        "",
        *table([[key, str(value)] for key, value in sorted(source_categories.items())], ["Original category", "Products"]),
        "",
        "### Current planner category counts",
        "",
        *table([[key, str(value)] for key, value in sorted(planner_categories.items())], ["Current category", "Products"]),
        "",
        f"Original `Other / Unclassified`: **{len(original_ids)}** · reclassified for the current catalogue: **{len(reclassified_ids)}** · remaining current Other: **{len(remaining_ids)}**.",
        "",
        "## Every current Other / Unclassified product (227)",
        "",
        "All rows below retain their current planner category. `Needs manual review` is intentional rather than a category guess.",
        "",
        *table(remaining_rows, ["Product ID", "Official name", "Size", "INR MRP", "Original Excise Class", "Suggested category", "Reason / confidence"]),
        "",
        "## Reclassification audit (22)",
        "",
        "These entries were already reassigned by `scripts/jaipur-planner-catalogue.py`; this table audits the original and current categories and records the explicit-name rule plus the workbook's official Rajasthan excise Jaipur MRP source. It proposes no new reclassification.",
        "",
        *table(audit_rows, ["Product ID", "Official name", "Original category", "Current category", "Source evidence"]),
        "",
    ]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate the Jaipur Other-product category review.")
    parser.add_argument("--check", action="store_true", help="Validate the committed review without writing it.")
    args = parser.parse_args()
    rendered = render()
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != rendered:
            raise ValueError("Existing review does not match deterministic generator output")
    else:
        OUTPUT.write_text(rendered, encoding="utf-8", newline="\n")
    print(f"PASS: {EXPECTED_REMAINING} current Other products and {EXPECTED_RECLASSIFIED} reclassified products reviewed.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError, RuntimeError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
