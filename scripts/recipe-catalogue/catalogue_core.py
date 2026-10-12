"""Shared constants and pure classification/generation logic for the
AllCheers recipe catalogue pipeline.

Copyright-safety rules encoded here:

- Retained fields are factual only: recipe name, ingredient list (verbatim
  quantities after HTML-entity unescape and whitespace normalisation),
  yield/time facts and the source URL/retrieval timestamp.
- Source descriptions, source instruction wording, images, ratings,
  nutrition and author fields are never carried into generated rows. They
  are read only as classification and safety-screening signals (keyword
  matching for a coarse preparation method and for rejection of dangerous
  or non-beverage content).
- Generated descriptions and preparation steps come exclusively from the
  finite template set below plus structured ingredient/method facts
  (category, alcohol type, method, ingredient names, yield).
- `normalize_text`/`ngrams` support the safety checks: no run of six
  consecutive words from any generated description or preparation step may
  appear in that record's own source description or instruction text. The
  per-record check is enforced by both the builder and the independent
  validator; the corpus-level intersection with all source prose is only a
  report-only audit metric (common method phrases and factual
  names/quantities are not source-sentence reuse).

This module is stdlib-only (no new dependencies).
"""

from __future__ import annotations

import hashlib
import html
import re

# --- Fixed provenance vocabulary -------------------------------------------

CONTENT_ORIGIN = "allcheers_original_from_facts"
ALCOHOL_TYPES = ("cocktail", "mocktail")
METHODS = ("shake", "stir", "blend", "build", "batch", "hot")

# Source -> (stable-id prefix, alcohol_type). The alcohol classification is
# source-based by contract: DrinkNation records are cocktails, Mindful
# Mocktail records are mocktails.
SOURCES = {
    "drinknation": {"id_prefix": "dn", "alcohol_type": "cocktail"},
    "mindfulmocktail": {"id_prefix": "mm", "alcohol_type": "mocktail"},
}

# --- Finite AllCheers-owned template set ------------------------------------
# Hand-authored original wording. Never derived from source sentences.

PREP_TEMPLATES: dict[str, tuple[str, ...]] = {
    "shake": (
        "Put every ingredient into a shaker with ice.",
        "Shake hard until the outside of the shaker turns cold.",
        "Strain into a fresh glass.",
    ),
    "stir": (
        "Put every ingredient into a mixing glass over ice.",
        "Stir until the mixing glass turns cold.",
        "Strain into a fresh glass.",
    ),
    "blend": (
        "Put every ingredient into a blender.",
        "Blend until the mix is completely smooth.",
        "Pour into a fresh glass.",
    ),
    "build": (
        "Put every ingredient into the serving glass in the listed order.",
        "Give the drink one gentle stir to bring it together.",
        "Add fresh ice as needed and serve.",
    ),
    "batch": (
        "Combine every ingredient in a large pitcher or bowl in the listed order.",
        "Give the batch one gentle stir to bring it together.",
        "Pour into individual glasses over fresh ice.",
    ),
    "hot": (
        "Warm every ingredient together in a small pan without letting it boil.",
        "Pour into a heatproof glass.",
        "Serve warm.",
    ),
}

METHOD_CLAUSES: dict[str, str] = {
    "shake": "shaken hard with ice, then strained cold",
    "stir": "stirred down with ice and strained cold",
    "blend": "blended smooth and poured cold",
    "build": "assembled straight in the glass",
    "batch": "batched in one bowl for pouring",
    "hot": "warmed through and served hot",
}

DESC_VARIANTS: tuple[str, ...] = (
    "A {label} put together from {ingredients}, {clause}.",
    "{name} — a {label} with {ingredients}, {clause}.",
)

DESC_NO_INGREDIENTS = "A {label} put together from listed ingredients, {clause}."
DESC_BARE = "A {label} {clause}."
YIELD_SENTENCE = "Makes {yield_value}."

# --- Safety screening (rejection signals) -----------------------------------
# Dangerous drinking games, chugging and shot-sequence mechanics. Scanned
# against name + ingredient strings + instruction text (as signals only).

UNSAFE_PATTERNS = (
    re.compile(r"\bchug\w*", re.I),
    re.compile(r"\bdrinking games?\b", re.I),
    re.compile(r"\bshot sequences?\b", re.I),
    re.compile(r"\bdrinking sequences?\b", re.I),
    re.compile(r"\bbeer bongs?\b", re.I),
    re.compile(r"\bkeg stands?\b", re.I),
    re.compile(r"\bpower hours?\b", re.I),
    re.compile(r"\bcentury clubs?\b", re.I),
    re.compile(r"\bshotguns?\b", re.I),
    re.compile(r"\bbombs?\b", re.I),
    re.compile(r"\bbomber\w*", re.I),
    re.compile(r"\bknockouts?\b", re.I),
    re.compile(r"\bshoot(?:s|ing)?\b", re.I),
    re.compile(r"\bdrop\w*\s+(?:the|a|an)\s+shots?\b", re.I),
    re.compile(r"\bshots?\s+glass\s+(?:in|into)\b", re.I),
)

# Non-beverage recipes: garnish/craft/component content. Explicit source
# categories are screened separately in the builder.
NON_BEVERAGE_NAME_PATTERNS = (
    re.compile(r"\bice cubes?\b", re.I),
    re.compile(r"\bice rings?\b", re.I),
    re.compile(r"\bice spheres?\b", re.I),
    re.compile(r"\b(?:simple|flavored|flavoured|cough|homemade|date)\s+syrup\b", re.I),
    re.compile(r"\bsyrup recipes?\b", re.I),
    re.compile(r"\bgarnishes?\b", re.I),
    re.compile(r"\bsalts?\b", re.I),
    re.compile(r"\bslices?\b", re.I),
    re.compile(r"\bjell-?o\b", re.I),
)
NON_BEVERAGE_ING_PATTERNS = (
    re.compile(r"\bjell-?o\b", re.I),
    re.compile(r"\bcough syrup\b", re.I),
)
NON_BEVERAGE_CATEGORIES = {"garnish", "side dish"}

# --- Coarse preparation-method classification -------------------------------
# Priority: hot > blend > batch > shake > stir > build, then a default tier.
# Signals come from factual fields (name, ingredients, yield) and instruction
# keywords (used as classification signal only, never reproduced).

HOT_NAME_ING = re.compile(
    r"\bhot (?:chocolate|toddy|buttered|water|coffee|cider|milk|wine|tea)\b|\bmulled\b|\bboiling water\b",
    re.I,
)
HOT_INSTR = re.compile(
    r"\bsimmer\w*\b|\bboil(?:s|ing|ed)?\b|\blow heat\b|\bgentle heat\b|\bdouble boiler\b"
    r"|\bstovetop\b|\bcrock ?pots?\b|\bsaucepan\b|\bheatproof\b|\bheat (?:the|until|through)\b"
    r"|\bwarm(?:s|ed|ing)?\b|\bserve hot\b",
    re.I,
)
BLEND_INSTR = re.compile(r"\bblend(?:s|er|ed|ing)?\b|\bfood processors?\b|\bpuree\w*\b", re.I)
BLEND_ING = re.compile(r"\bice creams?\b|\bsorbets?\b|\bfrozen\b", re.I)
BATCH_NAME_YIELD = re.compile(
    r"\bpitchers?\b|\bpunch bowls?\b|\bbatch(?:es|ed)?\b|\bcrowds?\b|\bgallons?\b", re.I,
)
BUILD_ING = re.compile(r"\bfill with\b", re.I)
BUILD_INSTR = re.compile(
    r"\btop (?:with|off|it|up)\b|\btopped (?:with|off|up)\b"
    r"|\bfill (?:the |a |up )?(?:glass|cup|mug|pitcher|with)\b|\bfloats?\b|\blayer(?:s|ed|ing)?\b",
    re.I,
)
SHAKE_INSTR = re.compile(r"\bshake(?:s|d|r|n)?\b|\bshakers?\b", re.I)
STIR_INSTR = re.compile(r"\bstir(?:s|red|ring)?\b", re.I)
SHAKE_DEFAULT_ING = re.compile(
    r"\bjuices?\b|\blemon\b|\blime\b|\borange\b|\bcranberr(?:y|ies)\b|\bcreams?\b|\beggs?\b"
    r"|\bsyrups?\b|\bcola\b|\bsodas?\b|\bmilks?\b|\bpineapples?\b|\bmangoes?\b|\bmangos\b"
    r"|\bber(?:ry|ries)\b|\bpeaches?\b|\bpassion ?fruits?\b|\bguavas?\b|\bgrapefruits?\b"
    r"|\bapples?\b|\bcher(?:ry|ries)\b",
    re.I,
)

# --- Base-spirit / category classification ----------------------------------
# Scanned against ingredient strings in listed order (first match wins) for
# cocktails only. Mocktails get base_spirit NULL and category "Mocktail".

SPIRIT_KEYWORDS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bvodkas?\b"), "vodka"),
    (re.compile(r"\bgins?\b"), "gin"),
    (re.compile(r"\brums?\b"), "rum"),
    (re.compile(r"\btequilas?\b"), "tequila"),
    (re.compile(r"\bscotch(?:es)?\b"), "scotch"),
    (re.compile(r"\bwhisk(?:e)?ys?\b|\bbourbons?\b|\bryes?\b"), "whisky"),
    (re.compile(r"\bbrand(?:y|ies)\b|\bcognacs?\b"), "brandy"),
    (re.compile(r"\bchampagnes?\b|\bproseccos?\b|\bsparkling wines?\b"), "champagne"),
    (re.compile(r"\bbeers?\b|\blagers?\b|\bales?\b|\bstouts?\b|\bporters?\b"), "beer"),
    (re.compile(r"\bsakes?\b"), "sake"),
    (re.compile(r"\bwines?\b"), "wine"),
)
CATEGORY_BY_SPIRIT = {
    "vodka": "Vodka",
    "gin": "Gin",
    "rum": "Rum",
    "tequila": "Tequila",
    "scotch": "Scotch",
    "whisky": "Whisky",
    "brandy": "Brandy",
    "champagne": "Champagne",
    "beer": "Beer",
    "sake": "Sake",
    "wine": "Wine",
}

# --- Text helpers -------------------------------------------------------------

_WORD_RE = re.compile(r"[a-z0-9]+")
_NGRAM_SIZE = 6
AUDIT_NGRAM_SIZE = 4

# Measurement tokens stripped from ingredient strings to recover ingredient
# names for the description templates. The retained ingredient strings keep
# their verbatim factual quantities; only the description name-phrase strips.
_MEASURE_TOKEN = re.compile(
    r"^(?:\s*(?:\d+(?:\.\d+)?(?:\s*[-–/]\s*\d+(?:\.\d+)?)?(?!\s*[-–]\s*[A-Za-z]))?\s*"
    r"(?:(?:oz\.?|ounces?|parts?|shots?|cups?|tsp\.?|tsps?|tbsp\.?|tbsps?|tablespoons?|teaspoons?"
    r"|ml|cl|l|dash(?:es)?|splash(?:es)?|slices?|wedges?|handfuls?|packages?|cans?|bottles?"
    r"|jiggers?|cubes?|pints?|quarts?|liters?|litres?|gallons?|g(?:rams?)?|kg|lbs?|pounds?"
    r"|pinch(?:es)?|inch(?:es)?|sticks?|bunch(?:es)?|sprigs?|leaves?|cloves?|bulbs?|thumbs?"
    r"|equal amounts?|fill with|juice of|to taste|top up|to garnish|optional|if desired"
    r"|large)\b)?"
    r"[,.\s]*)+",
    re.I,
)
_PARENS_RE = re.compile(r"\([^()]*\)")


def clean_text(value: str) -> str:
    """Faithful cleanup for retained factual text: HTML-entity unescape,
    non-breaking space normalisation, whitespace collapse."""
    cleaned = html.unescape(value)
    cleaned = cleaned.replace("\u00a0", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def normalize_text(text: str) -> str:
    """Lowercase alphanumeric fingerprint used for the safety checks."""
    return " ".join(_WORD_RE.findall(text.lower()))


def ngrams(text: str, size: int = _NGRAM_SIZE) -> set[str]:
    words = normalize_text(text).split()
    if len(words) < size:
        return set()
    return {" ".join(words[i:i + size]) for i in range(len(words) - size + 1)}


def stable_id(source: str, source_url: str) -> str:
    """Stable namespaced ID: <source-prefix>-<url-path-slug>."""
    prefix = SOURCES[source]["id_prefix"]
    slug = source_url.rstrip("/").rsplit("/", 1)[-1].lower()
    slug = re.sub(r"[^a-z0-9-]+", "-", slug)
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    return f"{prefix}-{slug}"


def ingredient_name(ingredient: str) -> str:
    """Recover the ingredient name (no quantities) for description templates."""
    name = ingredient
    for _ in range(3):
        stripped = _PARENS_RE.sub(" ", name)
        if stripped == name:
            break
        name = stripped
    name = _MEASURE_TOKEN.sub("", name)
    name = re.sub(r"\s+", " ", name).strip(" ,.-")
    return name


assert ingredient_name("7-up") == "7-up"
assert ingredient_name("7-Up") == "7-Up"
assert ingredient_name("2 oz. 7-up") == "7-up"
assert ingredient_name("1-2 oz lime juice") == "lime juice"


def join_names(names: list[str]) -> str:
    if len(names) == 1:
        return names[0]
    return ", ".join(names[:-1]) + " and " + names[-1]


# --- Classification -----------------------------------------------------------


def instruction_text(row: dict) -> str:
    """Flatten source instruction structure for signal scanning only."""
    instr = row.get("recipeInstructions")
    if isinstance(instr, list):
        parts: list[str] = []
        for step in instr:
            if isinstance(step, dict):
                parts.append(str(step.get("text", "")))
                parts.append(str(step.get("name", "")))
            else:
                parts.append(str(step))
        return " ".join(parts)
    if isinstance(instr, str):
        return instr
    return ""


def yield_text(row: dict) -> str:
    """First non-empty cleaned yield element (deterministic)."""
    raw = row.get("recipeYield")
    items = raw if isinstance(raw, list) else ([raw] if raw else [])
    for item in items:
        if item is None:
            continue
        cleaned = clean_text(str(item))
        if cleaned:
            return cleaned
    return ""


def is_unsafe(row: dict, name: str, ingredients: list[str]) -> bool:
    blob = " ".join([name, *ingredients, instruction_text(row)])
    return any(pattern.search(blob) for pattern in UNSAFE_PATTERNS)


def is_non_beverage(row: dict, name: str, ingredients: list[str]) -> bool:
    categories = row.get("recipeCategory")
    cat_items = categories if isinstance(categories, list) else ([categories] if categories else [])
    if any(str(cat).strip().lower() in NON_BEVERAGE_CATEGORIES for cat in cat_items):
        return True
    if any(pattern.search(name) for pattern in NON_BEVERAGE_NAME_PATTERNS):
        return True
    ing_blob = " ".join(ingredients)
    return any(pattern.search(ing_blob) for pattern in NON_BEVERAGE_ING_PATTERNS)


def classify_method(row: dict, name: str, ingredients: list[str], y_text: str) -> str:
    ing_text = " ".join(ingredients)
    instr = instruction_text(row).lower()
    name_yield = f"{name} {y_text}"
    if HOT_NAME_ING.search(f"{name_yield} {ing_text}") or HOT_INSTR.search(instr):
        return "hot"
    if BLEND_INSTR.search(instr) or BLEND_ING.search(ing_text):
        return "blend"
    if BATCH_NAME_YIELD.search(name_yield):
        return "batch"
    if SHAKE_INSTR.search(instr):
        return "shake"
    if STIR_INSTR.search(instr):
        return "stir"
    if BUILD_ING.search(ing_text) or BUILD_INSTR.search(instr):
        return "build"
    # Default tier: bartending convention — juice/dairy/egg/syrup mixers are
    # shaken, all-spirit drinks are stirred.
    if SHAKE_DEFAULT_ING.search(ing_text):
        return "shake"
    return "stir"


def classify_base_spirit(ingredients: list[str], alcohol_type: str) -> str | None:
    if alcohol_type != "cocktail":
        return None
    for ingredient in ingredients:
        lower = ingredient.lower()
        for pattern, spirit in SPIRIT_KEYWORDS:
            if pattern.search(lower):
                return spirit
    return None


def category_for(base_spirit: str | None, alcohol_type: str) -> str:
    if base_spirit and base_spirit in CATEGORY_BY_SPIRIT:
        return CATEGORY_BY_SPIRIT[base_spirit]
    return "Mocktail" if alcohol_type == "mocktail" else "Cocktail"


def prep_time_minutes(row: dict) -> int | None:
    """Parse ISO-8601 prepTime (preferred) else totalTime into minutes."""
    for key in ("prepTime", "totalTime"):
        raw = row.get(key)
        if not raw or not isinstance(raw, str):
            continue
        match = re.match(
            r"^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$", raw.strip()
        )
        if not match:
            continue
        days, hours, minutes, seconds = (int(g) if g else 0 for g in match.groups())
        total = days * 1440 + hours * 60 + minutes + (1 if seconds else 0)
        if total <= 32767:
            return total
    return None


# --- Description generation -----------------------------------------------------


def variant_index(stable_id_value: str) -> int:
    digest = hashlib.sha256(stable_id_value.encode("utf-8")).hexdigest()
    return int(digest, 16) % len(DESC_VARIANTS)


def build_description(
    stable_id_value: str,
    name: str,
    category: str,
    alcohol_type: str,
    method: str,
    ingredient_names: list[str],
    y_text: str,
    source_6grams: set[str],
) -> tuple[str, int]:
    """Generate the description from the finite template set plus structured
    facts. Falls back deterministically (4 -> 2 -> 0 ingredient names, then
    yield-less, then bare) whenever any six-word window of the candidate
    would overlap source prose. Returns (description, names_used)."""
    label = "mocktail" if alcohol_type == "mocktail" else "cocktail"
    clause = METHOD_CLAUSES[method]
    yield_part = YIELD_SENTENCE.format(yield_value=y_text) if y_text else ""
    vi = variant_index(stable_id_value)

    def assemble(core: str) -> str:
        return f"{core} {yield_part}" if yield_part else core

    for count in (4, 2):
        if len(ingredient_names) < count:
            continue
        template = DESC_VARIANTS[vi]
        candidate = assemble(template.format(
            label=label,
            ingredients=join_names(ingredient_names[:count]),
            clause=clause,
            name=name,
        ))
        if not (ngrams(candidate) & source_6grams):
            return candidate, count
    # No-ingredient fallback (still template + structured facts).
    candidate = assemble(DESC_NO_INGREDIENTS.format(label=label, clause=clause))
    if not (ngrams(candidate) & source_6grams):
        return candidate, 0
    # Bare fallback; the yield sentence is dropped too.
    candidate = DESC_BARE.format(label=label, clause=clause)
    return candidate, 0
