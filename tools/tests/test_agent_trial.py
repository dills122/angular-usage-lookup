"""Guard against false passes and answer-key leakage in manual agent trials."""
import importlib.util
from pathlib import Path
import tempfile
import unittest


def load(name):
    path = Path(__file__).parents[1] / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


prepare = load("prepare-agent-trial").prepare
compare = load("score-agent-trial").compare


class AgentTrialTests(unittest.TestCase):
    def setUp(self):
        self.expected = {"file": "consumer.ts", "range": {
            "start": {"line": 1, "column": 3}, "end": {"line": 1, "column": 12}},
            "contexts": ["app.json", "lib.json"], "category": "template"}
        self.actual = {**self.expected, "contexts": [{"tsconfig": c} for c in self.expected["contexts"]]}

    def test_duplicate_query_results_merge_without_inflating_counts(self):
        result = compare([self.expected], [{"references": [self.actual, self.actual]}])
        self.assertTrue(result["passed"])
        self.assertEqual(result["actualLocations"], 1)
        self.assertEqual(result["actualContextPairs"], 2)

    def test_equal_physical_counts_do_not_hide_missing_config_coverage(self):
        incomplete = {**self.actual, "contexts": [{"tsconfig": "app.json"}]}
        result = compare([self.expected], [{"references": [incomplete]}])
        self.assertEqual(result["recall"], 1)
        self.assertFalse(result["passed"])
        self.assertEqual(len(result["missingContextPairs"]), 1)

    def test_equal_counts_do_not_hide_wrong_ranges_or_identity(self):
        wrong = {**self.actual, "file": "unrelated-same-name.ts"}
        result = compare([self.expected], [{"references": [wrong]}])
        self.assertEqual(result["expectedLocations"], result["actualLocations"])
        self.assertEqual(result["precision"], 0)
        self.assertEqual(result["recall"], 0)
        self.assertFalse(result["passed"])

    def test_empty_results_are_not_a_success(self):
        result = compare([self.expected], [{"references": []}])
        self.assertIsNone(result["precision"])
        self.assertEqual(result["recall"], 0)
        self.assertFalse(result["passed"])

    def test_answer_key_and_input_roots_must_be_disjoint(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for trial, private in ((root / "input", root / "input/private"),
                                   (root / "private/input", root / "private"),
                                   (root / "same", root / "same")):
                with self.subTest(trial=trial, private=private):
                    with self.assertRaisesRegex(ValueError, "disjoint"):
                        prepare(root / "repo", trial, private)
            self.assertEqual(list(root.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
