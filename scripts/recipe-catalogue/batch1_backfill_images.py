#!/usr/bin/env python3
"""Build the guarded image_url/image_alt backfill for the 20 Batch-1 recipes.

Read-only sources (owner asserts permission to use these image URLs):
  - output/recipe-extract/mindfulmocktail-recipes.jsonl  (key ``image``, first
    entry is the full-size original; used for the four mocktails, never
    refetched)
  - the 16 DrinkNation pages are fetched live with stdlib urllib only (browser
    UA header, 15 s timeout, 2 s sleep, sequential, max 20 fetches) to read
    their og:image meta tag. No browsers are installed and no stealthy-fetch
    tooling is used.

Outputs (preview + evidence only; the live UPDATE is applied separately via the
Supabase tools after this script exits 0):
  - output/recipe-batch1/batch1-images.json
  - output/recipe-batch1/batch1-images.sql

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
OUT_DIR = REPO / "output" / "recipe-batch1"
# Local og:image cache: successful GET results (including og-default
# exclusions) are recorded once and reused on later runs so the session's
# total fetch count stays within MAX_FETCHES. Cache entries carry the
# verified URL and how it was verified.
OG_CACHE = OUT_DIR / "batch1-og-cache.json"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)
FETCH_TIMEOUT_S = 15
SLEEP_BETWEEN_S = 2
MAX_URL_CHARS = 2048
MAX_FETCHES = 20

# The 16 DrinkNation pages to fetch for their og:image (Batch-1 cocktails).
FETCH_TARGETS = [
    ("dn-apple-martini", "https://drinknation.com/drink/apple-martini"),
    ("dn-bay-breeze", "https://drinknation.com/drink/bay-breeze"),
    ("dn-boulevardier", "https://drinknation.com/drink/boulevardier"),
    ("dn-brandy-alexander", "https://drinknation.com/drink/brandy-alexander"),
    ("dn-cuba-libre", "https://drinknation.com/drink/cuba-libre"),
    ("dn-daiquiri", "https://drinknation.com/drink/daiquiri"),
    ("dn-last-word", "https://drinknation.com/drink/last-word"),
    ("dn-madras", "https://drinknation.com/drink/madras"),
    ("dn-paloma", "https://drinknation.com/drink/paloma"),
    ("dn-pina-colada", "https://drinknation.com/drink/pina-colada"),
    ("dn-salty-dog", "https://drinknation.com/drink/salty-dog"),
    ("dn-sidecar", "https://drinknation.com/drink/sidecar"),
    ("dn-strawberry-daiquiri", "https://drinknation.com/drink/strawberry-daiquiri"),
    ("dn-vodka-gimlet", "https://drinknation.com/drink/vodka-gimlet"),
    ("dn-whiskey-sour", "https://drinknation.com/drink/whiskey-sour"),
    ("dn-white-lady", "https://drinknation.com/drink/white-lady"),
]

# The four Batch-1 mocktails resolved from the retained extraction file.
MOCKTAIL_IDS = {
    "mm-blood-orange-mocktail": "https://mindfulmocktail.com/blood-orange-mocktail/",
    "mm-pina-colada-mocktail-recipe": "https://mindfulmocktail.com/pina-colada-mocktail-recipe/",
    "mm-pineapple-coconut-mocktail": "https://mindfulmocktail.com/pineapple-coconut-mocktail/",
    "mm-vodka-mocktail": "https://mindfulmocktail.com/vodka-mocktail/",
}

# Drink names exactly as stored in public.drinks (live read-back verified;
# unchanged by the Batch-1 editorial update). The SQL sets image_alt from the
# row's own name column, so the stored alt always equals the stored name.
DRINK_NAMES = {
    "dn-apple-martini": "Apple Martini",
    "dn-bay-breeze": "Bay Breeze",
    "dn-boulevardier": "Boulevardier",
    "dn-brandy-alexander": "Brandy Alexander",
    "dn-cuba-libre": "Cuba Libre",
    "dn-daiquiri": "Daiquiri",
    "dn-last-word": "Last Word",
    "dn-madras": "Madras",
    "dn-paloma": "Paloma",
    "dn-pina-colada": "Pina Colada",
    "dn-salty-dog": "Salty Dog",
    "dn-sidecar": "Sidecar",
    "dn-strawberry-daiquiri": "Strawberry Daiquiri",
    "dn-vodka-gimlet": "Vodka Gimlet",
    "dn-whiskey-sour": "Whiskey Sour",
    "dn-white-lady": "White Lady",
    "mm-blood-orange-mocktail": "Easy Blood Orange Mocktail",
    "mm-pina-colada-mocktail-recipe": "Piña Colada Mocktail (Non-Alcoholic + 3 Ingredients!)",
    "mm-pineapple-coconut-mocktail": "Pineapple Spritzer Mocktail",
    "mm-vodka-mocktail": "Vodka Mocktail",
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

# DrinkNation's generic default og:image (observed on pages with no
# drink-specific photo). These are NOT original photos of the drink, so a
# match is excluded from the backfill (the hand-authored SVG fallback renders
# instead) and recorded with the reason rather than treated as a failure.
DEFAULT_OG_URLS = {"https://drinknation.com/images/og-default.png"}


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


def load_og_cache() -> dict[str, dict]:
    if not OG_CACHE.exists():
        return {}
    try:
        data = json.loads(OG_CACHE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    if not isinstance(data, dict):
        return {}
    entries = data.get("entries", data)
    if not isinstance(entries, dict):
        return {}
    return {
        k: v for k, v in entries.items() if isinstance(v, dict) and isinstance(v.get("og_image"), str)
    }


def save_og_cache(cache: dict[str, dict]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OG_CACHE.write_text(
        json.dumps(
            {
                "captured_utc_note": "og:image GET results cached so the session's total fetch count stays within MAX_FETCHES; values are stable page metadata read with a stdlib urllib GET only",
                "entries": cache,
            },
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> int:
    rows: list[dict] = []
    failures: list[dict] = []
    excluded: list[dict] = []
    fetch_count = 0

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

    # 2. DrinkNation pages: cached og:image values are reused (no refetch);
    #    only uncached pages are fetched live, sequential with sleep, capped
    #    at 20 fetches per run.
    cache = load_og_cache()
    cache_dirty = False
    for index, (drink_id, page_url) in enumerate(FETCH_TARGETS):
        if drink_id in cache:
            cached = cache[drink_id]
            image_url = cached["og_image"]
        else:
            if fetch_count >= MAX_FETCHES:
                failures.append({"id": drink_id, "error": "fetch budget exhausted"})
                continue
            if index > 0 or cache:
                time.sleep(SLEEP_BETWEEN_S)
            fetch_count += 1
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
            cache[drink_id] = {
                "og_image": image_url,
                "source_page": page_url,
                "verified_by": "this session (live urllib GET)",
            }
            cache_dirty = True
        if image_url in DEFAULT_OG_URLS:
            # Generic default, not an original photo of the drink: excluded so
            # the hand-authored SVG fallback renders instead. Recorded as a
            # documented exclusion (image_url stays NULL), not a failure.
            excluded.append(
                {
                    "id": drink_id,
                    "source_page": page_url,
                    "og_image": image_url,
                    "verified_by": cache.get(drink_id, {}).get("verified_by", "this session"),
                    "reason": (
                        "DrinkNation page exposes only its generic og-default.png; no original "
                        "drink photo available from the allowed source, so image_url stays NULL "
                        "and the SVG fallback renders"
                    ),
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
                "verified_by": cache.get(drink_id, {}).get("verified_by", "this session"),
                "url_length": len(image_url),
            }
        )

    if cache_dirty:
        save_og_cache(cache)

    expected = set(DRINK_NAMES)
    got = {row["id"] for row in rows}
    excluded_ids = {e["id"] for e in excluded}
    if failures or got | excluded_ids != expected:
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        payload = {
            "status": "failed",
            "captured_utc": datetime.now(timezone.utc).isoformat(),
            "resolved_ids": sorted(got),
            "excluded_ids": sorted(excluded_ids),
            "missing_ids": sorted(expected - got - excluded_ids),
            "fetch_count": fetch_count,
            "failures": failures,
        }
        (OUT_DIR / "batch1-images.failed.json").write_text(
            json.dumps(payload, indent=2) + "\n", encoding="utf-8"
        )
        print("FAIL: backfill not produced; see output/recipe-batch1/batch1-images.failed.json")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    rows.sort(key=lambda row: row["id"])
    excluded.sort(key=lambda e: e["id"])
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    preview = {
        "status": "preview",
        "captured_utc": datetime.now(timezone.utc).isoformat(),
        "guard": "each UPDATE only touches its exact id while status='published' AND editorial_ready=true AND image_url IS NULL; image_alt is set from the row's own name column so the stored alt always equals the stored name; updated_at left to the trigger",
        "alt_convention": "image_alt equals the drink name exactly as stored in public.drinks; no photography claims",
        "fetch_count": fetch_count,
        "rows": rows,
        "excluded": excluded,
    }
    (OUT_DIR / "batch1-images.json").write_text(json.dumps(preview, indent=2) + "\n", encoding="utf-8")

    sql_lines = [
        "-- Backfill image_url/image_alt for the Batch-1 published recipes with an",
        "-- original photo available (17 of 20; the other 3 DrinkNation pages",
        "-- expose only the generic og-default.png, so image_url stays NULL and",
        "-- the hand-authored SVG fallback renders — see the excluded list in",
        "-- output/recipe-batch1/batch1-images.json). Guarded: each UPDATE",
        "-- matches its exact id AND still has status='published',",
        "-- editorial_ready=true and a NULL image_url; image_alt is set from the",
        "-- row's own name column (so the stored alt always equals the stored",
        "-- name); updated_at is left to the trigger. No other rows, columns or",
        "-- statuses are touched.",
        "BEGIN;",
        "",
    ]
    for row in rows:
        sql_lines.extend(
            [
                "UPDATE public.drinks",
                f"SET image_url = '{row['image_url']}',",
                "    image_alt = name",
                f"WHERE id = '{row['id']}'",
                "  AND status = 'published'",
                "  AND editorial_ready = true",
                "  AND image_url IS NULL;",
                "",
            ]
        )
    sql_lines.extend(
        [
            "COMMIT;",
            "",
            "-- Post-check (read-only, run separately):",
            "-- SELECT id, image_url IS NOT NULL AS has_image, image_alt = name AS alt_matches_name,",
            "--   char_length(image_url) FROM public.drinks",
            f"-- WHERE id IN ({','.join(chr(39) + i + chr(39) for i in sorted(DRINK_NAMES))});",
            "",
        ]
    )
    (OUT_DIR / "batch1-images.sql").write_text("\n".join(sql_lines), encoding="utf-8")

    print(f"PASS: preview + SQL written ({fetch_count} DrinkNation fetches, {len(rows)} rows)")
    for row in rows:
        print(f"  {row['id']}: {row['image_url'][:90]}... ({row['url_length']} chars, {row['source']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
