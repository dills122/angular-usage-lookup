"""Deterministic skill ZIP using Python's standard library; no analysis logic."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SKILL = Path('skill/angular-usage-lookup')
INCLUDE = ('SKILL.md', 'INSTALL.md', 'LICENSE', 'agents', 'references', 'scripts', 'package.json', 'package-lock.json')
PREFIX = 'angular-usage-lookup'


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def version(root: Path) -> str:
    package = json.loads((root / SKILL / 'package.json').read_text())
    value = package['version']
    if not re.fullmatch(r'\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?', value):
        raise ValueError('Use a release SemVer, optionally with a prerelease suffix')
    lock = json.loads((root / SKILL / 'package-lock.json').read_text())
    if any(v != value for v in (lock['version'], lock['packages']['']['version'], json.loads((root / 'package.json').read_text())['version'])):
        raise ValueError('Root, skill and lockfile versions must agree')
    return value


def build(root: Path = ROOT, output: Path | None = None) -> Path:
    root = root.resolve()
    output = output or root / 'dist'
    release_version = version(root)
    skill = root / SKILL
    if skill.resolve() != skill:
        raise ValueError('Bundle source must not traverse symlinked directories')
    payload = {}
    for name in INCLUDE:
        entry = skill / name
        if not entry.exists() or entry.is_symlink():
            raise ValueError(f'Missing or symlinked bundle entry: {name}')
        candidates = sorted(entry.rglob('*')) if entry.is_dir() else [entry]
        for file in candidates:
            if file.is_symlink():
                raise ValueError(f'Bundle may not follow symlinks: {file}')
            if file.is_file():
                relative = file.relative_to(skill).as_posix()
                if any(part.startswith('.') or part in ('node_modules', '__pycache__') for part in Path(relative).parts):
                    raise ValueError(f'Unexpected hidden/generated asset: {relative}')
                payload[relative] = file.read_bytes()
    manifest = {'schemaVersion': 1, 'name': PREFIX, 'version': release_version,
                'files': [{'path': name, 'bytes': len(data), 'sha256': sha(data)} for name, data in sorted(payload.items())]}
    payload['BUNDLE-MANIFEST.json'] = (json.dumps(manifest, indent=2) + '\n').encode()
    output.mkdir(parents=True, exist_ok=True)
    archive = output / f'{PREFIX}-{release_version}.zip'
    # Stored ZIP entries avoid platform/zlib differences; bundle text is small.
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_STORED) as bundle:
        for name, data in sorted(payload.items()):
            info = zipfile.ZipInfo(f'{PREFIX}/{name}', date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, data)
    archive.with_suffix('.zip.sha256').write_text(f'{sha(archive.read_bytes())}  {archive.name}\n')
    (output / f'{PREFIX}-{release_version}.manifest.json').write_bytes(payload['BUNDLE-MANIFEST.json'])
    return archive


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    print(build(output=args.output))
