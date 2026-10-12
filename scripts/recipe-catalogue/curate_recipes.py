"""Six source-reviewed drafts; preserves accepted quantities and provenance."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/recipe-curation'
REVIEWS = {
    'dn-cape-codder': ('build', 'Highball glass', 'Lime wedge', ['Fill a highball glass with ice.', 'Pour in the vodka and cranberry juice.', 'Finish with the lime wedge.'], 'Vodka and cranberry juice served over ice with lime.'),
    'dn-white-russian': ('build', 'Old-fashioned glass', None, ['Put ice in an old-fashioned glass.', 'Pour in the coffee liqueur and vodka.', 'Float the cream on top, then stir gently.'], 'Vodka and coffee liqueur finished with cream.'),
    'dn-negroni': ('stir', 'Old-fashioned glass', 'Orange slice', ['Put ice in an old-fashioned glass.', 'Add the gin, Campari and sweet vermouth.', 'Stir until cold and finish with the orange slice.'], 'Equal measures of gin, Campari and sweet vermouth, stirred over ice.'),
    'dn-margarita': ('shake', 'Cocktail glass', 'Salt rim', ['Chill a cocktail glass and coat its rim with salt.', 'Add tequila, Cointreau and lime juice to a shaker with ice.', 'Shake to chill, then strain into the prepared glass.'], 'Tequila, orange liqueur and lime juice, shaken and strained.'),
    'mm-virgin-mango-margarita': ('blend', None, 'Salt rim and lime wheel', ['Blend the frozen mango, coconut water and lime juice until smooth.', 'Pour into a salt-rimmed glass and finish with a lime wheel.'], 'A blended mango, coconut water and lime mocktail.'),
    'mm-watermelon-strawberry-mocktail': ('blend', None, None, ['Blend the watermelon, strawberries and lime juice together.', 'Pour over ice to serve.'], 'Watermelon and strawberries blended with fresh lime juice.'),
}

def run():
    before = [json.loads(line) for line in (OUT / 'remote-before.jsonl').read_text(encoding='utf-8').splitlines()]
    sources = {r['source_url']: r for p in (ROOT / 'output/recipe-extract').glob('*-recipes.jsonl') for line in p.read_text(encoding='utf-8').splitlines() if (r := json.loads(line))}
    rows, evidence = [], []
    for old in before:
        method, glass, garnish, steps, description = REVIEWS[old['id']]
        source = sources[old['source_url']]
        assert [' '.join(x.split()) for x in source['recipeIngredient']] == old['ingredients']
        row = {k: old[k] for k in ('id', 'name', 'source_name', 'source_url', 'source_retrieved_at', 'content_origin', 'ingredients', 'ingredient_details', 'recipe_yield', 'servings', 'category', 'base_spirit', 'alcohol_type')}
        if old['id'] == 'mm-virgin-mango-margarita':
            row['ingredient_details'][2] = {'raw': 'Juice of 1 lime', 'name': 'Lime juice', 'amount': '1', 'unit': 'lime'}
        if old['id'] == 'mm-watermelon-strawberry-mocktail':
            row['ingredient_details'][1] = {'raw': '8 strawberries', 'name': 'strawberries', 'amount': '8', 'unit': 'count'}
        row.update(preparation=steps, description=description, preparation_method=method, glassware=glass, garnish=garnish, prep_time_min=5 if old['id'].startswith('mm-') else None, ice_type='Ice' if old['id'] != 'mm-virgin-mango-margarita' else None, status='draft', editorial_ready=False, recipe_quality_issues=['publication_review_pending'])
        assert row['ingredients'] == old['ingredients'] and row['preparation'] and row['status'] == 'draft'
        rows.append(row)
        evidence.append({'id': old['id'], 'source_url': old['source_url'], 'source_ingredients': source['recipeIngredient'], 'source_instructions': source.get('recipeInstructions'), 'review': 'Source facts reviewed; original steps. No taste test. Garnish and ice quantities unspecified; optional soda omitted from Negroni; unspecified garnish omitted from watermelon recipe.'})
    assert len(rows) == 6 and len({r['id'] for r in rows}) == 6
    for name, data in [('reviewed-drafts', rows), ('evidence', evidence)]:
        (OUT / (name + '.jsonl')).write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in data), encoding='utf-8')
    print('PASS: six drafts preserve source quantities and provenance; review required before publication')

if __name__ == '__main__':
    run()
