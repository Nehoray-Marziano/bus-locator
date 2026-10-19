"""Inspect the built runtime archives and publish a stable local package name."""
import hashlib
import json
import shutil
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'app.json').read_text(encoding='utf-8'))['app']['version']['name']
source = max((root / 'dist').glob(f'1100888-*{version}*.zab'), key=lambda path: path.stat().st_mtime)
target = root / f'dist/Meitar-Bus-{version}.zab'
shutil.copyfile(source, target)
entries = []
with ZipFile(target) as bundle:
    manifest = json.loads(bundle.read('manifest.json'))
    with ZipFile(BytesIO(bundle.read(manifest['zpks'][0]['name']))) as package:
        for archive in ['device.zip', 'app-side.zip']:
            with ZipFile(BytesIO(package.read(archive))) as runtime:
                entries.extend(runtime.namelist())
                for name in runtime.namelist():
                    if name.endswith(('MeitarSans.ttf', 'MeitarBold.ttf')):
                        assert runtime.read(name) == (root / 'assets/trex3/fonts' / Path(name).name).read_bytes()
assert any(name.endswith('MeitarSans.ttf') for name in entries), 'Bundled font missing'
assert any(name.endswith('MeitarBold.ttf') for name in entries), 'Bundled bold font missing'
assert any(name.endswith('MeitarSans-OFL.txt') for name in entries), 'Font license missing'
assert any(name.endswith('MeitarBold-OFL.txt') for name in entries), 'Bold font license missing'
assert not any('MeitarDisplay' in name for name in entries), 'Retired font still packaged'
assert not any(name.startswith(('tests/', 'scripts/', 'artifacts/')) for name in entries)
report = {
    'package': target.relative_to(root).as_posix(),
    'bytes': target.stat().st_size,
    'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
    'platforms': manifest['zpks'][0]['platforms'],
    'runtimeEntries': entries,
}
(root / 'artifacts/build-report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(f"Inspected {target.name}: {report['bytes']:,} bytes; bundled font and license verified.")
