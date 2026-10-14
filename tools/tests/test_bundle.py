import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest
import zipfile

SPEC = importlib.util.spec_from_file_location('bundle', Path(__file__).parents[1] / 'build_bundle.py')
bundle = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(bundle)


class BundleTests(unittest.TestCase):
    def test_reproducible_inventory_and_hashes(self):
        with tempfile.TemporaryDirectory() as tmp:
            first = bundle.build(output=Path(tmp) / 'one')
            second = bundle.build(output=Path(tmp) / 'two')
            self.assertEqual(first.read_bytes(), second.read_bytes())
            self.assertEqual(first.with_suffix('.zip.sha256').read_text().split()[0], hashlib.sha256(first.read_bytes()).hexdigest())
            with zipfile.ZipFile(first) as archive:
                names = archive.namelist()
                manifest = json.loads(archive.read('angular-usage-lookup/BUNDLE-MANIFEST.json'))
                self.assertEqual(set(names), {f'angular-usage-lookup/{f["path"]}' for f in manifest['files']} | {'angular-usage-lookup/BUNDLE-MANIFEST.json'})
                for entry in manifest['files']:
                    data = archive.read(f'angular-usage-lookup/{entry["path"]}')
                    self.assertEqual(len(data), entry['bytes'])
                    self.assertEqual(hashlib.sha256(data).hexdigest(), entry['sha256'])
                self.assertIn('angular-usage-lookup/package-lock.json', names)
                self.assertEqual(archive.read('angular-usage-lookup/LICENSE'), (bundle.ROOT / 'LICENSE').read_bytes())
                self.assertFalse(any('/tests/' in n or '/node_modules/' in n or '/.codex/' in n or '/docs/' in n for n in names))

    def copied_root(self, tmp):
        root = Path(tmp) / 'repo'
        shutil.copytree(bundle.ROOT / bundle.SKILL, root / bundle.SKILL, ignore=shutil.ignore_patterns('node_modules', 'test-output', '.nx', 'dist'))
        shutil.copyfile(bundle.ROOT / 'package.json', root / 'package.json')
        return root

    def test_rejects_version_mismatch(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self.copied_root(tmp)
            package = json.loads((root / 'package.json').read_text())
            package['version'] = '9.9.9'
            (root / 'package.json').write_text(json.dumps(package))
            with self.assertRaisesRegex(ValueError, 'versions must agree'):
                bundle.build(root)

    def test_rejects_symlinked_payload(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self.copied_root(tmp)
            (root / bundle.SKILL / 'references/leak.md').symlink_to(root / 'package.json')
            with self.assertRaisesRegex(ValueError, 'symlink'):
                bundle.build(root)

    def test_rejects_missing_entry(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self.copied_root(tmp)
            (root / bundle.SKILL / 'SKILL.md').unlink()
            with self.assertRaisesRegex(ValueError, 'Missing'):
                bundle.build(root)

    def test_payload_change_changes_digest(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self.copied_root(tmp)
            first = bundle.build(root, Path(tmp) / 'first').read_bytes()
            install = root / bundle.SKILL / 'INSTALL.md'
            install.write_text(install.read_text() + '\nA changed installation instruction.\n')
            second = bundle.build(root, Path(tmp) / 'second').read_bytes()
            self.assertNotEqual(hashlib.sha256(first).hexdigest(), hashlib.sha256(second).hexdigest())
