import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import path from 'node:path';
import { compareInventory, verifyEvidence, integrity } from '../skill/angular-usage-lookup/tests/blind/scoring.mjs';
const { values } = parseArgs({ options: { private: { type: 'string' }, input: { type: 'string' }, output: { type: 'string' } } });
if (!values.private || !values.input || !values.output) throw new Error('Required --private DIR --input DIR --output FILE');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const oracle = await json(path.join(values.private, 'oracle.json'));
const hashes = await json(path.join(values.private, 'source-hashes.json'));
const inventory = await json(path.join(values.input, 'output/inventory.json'));
const scope = compareInventory(oracle, inventory);
const evidence = await verifyEvidence(oracle, inventory, path.join(values.input, 'workspace'), path.join(values.input, 'output'));
const readOnly = await integrity(path.join(values.input, 'workspace'), hashes);
const result = { scope, evidence, readOnly, passed: scope.passed && evidence.passed && readOnly.passed,
  limitation: 'Mechanical static-site and linked-evidence check; full report classification, gaps and installed-bundle integrity require separate review.' };
await writeFile(values.output, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
process.exitCode = result.passed ? 0 : 1;
