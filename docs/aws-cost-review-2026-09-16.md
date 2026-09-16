# AWS cost review for September 2026

The first review establishes a baseline for staging, production and monitoring.
This is a mid-month review, not a finalized September bill. The next full-month
review is due on October 3, 2026, owned by the project maintainer.

## Scope and evidence

- Review date: 2026-09-16 UTC
- Cost Explorer interval: 2026-09-01 inclusive through 2026-09-16 exclusive
- Metric: UnblendedCost grouped by SERVICE, excluding Credit and Refund records
- Scope: Entire account, including workloads unrelated to this website
- Data status: Estimated; billing updates can arrive later
- Calculations: Python Decimal through `scripts/review-aws-costs.py`
- Resource inventory: Both site buckets including all object versions, live CloudFront configuration, budget notifications/subscribers, cost-allocation tag status, and pricing-plan subscriptions

Raw API responses contain account-specific identifiers and remain outside the
repository. The following tables are sanitized summaries.

## Actual costs and budget

| Service                 | USD before credits |
| ----------------------- | -----------------: |
| EC2 compute             |       3.9598358672 |
| Virtual Private Cloud   |       0.6514500100 |
| EC2 other               |       0.1612795485 |
| Cost Explorer           |       0.0200000000 |
| S3                      |       0.0084305416 |
| Secrets Manager         |       0.0033402479 |
| Route 53                |       0.0001324000 |
| DynamoDB                |       0.0000035000 |
| CloudShell              |       0.0000000552 |
| Other returned services |       0.0000000000 |
| Total                   |   **4.8044721704** |

The budget snapshot at 13:07 UTC reported $4.807 actual spend and $6.831 forecast
against the $10 monthly limit. Its refresh time and coverage differ slightly
from the Cost Explorer query. The budget was healthy; actual alerts at 85% and
100% and the forecast alert at 100% were all in OK state. Each notification had
the same intended email subscriber. The existing budget was preserved.

This verifies notification configuration, not a real budget breach or delivery
of a threshold-triggered budget email. The separately configured monitoring
SNS subscription and test email were confirmed by the owner during this review.

## Comparison with the estimate

The [operating estimate](aws-operations.md#planning-assumptions) is **$4.100150
per month** for website hosting and monitoring at 60,000 combined HTTPS requests,
12 GB delivered, and 1 GB retained storage. It assumes list prices before free
allowances, promotional credits and tax, and includes both environments.

The partial-month account total cannot be compared directly with that
full-month website estimate. EC2 and networking account for $4.7725654257, or
99.34% of the observed total, and are outside the static-site architecture.
Existing billing tags were inactive, so this review cannot reliably separate
all historical project costs from other usage within the same services.

CloudFront and CloudWatch costs were zero in the query. This is not evidence
that future usage is free: the new monitoring resources were created after the
query interval, and account-wide allowances can be consumed by other workloads.
The conservative new monitoring increment is $2.002650 for a full month before
allowances. Adding that to the existing $6.831 forecast gives a planning check
of **$8.833650**, below $10. This arithmetic is not an updated AWS forecast and
does not assume any reduction in the existing forecast's other costs.

Neither distribution had a flat-rate subscription. Both live distributions
still used their existing custom cache policy. Local managed-policy changes
were present but were not deployed as part of this review. Estimates therefore
do not assume a Free plan or associated credits.

## Release storage

| Environment | Stored versions | Bytes across all versions | Bytes in noncurrent versions | Bytes under releases/ |
| ----------- | --------------: | ------------------------: | ---------------------------: | --------------------: |
| Production  |             151 |                 5,485,381 |                    2,679,615 |             1,969,453 |
| Staging     |             404 |                13,289,672 |                    8,943,165 |             3,614,722 |

The total is approximately 0.01749 GiB, comfortably within the 1 GB planning
allowance. The noncurrent and releases columns overlap; do not add them to the
all-version total. No archive or object-version cleanup was justified or
performed. Cached assets and rollback candidates remain protected.

## Monitoring and logging verification

- Monitoring stack reached CREATE_COMPLETE with six alarms and encrypted SNS notifications
- Default CloudFront request and error metrics selected, with no paid additional metrics or custom dashboard
- Owner confirmed the email subscription and receipt of the clearly labeled test alarm
- CloudWatch recorded successful test ALARM publication at 13:41:01 UTC and recovery publication at 13:41:24 UTC
- All six alarms subsequently reached OK with actions enabled
- Notification test changed only an alarm state; no website failure was introduced
- CloudFront legacy logging disabled, no standard-v2 delivery sources in us-east-1, no real-time logging association, and S3 access logging disabled on both site buckets
- No CloudWatch log groups in us-east-1 at inspection; no new application logging added
- Monitoring remains dependent on viewer traffic and does not prove availability during quiet periods
- Controlled failure evidence remains to be collected in #66; the notification test does not replace it
- Both hosting stacks reached UPDATE_COMPLETE after reviewed tag-only updates with no resource replacement
- Verified tags on both site buckets, distributions, deployment roles, the shared OIDC provider, DNS zone, ACM certificate, staging digest secret, and new monitoring resources
- Production passed all 40 manifest file/route checks, missing-resource checks and anonymous S3 denial after the updates
- Staging anonymous access still returned 401 with no-store and noindex; authenticated staging content and browser behavior were not retested in this batch
- Original live CloudFront cache policies and origin prefixes preserved; no application release published

## Corrective actions and next review

| Finding                                                | Action                                                                                                                           | Owner and follow-up                                                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Cost allocation tags inactive                          | Activated Project and Environment; verified Active status                                                                        | Maintainer: check project attribution after billing propagation, then at the October review             |
| Distribution, deployment-role and OIDC tags incomplete | Added explicit template tags, deployed isolated tag updates and verified them; tagged the separately bootstrapped staging secret | Maintainer: preserve shared OIDC ownership and verify tagged resources after each infrastructure change |
| Account spend dominated by compute and networking      | Flagged for an account-level review; no unrelated resources stopped or modified                                                  | Account owner: inspect before the next budget threshold or October review                               |
| No monitoring alerts                                   | Deployed request and error alarms; verified encrypted email delivery                                                             | Maintainer: tune thresholds after one week and after #66                                                |
| Retained versions accumulate                           | Included every object version in the storage baseline                                                                            | Maintainer: inspect monthly; use protected retention preview before any cleanup                         |
| New recurring key cost                                 | Included $1/month plus request charges; recorded rotation and teardown costs                                                     | Maintainer: revisit before annual rotation or removing monitoring                                       |
| Historical cost attribution incomplete                 | Keep account totals alongside project-filtered reports                                                                           | Maintainer: do not present untagged charges as zero website cost                                        |

Repeat the review with finalized September data on **October 3, 2026**, using
the commands in the [monthly review procedure](aws-operations.md#review-costs-each-month).
Record actual-versus-estimated traffic, transfer, storage, monitoring charges,
free allowances, untagged/shared costs, budget forecast and any corrective work.
