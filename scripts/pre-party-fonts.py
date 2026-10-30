# Builds app/fonts/BricolageGrotesque-latin.woff2 and Manrope-latin.woff2 (Pre-Party design, R1).
# Both fonts are SIL OFL 1.1; licence texts sit next to the files in app/fonts/.
#
# Inputs (download once, run from a scratch folder; not committed):
#   bricolage-full.ttf  https://github.com/google/fonts/raw/main/ofl/bricolagegrotesque/BricolageGrotesque[opsz,wdth,wght].ttf
#   manrope-full.ttf    https://github.com/google/fonts/raw/main/ofl/manrope/Manrope[wght].ttf
# Needs: python -m pip install fonttools brotli
#
# Trim: Latin + rupee (U+20B9), arrows, dashes and quotes only.
#   Bricolage Grotesque: weights 700-800, width 100, optical size pinned at 48 (keeps the file near 39 KB).
#   Manrope: weights 500-800 (about 23 KB).
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

UNICODES = ([*range(0x20, 0x7F), *range(0xA0, 0x100), 0x131, 0x152, 0x153, 0x2C6, 0x2DA, 0x2DC]
            + list(range(0x2010, 0x2016)) + list(range(0x2018, 0x201F)) + [0x2022, 0x2026, 0x20AC, 0x20B9, 0x2122, 0x2190, 0x2191, 0x2192, 0x2193, 0x2212])

def build(src, out, limits):
    font = TTFont(src)
    font = instancer.instantiateVariableFont(font, limits)
    font.save('_tmp.ttf'); font = TTFont('_tmp.ttf')  # reload: subsetting straight after instancing can fail
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = [1, 2, 3, 4, 6]
    opts.notdef_outline = True
    opts.glyph_names = False
    opts.hinting = False
    s = subset.Subsetter(opts)
    s.populate(unicodes=UNICODES)
    s.subset(font)
    font.flavor = 'woff2'
    font.save(out)

build('bricolage-full.ttf', 'BricolageGrotesque-latin.woff2', {'wdth': 100, 'wght': (700, 800), 'opsz': 48})
build('manrope-full.ttf', 'Manrope-latin.woff2', {'wght': (500, 800)})
