"""Print a reproducible planning estimate and summarize a saved Cost Explorer response.

Uses only Python's standard library. Does not call AWS or modify resources.
Prices are a dated planning baseline; see docs/aws-operations.md.
"""

import argparse
import json
from collections import defaultdict
from decimal import Decimal
from pathlib import Path


def estimate():
    """Conservative list-price model, before account-wide free allowances."""
    rows = []
    for environment, requests, transfer_gb, storage_gb, writes in [
        ("Production", 50000, "10", "0.4", 3000),
        ("Staging", 10000, "2", "0.6", 1000),
    ]:
        rows.extend([
            (environment, "CloudFront HTTPS requests", Decimal(requests) * Decimal("0.000001")),
            (environment, "CloudFront US data transfer", Decimal(transfer_gb) * Decimal("0.085")),
            (environment, "CloudFront Functions", Decimal(requests) * Decimal("0.0000001")),
            (environment, "S3 storage including all release/object versions", Decimal(storage_gb) * Decimal("0.023")),
            (environment, "S3 GET/HEAD (one per viewer request)", Decimal(requests) * Decimal("0.0000004")),
            (environment, "S3 PUT/COPY/POST/LIST", Decimal(writes) * Decimal("0.000005")),
            (environment, "Five standard alarm metrics", Decimal("0.50")),
        ])
    rows.extend([
        ("Shared", "Route 53 hosted zone", Decimal("0.50")),
        ("Shared", "10000 non-alias DNS queries", Decimal("0.004")),
        ("Staging", "One Secrets Manager secret", Decimal("0.40")),
        ("Staging", "100 Secrets Manager API calls", Decimal("0.0005")),
        ("Shared", "One KMS key before rotations", Decimal("1")),
        ("Shared", "200 KMS requests", Decimal("0.0006")),
        ("Shared", "100 SNS publications and email deliveries", Decimal("0.00205")),
        ("Shared", "Four Cost Explorer API requests", Decimal("0.04")),
        ("Shared", "Logs, extra metrics and custom dashboards disabled", Decimal("0")),
    ])
    return rows


def summarize_costs(data):
    """Sum all returned periods, retaining cost precision and checking units."""
    groups = data.get("GroupDefinitions", [])
    if groups != [{"Type": "DIMENSION", "Key": "SERVICE"}]:
        raise ValueError("Expected exactly one SERVICE grouping; use the documented Cost Explorer command")
    periods = data["ResultsByTime"]
    if not periods or data.get("NextPageToken"):
        raise ValueError("Expected a complete, non-empty Cost Explorer response")
    totals = defaultdict(Decimal)
    for period in periods:
        for group in period["Groups"]:
            metric = group["Metrics"]["UnblendedCost"]
            if metric["Unit"] != "USD":
                raise ValueError("Expected USD costs")
            value = Decimal(metric["Amount"])
            if not value.is_finite():
                raise ValueError("Expected finite costs")
            totals[group["Keys"][0]] += value
    return dict(totals)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--costs", type=Path, help="Saved Cost Explorer JSON, grouped by SERVICE")
    args = parser.parse_args()
    rows = estimate()
    print("## Monthly planning estimate (USD, prices checked 2026-09-16)\n")
    print("| Environment | Item | Estimate |\n| --- | --- | ---: |")
    for environment, item, amount in rows:
        print(f"| {environment} | {item} | {amount:.6f} |")
    total = sum((row[2] for row in rows), Decimal(0))
    print(f"\nTotal before free allowances, credits and tax: ${total:.6f}")
    print(f"Planning remainder of a $10 budget for other account costs: ${Decimal(10) - total:.6f}")
    if args.costs:
        data = json.loads(args.costs.read_text())
        totals = summarize_costs(data)
        print("\n## Actual costs in the supplied response\n")
        for period in data["ResultsByTime"]:
            window = period["TimePeriod"]
            print(f"{window['Start']} to {window['End']} (end exclusive); estimated: {period['Estimated']}")
        print("\n| Service | USD |\n| --- | ---: |")
        for service, amount in sorted(totals.items(), key=lambda item: item[1], reverse=True):
            print(f"| {service} | {amount:.10f} |")
        print(f"\nTotal: ${sum(totals.values(), Decimal(0)):.10f}")
        print("\nScope and credit treatment follow the supplied query; this is not automatically project-only spending.")
        print("Do not compare a partial-period account total directly with a full-month website estimate.")


if __name__ == "__main__":
    main()
