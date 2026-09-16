"""Run with python3 -B -m unittest discover -s scripts -p 'test_*.py'."""

import runpy
import unittest
from decimal import Decimal
from pathlib import Path

summarize = runpy.run_path(str(Path(__file__).with_name("review-aws-costs.py")))["summarize_costs"]


def response(*amounts):
    """Build a SERVICE-grouped USD report with one period per supplied amount."""
    return {
        "GroupDefinitions": [{"Type": "DIMENSION", "Key": "SERVICE"}],
        "ResultsByTime": [
            {"Groups": [{"Keys": ["Example service"], "Metrics": {
                "UnblendedCost": {"Amount": amount, "Unit": "USD"}
            }}]} for amount in amounts
        ],
    }


class CostReviewTests(unittest.TestCase):
    """Check cost precision and reject reports that would misstate spending."""

    def test_sums_periods_without_float_rounding_and_preserves_adjustments(self):
        """Retain fractional cents and negative adjustments across periods."""
        self.assertEqual(
            summarize(response("0.1", "0.2", "-0.05", "0.0000000001")),
            {"Example service": Decimal("0.2500000001")},
        )

    def test_rejects_incomplete_pagination(self):
        """Reject a response that omits another page of billed services."""
        data = response("1")
        data["NextPageToken"] = "another-page"
        with self.assertRaises(ValueError):
            summarize(data)

    def test_rejects_wrong_grouping_and_mixed_currency(self):
        """Reject reports that cannot be interpreted as service totals in USD."""
        data = response("1")
        data["GroupDefinitions"][0]["Key"] = "USAGE_TYPE"
        with self.assertRaises(ValueError):
            summarize(data)
        data = response("1")
        data["ResultsByTime"][0]["Groups"][0]["Metrics"]["UnblendedCost"]["Unit"] = "EUR"
        with self.assertRaises(ValueError):
            summarize(data)

    def test_rejects_nonfinite_and_empty_reports(self):
        """Reject undefined amounts and reports without any billing periods."""
        for data in [response("NaN"), response("Infinity"), response()]:
            with self.assertRaises(ValueError):
                summarize(data)


if __name__ == "__main__":
    unittest.main()
