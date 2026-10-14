"""Check portable skill metadata, local documentation, JSON and release versions."""
from pathlib import Path
import json
import re
import subprocess
import sys
from build_bundle import ROOT, SKILL, version


def validate(root=ROOT):
    errors = []
    version(root)
    skill = root / SKILL
    packages = [json.loads((p / 'package.json').read_text()) for p in (root, skill)]
    for package in packages:
        for required in ('description', 'author', 'repository', 'homepage', 'bugs', 'keywords'):
            if not package.get(required):
                errors.append(f'{package["name"]}: missing package metadata {required}')
        if package.get('license') != 'MIT' or package.get('private') is not True:
            errors.append(f'{package["name"]}: expected MIT license and private npm package')
    if packages[0]['author'] != packages[1]['author'] or packages[0]['repository']['url'] != packages[1]['repository']['url']:
        errors.append('Root and skill author/repository metadata must agree')
    if packages[1]['repository'].get('directory') != SKILL.as_posix():
        errors.append('Skill repository.directory must identify the portable package')
    if json.loads((skill / 'package-lock.json').read_text())['packages'][''].get('license') != 'MIT':
        errors.append('Lockfile license must match the package')
    if (root / 'LICENSE').read_bytes() != (skill / 'LICENSE').read_bytes():
        errors.append('Repository and bundled licenses must match')
    text = (skill / 'SKILL.md').read_text()
    if not text.startswith('---\n') or '\n---\n' not in text[4:]:
        errors.append('SKILL.md requires YAML frontmatter')
    else:
        front = text.split('---', 2)[1]
        if not re.search(r'^name: angular-usage-lookup$', front, re.M) or not re.search(r'^description: .+', front, re.M):
            errors.append('Skill name and description must identify this skill')
    count = 0
    excluded = {'node_modules', 'test-output', 'dist', '.git', '.nx', '__pycache__', '.agents', 'local'}
    for file in root.rglob('*'):
        relative = file.relative_to(root)
        if file.is_symlink() or any(p in excluded for p in relative.parts) or '.codex/skills' in relative.as_posix():
            continue
        if not file.is_file() or file.suffix not in ('.md', '.json', '.mjs', '.py', '.yml', '.yaml'):
            continue
        count += 1
        content = file.read_text()
        if file.suffix == '.json':
            try:
                json.loads(content)
            except ValueError as error:
                errors.append(f'{relative}: {error}')
        if file.suffix == '.mjs':
            run = subprocess.run(['node', '--check', str(file)], capture_output=True, text=True)
            if run.returncode:
                errors.append(run.stderr.strip())
        if file.suffix != '.md':
            continue
        prose = re.sub(r'`[^`\n]*`', '', re.sub(r'```[\s\S]*?```', '', content))
        for target in re.findall(r'\]\(([^)]+)\)', prose):
            if re.match(r'\w+://|mailto:', target):
                continue
            name, _, anchor = target.partition('#')
            # Historical reports retain absolute evidence paths as provenance.
            if name.startswith('/') and relative.as_posix().startswith('docs/research/'):
                continue
            linked = (file.parent / name.strip('<>')).resolve() if name else file
            if not linked.exists():
                errors.append(f'{relative}: broken link {target}')
            elif anchor and linked.suffix == '.md':
                headings = re.findall(r'^#+\s+(.+)$', linked.read_text(), re.M)
                ids = {re.sub(r'[^\w\- ]', '', h.lower()).replace(' ', '-') for h in headings}
                if anchor not in ids:
                    errors.append(f'{relative}: missing heading {target}')
    if errors:
        raise ValueError('\n'.join(errors))
    print(f'Validated {count} source/document/config files and synchronized release versions.')


if __name__ == '__main__':
    try:
        validate()
    except (ValueError, KeyError, OSError) as error:
        print(error, file=sys.stderr)
        raise SystemExit(1)
