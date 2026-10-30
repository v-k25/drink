#!/usr/bin/env python3
"""Extract schema.org Recipe JSON-LD from two authorized public sites."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from scrapling.spiders import CrawlRule, LinkExtractor, Request, SitemapSpider


SOURCES = {
    "drinknation": {
        "domain": "drinknation.com",
        "sitemap": "https://drinknation.com/sitemap-index.xml",
        "allow": r"^https?://(?:www\.)?drinknation\.com/drink/[^/?#]+/?$",
    },
    "mindfulmocktail": {
        "domain": "mindfulmocktail.com",
        "sitemap": "https://mindfulmocktail.com/sitemap_index.xml",
        "allow": r"^https?://(?:www\.)?mindfulmocktail\.com/[^?#]+/?$",
    },
}

RECIPE_TYPES = {"recipe", "https://schema.org/recipe", "http://schema.org/recipe"}
FIELD_NAMES = (
    "name", "description", "recipeCategory", "recipeIngredient", "recipeInstructions",
    "image", "recipeYield", "prepTime", "cookTime", "totalTime", "nutrition",
    "aggregateRating", "author", "datePublished",
)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def values(value: Any) -> list[Any]:
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def recipe_objects(value: Any) -> Iterable[dict[str, Any]]:
    for item in values(value):
        if isinstance(item, dict):
            typ = item.get("@type", "")
            types = {str(t).lower() for t in values(typ)}
            if types & RECIPE_TYPES:
                yield item
            for child in recipe_objects(item.get("@graph")):
                yield child


def parse_jsonld(text: str) -> Iterable[dict[str, Any]]:
    try:
        data = json.loads(text.strip())
    except (TypeError, json.JSONDecodeError):
        return ()
    return recipe_objects(data)


def normalize_recipe(item: dict[str, Any]) -> dict[str, Any]:
    selected = {key: item[key] for key in FIELD_NAMES if key in item}
    return selected


class RecipeSpider(SitemapSpider):
    name = "authorized-recipes"
    robots_txt_obey = True
    autothrottle_enabled = True
    download_delay = 1.0
    concurrent_requests = 2
    sitemap_alternate_links = False

    def __init__(self, source: str, limit: int, processed: set[str], **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.source = source
        self.limit = limit
        self.processed = processed
        self.scheduled_pages = 0
        self.sitemap_urls = [SOURCES[source]["sitemap"]]
        self.rules_list = [
            CrawlRule(LinkExtractor(
                allow=SOURCES[source]["allow"],
                allow_domains=[SOURCES[source]["domain"]],
                deny=(r"/search/", r"[?&]ids="),
            ), callback=self.parse_recipe),
        ]
        sitemap_pattern = r"post-sitemap\.xml$" if source == "mindfulmocktail" else r".*"
        self.sitemap_follow = LinkExtractor(
            allow=sitemap_pattern, allow_domains=[SOURCES[source]["domain"]]
        )

    def rules(self) -> list[CrawlRule]:
        return self.rules_list

    async def _parse_sitemap(self, response: Any):
        """Like SitemapSpider's parser, but stop scheduling after the requested bound."""
        result = self._sm_body(response.body, response.headers.get("content-type") if response.headers else None)
        for child_url in result.sitemaps:
            if self.scheduled_pages < self.limit and self.sitemap_follow.matches(child_url):
                yield response.follow(child_url, callback=self._parse_sitemap)
        for url in result.urls:
            if self.scheduled_pages >= self.limit:
                break
            if url in self.processed:
                continue
            req = self._dispatch(response, url, self.rules())
            if req is not None:
                self.scheduled_pages += 1
                yield req

    async def parse_recipe(self, response: Any):
        url = response.url
        if url in self.processed:
            return
        scripts = response.css('script[type="application/ld+json"]::text').getall()
        recipes = [recipe for text in scripts for recipe in parse_jsonld(text)]
        if not recipes:
            yield {"source": self.source, "source_url": url, "scraped_at": now(),
                   "error": "no_recipe_jsonld"}
            return
        yield {"source": self.source, "source_url": url, "scraped_at": now(),
               **normalize_recipe(recipes[0])}


def read_urls(*paths: Path) -> set[str]:
    seen: set[str] = set()
    for path in paths:
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            try:
                row = json.loads(line)
                if row.get("source_url"):
                    seen.add(row["source_url"])
            except json.JSONDecodeError:
                continue
    return seen


def append_rows(path: Path, rows: Iterable[dict[str, Any]], existing: set[str]) -> int:
    count = 0
    with path.open("a", encoding="utf-8") as handle:
        for row in rows:
            url = row.get("source_url")
            if not url or url in existing:
                continue
            handle.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
            existing.add(url)
            count += 1
    return count


def run_source(source: str, limit: int, output_dir: Path) -> tuple[int, int]:
    recipes_path = output_dir / f"{source}-recipes.jsonl"
    errors_path = output_dir / f"{source}-errors.jsonl"
    processed = read_urls(recipes_path, errors_path)
    spider = RecipeSpider(source, limit, processed, crawldir=output_dir / f"{source}-crawl")
    result = spider.start()
    recipes = [row for row in result.items if "error" not in row]
    errors = [row for row in result.items if "error" in row]
    return append_rows(recipes_path, recipes, processed), append_rows(errors_path, errors, processed)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", choices=["drinknation", "mindfulmocktail", "all"], default="all")
    parser.add_argument("--limit", type=int, default=100, help="maximum sitemap page URLs scheduled per source")
    parser.add_argument("--output-dir", type=Path, default=Path("output/recipe-extract"))
    args = parser.parse_args()
    if args.limit < 1:
        parser.error("--limit must be at least 1")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    sources = list(SOURCES) if args.source == "all" else [args.source]
    for source in sources:
        recipes, errors = run_source(source, args.limit, args.output_dir)
        print(f"{source}: wrote {recipes} recipes and {errors} extraction failures")


if __name__ == "__main__":
    main()
