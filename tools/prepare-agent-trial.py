#!/usr/bin/env python3
"""Prepare a manual fresh-agent trial; keep the answer key outside agent inputs.

Run test:scale first. This copies its source-authored oracle, never derives an
expectation from collector output. No application lookup logic lives here.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import shutil
import zipfile


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")


def prepare(repo, trial, private):
    if trial == private or trial in private.parents or private in trial.parents:
        raise ValueError("Trial inputs and private grading data must be disjoint directories")
    if trial.exists() or private.exists():
        raise ValueError("Both output directories must be new")
    skill = repo / "skill/angular-usage-lookup"
    scale = skill / "test-output/scale"
    version = json.loads((skill / "package.json").read_text())["version"]
    bundle = repo / f"dist/angular-usage-lookup-{version}.zip"
    if digest(bundle) != Path(str(bundle) + ".sha256").read_text().split()[0]:
        raise ValueError("Bundle checksum does not match")
    baseline_hashes = json.loads((scale / "source-hashes.json").read_text())
    if any(digest(scale / "workspace" / file) != value for file, value in baseline_hashes.items()):
        raise ValueError("Scale workspace changed since its authored oracle was frozen; rerun test:scale")
    for directory in (trial, private):
        directory.mkdir(parents=True, exist_ok=False)
    shutil.copy2(bundle, trial / bundle.name)
    workspace = trial / "workspace"
    shutil.copytree(scale / "workspace", workspace, ignore=shutil.ignore_patterns(
        "node_modules", ".nx", "dist", "lookup-*.json", "expected*.json"))
    # Physical dependency copy: no path from the trial into a checkout's tests.
    shutil.copytree(skill / "node_modules", workspace / "node_modules", symlinks=True)
    dependencies = workspace / "node_modules"
    if any(p.is_symlink() and not p.resolve().is_relative_to(dependencies) for p in dependencies.rglob("*")):
        raise ValueError("Copied dependency symlink escapes the trial; do not start the agent")
    with zipfile.ZipFile(bundle) as archive:
        archive.extractall(trial / "installed")
    (trial / "output").mkdir()
    oracle = json.loads((scale / "oracle.json").read_text())
    shifts = {}
    replacements = {"SuperCoolComponent": "AuditCardComponent",
                    "CoolDialogComponent": "AuditPanelComponent",
                    "super-cool": "audit-card"}
    assert all(len(a) == len(b) for a, b in replacements.items())
    for file in sorted(workspace.rglob("*")):
        if "node_modules" in file.parts or not file.is_file():
            continue
        if file.suffix in (".ts", ".html", ".css", ".md", ".txt", ".json"):
            source = file.read_bytes().decode()
            for old, new in replacements.items():
                source = source.replace(old, new)
            if file.suffix in (".ts", ".html"):
                relative = file.relative_to(workspace).as_posix()
                shifts[relative] = 1 + int(hashlib.sha256(relative.encode()).hexdigest()[:2], 16) % 4
                source = "\n" * shifts[relative] + source
            file.write_bytes(source.encode())
    for refs in oracle["targets"].values():
        for ref in refs:
            for point in ref["range"].values():
                point["line"] += shifts.get(ref["file"], 0)

    def append(file, suffix, target, tokens, contexts, category):
        path = workspace / file
        source = path.read_bytes().decode()
        for token in tokens:
            offset = len(source) + suffix.index(token)
            def point(index):
                lines = (source + suffix)[:index].split("\n")
                return {"line": len(lines), "column": len(lines[-1].encode("utf-16-le")) // 2 + 1}
            oracle["targets"][target].append({"file": file, "range": {
                "start": point(offset), "end": point(offset + len(token))},
                "category": category, "contexts": contexts})
        path.write_bytes((source + suffix).encode())

    for app in ("admin", "storefront", "operations"):
        tags = [f'<audit-card label="{app}-review-one" />',
                f'<audit-card label="{app}-review-two" />']
        append(f"apps/{app}/src/spec.ts", "\n@Component({imports:[SharedModule],template:'" +
               " ".join(tags) + "'}) export class AdditionalReviewHost {}\n", "card", tags,
               [f"apps/{app}/tsconfig.spec.json"], "held-out-spec-template")
    file = "libs/feature00/src/feature.ts"
    contexts = copy.deepcopy(next(r["contexts"] for r in oracle["targets"]["dialog"] if r["file"] == file))
    append(file, "\nexport function launchReview(dialog: MatDialog) { return dialog.open(AuditPanelComponent); }\n",
           "dialog", ["AuditPanelComponent"], contexts, "held-out-direct-MatDialog-open")
    hashes = {f.relative_to(workspace).as_posix(): digest(f) for f in sorted(workspace.rglob("*"))
              if f.is_file() and "node_modules" not in f.parts}
    write_json(private / "oracle.json", oracle)
    write_json(private / "source-hashes.json", hashes)
    provenance = {"bundle": bundle.name, "bundleSha256": digest(bundle), "workspace": str(workspace),
                  "baselineOracleSha256": digest(scale / "oracle.json"),
                  "baselineCounts": {k: len(v) for k, v in json.loads((scale / "oracle.json").read_text())["targets"].items()},
                  "heldOutCounts": {k: len(v) for k, v in oracle["targets"].items()},
                  "sourceFiles": len(hashes), "replacements": replacements,
                  "rangeShifts": "1–4 deterministic leading blank lines per TS/HTML file",
                  "additions": "Six spec template tags and one direct dialog opening; no original cases removed",
                  "blinding": "Instruction-level only; fresh context, no keys/manifests/reports in input tree"}
    write_json(private / "provenance.json", provenance)
    print(json.dumps({"trial": str(trial), "private": str(private), "bundleSha256": digest(bundle)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, type=Path)
    parser.add_argument("--trial", required=True, type=Path)
    parser.add_argument("--private", required=True, type=Path)
    args = parser.parse_args()
    prepare(args.repo.resolve(), args.trial.resolve(), args.private.resolve())
