#!/usr/bin/env python3
"""Build the guarded image_url/image_alt backfill for the 6 live published recipes.

Read-only sources:
  - output/recipe-extract/mindfulmocktail-recipes.jsonl  (key ``image``, first
    entry is the full-size original; used for the two mocktails, never refetched)
  - the two parent-verified DrinkNation og:image URLs (dn-cape-codder,
    dn-white-russian) are embedded as constants
  - the remaining two DrinkNation pages (dn-negroni, dn-margarita) are fetched
    live with stdlib urllib only (browser UA header, 15 s timeout, 2 s sleep,
    sequential) to read their og:image meta tag

Outputs (preview + evidence only; the live UPDATE is applied separately via the
Supabase tools after this script exits 0):
  - output/recipe-images/backfill-6.json
  - output/recipe-images/backfill-6.sql

If any fetch or validation fails, a failure record is written and the script
exits non-zero without producing a partial backfill.
"""

from __future__ import annotations

import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MOCKTAIL_JSONL = REPO / "output" / "recipe-extract" / "mindfulmocktail-recipes.jsonl"
OUT_DIR = REPO / "output" / "recipe-images"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)
FETCH_TIMEOUT_S = 15
SLEEP_BETWEEN_S = 2
MAX_URL_CHARS = 2048

# Parent-verified og:image values (owner asserts permission to use these image
# URLs, already used for ingredients/instructions).
PARENT_VERIFIED = {
    "dn-cape-codder": "https://images.drinknation.com/drinks/cape-codder-3393/t1783919133/c0-530-5264-2632/1600x800.webp?s=87434457c3ea4abc",
    "dn-white-russian": "https://images.drinknation.com/drinks/white-russian-3209/t1783919133/c0-578-6720-3360/1600x800.webp?s=33283080615d057d",
}

# The two DrinkNation pages still to fetch for their og:image.
FETCH_TARGETS = [
    ("dn-negroni", "https://drinknation.com/drink/negroni"),
    ("dn-margarita", "https://drinknation.com/drink/margarita"),
]

# Drink names exactly as stored in public.drinks (live read-back verified).
DRINK_NAMES = {
    "dn-cape-codder": "Cape Codder",
    "dn-white-russian": "White Russian",
    "dn-negroni": "Negroni",
    "dn-margarita": "Margarita",
    "mm-virgin-mango-margarita": "Virgin Mango Margarita",
    "mm-watermelon-strawberry-mocktail": "Watermelon Strawberry Mocktail",
}

MOCKTAIL_IDS = {
    "mm-virgin-mango-margarita": "https://mindfulmocktail.com/virgin-mango-margarita/",
    "mm-watermelon-strawberry-mocktail": "https://mindfulmocktail.com/watermelon-strawberry-mocktail/",
}

# og:image meta tag, both attribute orders.
OG_IMAGE_PATTERNS = [
    re.compile(
        r"<meta[^>]+property=[\"']og:image[\"'][^>]*content=[\"']([^\"']+)[\"']",
        re.IGNORECASE,
    ),
    re.compile(
        r"<meta[^>]+content=[\"']([^\"']+)[\"'][^>]*property=[\"']og:image[\"']",
        re.IGNORECASE,
    ),
]


def fetch_og_image(url: str) -> tuple[str | None, str | None]:
    """Fetch a page and return (og_image_url, error). Simple HTTP GET only."""
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
    try:
        with urllib.request.urlopen(request, timeout=FETCH_TIMEOUT_S) as response:
            charset = response.headers.get_content_charset() or "utf-8"
            page = response.read().decode(charset, errors="replace")
            status = response.status
    except Exception as error:  # noqa: BLE001 - record and fail closed
        return None, f"fetch failed: {type(error).__name__}: {error}"
    if status != 200:
        return None, f"unexpected HTTP status {status}"
    match = None
    for pattern in OG_IMAGE_PATTERNS:
        match = pattern.search(page)
        if match:
            break
    if not match:
        return None, "og:image meta tag not found in page HTML"
    value = html.unescape(match.group(1)).strip()
    if not value:
        return None, "og:image content is empty"
    return value, None


def validate_image_url(value: str) -> str | None:
    """Return an error string when the value is not an acceptable image URL."""
    if len(value) == 0:
        return "URL is empty"
    if len(value) > MAX_URL_CHARS:
        return f"URL exceeds {MAX_URL_CHARS} characters ({len(value)})"
    if any(ch.isspace() for ch in value):
        return "URL contains whitespace"
    parsed = urllib.parse.urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc:
        return f"URL is not an absolute https URL (scheme={parsed.scheme!r})"
    return None


def load_mocktail_images() -> dict[str, str]:
    """First entry of the ``image`` list per mocktail from the extraction file."""
    found: dict[str, str] = {}
    with MOCKTAIL_JSONL.open(encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            source_url = record.get("source_url") or ""
            for drink_id, page_url in MOCKTAIL_IDS.items():
                if source_url.rstrip("/") == page_url.rstrip("/"):
                    images = record.get("image")
                    if not isinstance(images, list) or not images:
                        raise SystemExit(
                            f"FAIL: {drink_id} has no image list in {MOCKTAIL_JSONL.name}"
                        )
                    first = images[0]
                    if not isinstance(first, str) or not first:
                        raise SystemExit(
                            f"FAIL: {drink_id} first image entry is not a non-empty string"
                        )
                    if drink_id in found and found[drink_id] != first:
                        raise SystemExit(f"FAIL: {drink_id} has conflicting image entries")
                    found[drink_id] = first
    missing = sorted(set(MOCKTAIL_IDS) - set(found))
    if missing:
        raise SystemExit(f"FAIL: mocktail image entries missing for {missing}")
    return found


def main() -> int:
    rows: list[dict] = []
    failures: list[dict] = []

    # 1. Mocktails from the extraction JSONL (no refetch).
    for drink_id, image_url in load_mocktail_images().items():
        error = validate_image_url(image_url)
        if error:
            failures.append({"id": drink_id, "image_url": image_url, "error": error})
            continue
        rows.append(
            {
                "id": drink_id,
                "image_url": image_url,
                "image_alt": DRINK_NAMES[drink_id],
                "source": "jsonl_image[0]",
                "source_detail": f"{MOCKTAIL_JSONL.name} first image entry (full-size)",
                "source_page": MOCKTAIL_IDS[drink_id],
                "verified_by": "retained extraction evidence",
                "url_length": len(image_url),
            }
        )

    # 2. Parent-verified DrinkNation og:image values.
    for drink_id, image_url in PARENT_VERIFIED.items():
        error = validate_image_url(image_url)
        if error:
            failures.append({"id": drink_id, "image_url": image_url, "error": error})
            continue
        rows.append(
            {
                "id": drink_id,
                "image_url": image_url,
                "image_alt": DRINK_NAMES[drink_id],
                "source": "og:image",
                "source_detail": "DrinkNation page og:image meta tag",
                "source_page": f"https://drinknation.com/drink/{drink_id.removeprefix('dn-')}",
                "verified_by": "parent (prior session)",
                "url_length": len(image_url),
            }
        )

    # 3. Remaining two DrinkNation pages fetched live, sequential with sleep.
    for index, (drink_id, page_url) in enumerate(FETCH_TARGETS):
        if index > 0 or PARENT_VERIFIED:
            time.sleep(SLEEP_BETWEEN_S)
        image_url, error = fetch_og_image(page_url)
        if error or image_url is None:
            failures.append(
                {
                    "id": drink_id,
                    "source_page": page_url,
                    "error": error or "no og:image extracted",
                }
            )
            continue
        error = validate_image_url(image_url)
        if error:
            failures.append(
                {
                    "id": drink_id,
                    "source_page": page_url,
                    "image_url": image_url,
                    "error": error,
                }
            )
            continue
        rows.append(
            {
                "id": drink_id,
                "image_url": image_url,
                "image_alt": DRINK_NAMES[drink_id],
                "source": "og:image",
                "source_detail": "DrinkNation page og:image meta tag (live urllib GET)",
                "source_page": page_url,
                "verified_by": "this session",
                "url_length": len(image_url),
            }
        )

    expected = set(DRINK_NAMES)
    got = {row["id"] for row in rows}
    if failures or got != expected:
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        payload = {
            "status": "failed",
            "captured_utc": datetime.now(timezone.utc).isoformat(),
            "resolved_ids": sorted(got),
            "missing_ids": sorted(expected - got),
            "failures": failures,
        }
        (OUT_DIR / "backfill-6.failed.json").write_text(
            json.dumps(payload, indent=2) + "\n", encoding="utf-8"
        )
        print(f"FAIL: backfill not produced; see output/recipe-images/backfill-6.failed.json")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    rows.sort(key=lambda row: row["id"])
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    preview = {
        "status": "preview",
        "captured_utc": datetime.now(timezone.utc).isoformat(),
        "guard": "each UPDATE only touches its exact id while status='published' AND editorial_ready=true AND image_url IS NULL; updated_at left to the trigger",
        "alt_convention": "image_alt is the drink name exactly as stored in public.drinks; no photography claims",
        "rows": rows,
    }
    (OUT_DIR / "backfill-6.json").write_text(json.dumps(preview, indent=2) + "\n", encoding="utf-8")

    sql_lines = [
        "-- Backfill image_url/image_alt for the 6 live published recipes only.",
        "-- Preview: output/recipe-images/backfill-6.json. Guarded: each UPDATE",
        "-- matches its exact id AND still has status='published',",
        "-- editorial_ready=true and a NULL image_url; updated_at is left to the",
        "-- trigger. No other rows, columns or statuses are touched.",
        "BEGIN;",
        "",
    ]
    for row in rows:
        sql_lines.extend(
            [
                f"UPDATE public.drinks",
                f"SET image_url = '{row['image_url']}',",
                f"    image_alt = '{row['image_alt']}'",
                f"WHERE id = '{row['id']}'",
                f"  AND status = 'published'",
                f"  AND editorial_ready = true",
                f"  AND image_url IS NULL;",
                "",
            ]
        )
    sql_lines.extend(
        [
            "COMMIT;",
            "",
            "-- Post-check (read-only, run separately):",
            "-- SELECT id, image_url IS NOT NULL AS has_image, image_alt FROM public.drinks",
            "-- WHERE id IN ('dn-cape-codder','dn-white-russian','dn-negroni','dn-margarita',",
            "--   'mm-virgin-mango-margarita','mm-watermelon-strawberry-mocktail');",
            "",
        ]
    )
    (OUT_DIR / "backfill-6.sql").write_text("\n".join(sql_lines), encoding="utf-8")

    print("PASS: preview + SQL written")
    for row in rows:
        print(f"  {row['id']}: {row['image_url'][:100]}... ({row['url_length']} chars, {row['source']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
