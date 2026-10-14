#!/usr/bin/env python3
"""Score raw class-reference evidence against a private authored trial oracle.

This is only the mechanical half of the agent evaluation. A reviewer must also
grade final classification, caller chains, negative controls, unknowns and the
peculiar ledger; raw collector success does not establish skill success.
"""
import argparse
import hashlib
import json
from pathlib import Path


def key(ref):
    span = ref["range"]
    return (ref["file"], span["start"]["line"], span["start"]["column"],
            span["end"]["line"], span["end"]["column"])


def compare(expected, reports):
    wanted = {key(ref): set(ref["contexts"]) for ref in expected}
    actual = {}
    for report in reports:
        for ref in report["references"]:
            actual.setdefault(key(ref), set()).update(c["tsconfig"] for c in ref["contexts"])
    wanted_pairs = {(location, context) for location, contexts in wanted.items() for context in contexts}
    actual_pairs = {(location, context) for location, contexts in actual.items() for context in contexts}
    missing = sorted(wanted.keys() - actual.keys())
    extra = sorted(actual.keys() - wanted.keys())
    categories = {}
    for category in sorted({r["category"] for r in expected}):
        locations = {key(r) for r in expected if r["category"] == category}
        categories[category] = {"expected": len(locations), "matched": len(locations & actual.keys())}
    return {"expectedLocations": len(wanted), "actualLocations": len(actual),
            "precision": len(wanted.keys() & actual.keys()) / len(actual) if actual else None,
            "recall": len(wanted.keys() & actual.keys()) / len(wanted),
            "missing": missing, "extra": extra,
            "expectedContextPairs": len(wanted_pairs), "actualContextPairs": len(actual_pairs),
            "missingContextPairs": sorted(wanted_pairs - actual_pairs),
            "extraContextPairs": sorted(actual_pairs - wanted_pairs), "categories": categories,
            "passed": not (missing or extra or wanted_pairs != actual_pairs)}


def score(private, workspace, card, dialog):
    oracle = json.loads((private / "oracle.json").read_text())
    results = {target: compare(oracle["targets"][target], [json.loads(p.read_text()) for p in paths])
               for target, paths in (("card", card), ("dialog", dialog))}
    hashes = json.loads((private / "source-hashes.json").read_text())
    changed = [file for file, digest in hashes.items() if not (workspace / file).is_file()
               or hashlib.sha256((workspace / file).read_bytes()).hexdigest() != digest]
    added = sorted(str(f.relative_to(workspace)) for f in workspace.rglob("*")
                   if f.is_file() and not {"node_modules", ".nx"}.intersection(f.relative_to(workspace).parts)
                   and f.relative_to(workspace).as_posix() not in hashes)
    return {"stage": "raw-reference-oracle-check", "targets": results,
            "readOnly": {"checkedFiles": len(hashes), "changed": changed, "added": added},
            "passed": all(r["passed"] for r in results.values()) and not changed and not added,
            "limitation": "Requires separate final-report, coverage and dynamic-flow review; not a production accuracy score"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--private", required=True, type=Path)
    parser.add_argument("--workspace", required=True, type=Path)
    parser.add_argument("--card", required=True, action="append", type=Path)
    parser.add_argument("--dialog", required=True, action="append", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    result = score(args.private, args.workspace, args.card, args.dialog)
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"passed": result["passed"], "targets": {k: {field: v[field] for field in (
        "expectedLocations", "actualLocations", "precision", "recall", "expectedContextPairs", "actualContextPairs")}
        for k, v in result["targets"].items()}, "readOnly": result["readOnly"]}))
    raise SystemExit(0 if result["passed"] else 1)
