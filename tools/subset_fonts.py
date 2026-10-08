#!/usr/bin/env python3
"""Subset the self-hosted woff2 webfonts to the glyphs this site actually uses.

Why: the unsubsetted Google "arabic" + "latin" slices ship ~438 KiB total, which
is the dominant cost of FCP/LCP on simulated slow-4G. Subsetting cuts that while
keeping every glyph that can appear in the rendered pages (both AR and EN text,
SVG path data, auth.js UI strings).

Rebuild (needs: pip install fonttools brotli):
    python tools/subset_fonts.py

Files keep their names, so no HTML/CSS URL changes are required.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(ROOT, 'fonts')

# Every file whose characters may end up on screen (or in a font-styled box).
SOURCES = [
    'index.html', 'privacy.html', 'terms.html', '404.html',
    'auth.js', 'legal.js', 'input.css', 'tailwind.config.js',
]


def safety_ranges():
    """Characters we keep regardless of current page text."""
    chars = set()

    def rng(lo, hi):
        for cp in range(lo, hi + 1):
            chars.add(chr(cp))

    rng(0x20, 0x7E)          # ASCII printable (SVG paths, digits, brand text)
    rng(0xA0, 0xFF)          # Latin-1 supplement
    rng(0x152, 0x153)        # oe / OE
    rng(0x2000, 0x206F)      # general punctuation
    rng(0x2070, 0x209F)      # super/subscripts
    rng(0x20A0, 0x20BF)      # currency symbols
    rng(0x2100, 0x214F)      # letterlike
    rng(0x2190, 0x21FF)      # arrows
    rng(0x2200, 0x22FF)      # math operators
    rng(0x2E41, 0x2E41)
    # Arabic: symbols, marks, base letters, harakat, digits, extended letters.
    # NOTE: Arabic Presentation Forms (FB50-FDFF / FE70-FEFC) are deliberately
    # not listed as codepoints - they are produced by GSUB from the base letters
    # above and are pulled in automatically by layout closure.
    for lo, hi in [
        (0x0600, 0x06FF), (0x0750, 0x077F),
        (0x0870, 0x0891), (0x0898, 0x08E1), (0x08E3, 0x08FF),
        (0x200C, 0x200F), (0x2010, 0x2011), (0x204F, 0x204F),
        (0x0660, 0x0669), (0x06F0, 0x06F9),
    ]:
        rng(lo, hi)
    return chars


def build_charset():
    chars = safety_ranges()
    for rel in SOURCES:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        with open(path, encoding='utf-8') as fh:
            chars.update(fh.read())
    return chars


def main():
    from fontTools import subset
    from fontTools.ttLib import TTFont

    chars = build_charset()
    text = ''.join(sorted(chars))
    tmp = os.path.join(ROOT, 'fonts', '.charset.txt')
    with open(tmp, 'w', encoding='utf-8') as fh:
        fh.write(text)

    files = sorted(os.path.join(FONT_DIR, n) for n in os.listdir(FONT_DIR)
                   if n.endswith('.woff2'))
    if not files:
        sys.exit('no .woff2 files found in %s' % FONT_DIR)

    total_before = total_after = 0
    rows = []
    for path in files:
        before = os.path.getsize(path)
        original_cmap = set(TTFont(path).getBestCmap().keys())
        wanted = {ord(c) for c in text}
        keep = wanted & original_cmap

        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['*']
        opts.name_IDs = ['*']
        opts.name_legacy = True
        opts.notdef_outline = True
        opts.recalc_bounds = True
        opts.drop_tables = ['DSIG']
        opts.hinting = True
        opts.legacy_kern = True
        opts.passthrough_tables = False
        font = subset.load_font(path, opts)
        subsetter = subset.Subsetter(options=opts)
        subsetter.populate(text=''.join(chr(c) for c in sorted(keep)))
        subsetter.subset(font)
        subset.save_font(font, path, opts)

        after = os.path.getsize(path)
        # coverage check: every originally-available wanted char still present
        got = set(TTFont(path).getBestCmap().keys())
        missing = keep - got
        rows.append((os.path.basename(path), before, after, len(keep), len(missing)))
        total_before += before
        total_after += after
        if missing:
            print('WARN %s missing %d codepoints' % (os.path.basename(path), len(missing)))

    os.remove(tmp)

    print('%-38s %9s %9s %8s' % ('file', 'before', 'after', 'kept'))
    for name, b, a, k, miss in rows:
        pct = (100.0 * (b - a) / b) if b else 0
        print('%-38s %7.1fK %7.1fK %6d  -%.0f%%%s'
              % (name, b / 1024.0, a / 1024.0, k, pct, '  MISSING!' if miss else ''))
    print('-' * 74)
    print('%-38s %7.1fK %7.1fK  -%.1f%%'
          % ('TOTAL', total_before / 1024.0, total_after / 1024.0,
             100.0 * (total_before - total_after) / total_before))


if __name__ == '__main__':
    main()
