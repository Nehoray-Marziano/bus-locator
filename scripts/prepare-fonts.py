"""Create small static Latin fonts from the upstream OFL variable fonts."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.subset import Options, Subsetter

root = Path(__file__).resolve().parent.parent
target = root / 'assets/trex3/fonts'
target.mkdir(parents=True, exist_ok=True)
characters = ''.join(chr(code) for code in range(32, 127)) + '\u00b7\u2014\u2026\u2192'
for source, output, family, axes in [
    ('dm-sans', 'MeitarSans', 'Meitar Sans', {'opsz': 22, 'wght': 500}),
]:
    font = instantiateVariableFont(TTFont(root / f'.tooling/fonts/{source}.ttf'), axes, inplace=True)
    options = Options()
    options.recalc_timestamp = False
    subset = Subsetter(options=options)
    subset.populate(text=characters)
    subset.subset(font)
    # Modified subsets have distinct names; preserve upstream copyright/license.
    for name_id, value in [(1, family), (2, 'Regular'), (4, family), (6, output)]:
        font['name'].setName(value, name_id, 3, 1, 0x409)
        font['name'].setName(value, name_id, 1, 0, 0)
    font.save(target / f'{output}.ttf')
    (target / f'{output}-OFL.txt').write_bytes((root / f'.tooling/fonts/{source}-license.txt').read_bytes())
    print(output, (target / f'{output}.ttf').stat().st_size, 'bytes')
