# Monitor AWS hosting and review monthly costs

Use this runbook to investigate CloudFront alarms, verify notifications, and
compare AWS spending with the monthly budget. Slug generation stays in the
browser; monitoring does not send entered text to AWS.

## Monitoring coverage

`infra/monitoring.yaml` defines a separate stack in `us-east-1`, where CloudFront
publishes its global metrics. It creates six alarms, one SNS email subscription,
one encrypted SNS topic and its policy, and a retained KMS encryption key.
Hosting and the existing account budget remain in their own lifecycles.

View **Requests**, **4xx error rate**, and **5xx error rate** for each distribution
under **CloudFront → Monitoring**. These default metrics have no additional
metric charge. The stack does not enable paid additional metrics or create a
custom dashboard. See [CloudFront monitoring](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/monitoring-using-cloudwatch.html).

### Alarm thresholds

All alarms require two breaching five-minute periods out of the most recent
three. Both ALARM and OK state changes notify the confirmed operator address.

| Alarm          | Production                         | Staging                          | First response                                                               |
| -------------- | ---------------------------------- | -------------------------------- | ---------------------------------------------------------------------------- |
| Request volume | At least 1,000 requests per period | At least 500 requests per period | Compare with deployments and recent traffic; check cost exposure             |
| 4xx error rate | At least 10%                       | At least 50%                     | Check valid pages and assets, staging authentication, and origin permissions |
| 5xx error rate | At least 5%                        | At least 5%                      | Check origin access, CloudFront function errors, and AWS service health      |

The error alarms evaluate only periods with at least 20 requests. The 4xx/5xx
metrics use `Average`; request volume uses `Sum`. CloudFront's five-minute
average error rate is not a reconstructed request-weighted error count.
Staging's higher 4xx threshold accommodates expected unauthorized visits.
These are initial operating thresholds, not a service-level guarantee; review
them after the first week and after the staging failure exercise.

Missing data is explicitly non-breaching. **An OK alarm does not prove the site
is available**: a quiet site, DNS failure, or traffic below the minimum can hide
an outage. Existing deployment and rollback workflows verify pages and required
assets, but run only during those operations. This stack does not add a scheduled
synthetic browser check or test browser JavaScript between deployments.

### Deploy or update monitoring

Run commands from the repository root with AWS CLI access. Set `AWS_PROFILE` to
your chosen signed-in profile. Use the distribution IDs from the hosting stack
outputs. Keep the email address and account-specific parameter files out of Git.

1. Review `infra/monitoring.yaml` and its thresholds
2. Validate the template and security rules

    ```sh
    cfn-lint --regions us-east-1 --template infra/monitoring.yaml
    cfn-guard validate --rules infra/monitoring.guard --data infra/monitoring.yaml
    aws cloudformation validate-template --region us-east-1 \
      --template-body file://infra/monitoring.yaml
    ```

3. Create a change set, replacing the example values

    ```sh
    aws cloudformation create-change-set --region us-east-1 \
      --stack-name static-site-monitoring \
      --change-set-name monitoring-initial \
      --change-set-type CREATE \
      --template-body file://infra/monitoring.yaml \
      --parameters \
        ParameterKey=ProductionDistributionId,ParameterValue=PRODUCTION_DISTRIBUTION_ID \
        ParameterKey=StagingDistributionId,ParameterValue=STAGING_DISTRIBUTION_ID \
        ParameterKey=AlertEmail,ParameterValue=operator@example.com \
      --tags Key=Project,Value=static-site Key=Environment,Value=shared
    ```

4. Wait for change-set creation, inspect changes and validation findings, then execute the reviewed change set

    ```sh
    aws cloudformation wait change-set-create-complete --region us-east-1 \
      --stack-name static-site-monitoring --change-set-name monitoring-initial
    aws cloudformation describe-change-set --region us-east-1 \
      --stack-name static-site-monitoring --change-set-name monitoring-initial
    aws cloudformation describe-events --region us-east-1 \
      --stack-name static-site-monitoring --change-set-name monitoring-initial
    aws cloudformation execute-change-set --region us-east-1 \
      --stack-name static-site-monitoring --change-set-name monitoring-initial
    aws cloudformation wait stack-create-complete --region us-east-1 \
      --stack-name static-site-monitoring
    ```

5. Confirm the SNS subscription in the operator inbox and perform the delivery test below

Expected result: six alarms with actions enabled, a confirmed email subscription,
and a successful notification test. CloudFormation completion alone does not
confirm the email subscription or prove delivery.

For later changes, use a new change-set name and `--change-set-type UPDATE`.
Preserve every existing parameter with `UsePreviousValue=true` except the values
you intentionally change. Use the `stack-update-complete` waiter after execution.
Do not pass masked `NoEcho` values back as new parameter values.

The KMS key supports CloudWatch publishing through an account- and alarm-scoped
key policy. The AWS-managed SNS key cannot be customized for that service grant.
The topic policy also limits CloudWatch publishing to this stack's alarms.

### Test notification delivery

This test changes only a staging alarm's state. It does not test whether real
errors cross the threshold or fulfill the controlled failure exercise in #66.

1. Confirm that the email subscription has a real subscription ARN, not `PendingConfirmation`
2. Record the alarm's initial state and ensure no real staging incident is active
3. Trigger a clearly labeled test and inspect the action history

    ```sh
    aws cloudwatch set-alarm-state --region us-east-1 \
      --alarm-name static-site-monitoring-staging-requests \
      --state-value ALARM \
      --state-reason 'TEST ONLY: notification delivery check; no website outage'
    aws cloudwatch describe-alarm-history --region us-east-1 \
      --alarm-name static-site-monitoring-staging-requests \
      --history-item-type Action
    ```

4. Confirm the test email arrived, then end the test

    ```sh
    aws cloudwatch set-alarm-state --region us-east-1 \
      --alarm-name static-site-monitoring-staging-requests \
      --state-value OK \
      --state-reason 'TEST COMPLETE: resume normal metric evaluation'
    ```

5. Record the UTC timestamp, publish-action result, recipient confirmation, and final state

CloudWatch can resume normal evaluation before the manual reset. A successful
publish action proves acceptance by SNS; recipient confirmation proves inbox
delivery. If no email arrives, check subscription confirmation, spam filtering,
alarm actions, and KMS/topic policy failures in alarm history. Do not weaken the
key policy to make the test pass.

### Investigate an alarm and capture exercise evidence

1. Record UTC start/end times, affected environment, alarm history, and the active release from `releases/state.json`
2. Inspect Requests, 4xxErrorRate, and 5xxErrorRate over the same interval using `DistributionId` and `Region=Global`
3. Reproduce the failure on a known page and an asset referenced by that page; use valid staging credentials through the existing protected verification procedure
4. Compare response status, Content-Type, Cache-Control, Age, X-Cache, and body checksums with the release manifest
5. Follow the [release recovery procedure](../README.md#deploy-staging-and-promote-to-production), then verify every route and asset and test real-time conversion in a browser

A warm CloudFront cache can hide an S3 origin failure. A random query string is
not a reliable bypass because the site's cache policies omit query strings.
Before testing origin access, complete an invalidation for the test path or use
a never-requested object path. Confirm the actual deployed cache policy: local
managed-policy changes do not update CloudFront until deployed.

For #66, agree on a reversible staging-only fault, recovery steps and stop
conditions before injection. Capture metrics and alarms before, during and after
the failure; keep production requests as a control. Allow metric publication
delay and the two-of-three evaluation window. Record whether the request minimum
was reached; do not label an absence of alarms a successful detection. Link the
incident report here after the exercise. The notification-only test is separate.

Example evidence command, with an explicit UTC interval:

```sh
aws cloudwatch get-metric-statistics --region us-east-1 \
  --namespace AWS/CloudFront --metric-name 5xxErrorRate \
  --dimensions Name=DistributionId,Value=STAGING_DISTRIBUTION_ID Name=Region,Value=Global \
  --start-time START_UTC --end-time END_UTC --period 300 --statistics Average
```

Repeat for `4xxErrorRate` with `Average` and `Requests` with `Sum`. Keep raw
account-specific output private; publish a sanitized summary of the evidence.

## Logging and retention decision

| Data                                                      | Decision                                       | Retention and cost                                                                                                                        |
| --------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| CloudFront standard, real-time, and S3 server access logs | Disabled                                       | No visitor access-log storage or ingestion charge                                                                                         |
| CloudFront Functions application logs                     | No request/header/body logging in the function | No application log stream created by this implementation                                                                                  |
| Default CloudFront metrics                                | Enabled automatically                          | CloudWatch aggregation: 1-minute data for 15 days, 5-minute for 63 days, hourly for 455 days; default metrics free                        |
| CloudWatch alarm history                                  | Retained by AWS                                | 30 days; capture sanitized incident evidence before expiry                                                                                |
| GitHub HTTP verification artifacts                        | Retained by workflow                           | 30 days; may contain operational URLs and headers, never credentials                                                                      |
| GitHub workflow logs                                      | Repository retention setting                   | Review repository retention and visibility; do not print staging authorization                                                            |
| CloudTrail management event history                       | Existing AWS default                           | 90 days; administrator activity can include identity and source IP; no new trail or data-event logging added                              |
| Release archives and object versions                      | Existing protected retention workflow          | Active, previous, newest ten and recent 30-day releases protected; retained cached assets and noncurrent S3 versions also consume storage |
| Alarm email                                               | Operator inbox                                 | Inbox retention controlled by the recipient; messages contain operational resource identifiers                                            |

Access logs could retain visitor IP addresses, URL paths/query strings, user
agents and referrers. Keeping them disabled is a deliberate privacy and cost
choice, with less request-level diagnostic detail. This is not a claim that AWS
retains no service or security records. Review the decision if aggregated
metrics and manifest checks cannot diagnose a real incident. Any later access
logging change needs explicit fields, access controls, retention and a revised
cost estimate and hosting disclosure. Complete public privacy-copy changes in
#70 after the migration work.

Sources: [CloudWatch retention](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html),
[alarm history](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html),
[CloudTrail event history](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html),
and [CloudFront logging costs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logging.html).

### Verification on 2026-09-16

The monitoring stack deployed successfully. The owner confirmed its SNS
subscription and receipt of the test alarm. CloudWatch recorded successful
ALARM publication at 13:41:01 UTC and recovery publication at 13:41:24 UTC;
all six alarms subsequently reached OK. This establishes notification delivery,
not detection of a real hosting failure. Monitoring evidence for #66 remains
outstanding.

## Monthly budget and estimate

Use the existing **$10 monthly account budget**. Its actual-spend alerts are at
85% and 100%, and its forecast alert is at 100%, using `GREATER_THAN` comparison.
These correspond to spending above $8.50 and $10, and a forecast above $10.
All three notifications target the existing operator email address. The budget
uses unblended costs and excludes credits/refunds, so credits cannot conceal
underlying usage. It includes other workloads in the account.

Budget alerts **do not impose a hard spending cap** or stop resources. Billing
data and notifications are delayed. Reuse this budget; the monitoring template
does not create a duplicate or enable automatic shutdown actions. Budget
configuration checks do not demonstrate a real threshold-triggered email.
See [AWS Budgets notifications](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-sns-policy.html)
and [Budgets pricing](https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/).

### Planning assumptions

The reproducible estimate in `scripts/review-aws-costs.py` uses list prices
checked on 2026-09-16, before free allowances, promotional credits or tax:

- Production: 50,000 HTTPS requests and 10 GB delivered per month
- Staging: 10,000 HTTPS requests and 2 GB delivered per month
- US CloudFront viewer pricing, S3 Standard in us-east-1, and one function invocation per request
- S3 GET/HEAD for every viewer request as a conservative cache-miss assumption; 3,000 production and 1,000 staging write/list requests for releases and verification
- 0.4 GB production and 0.6 GB staging storage, including site assets, release archives, manifests, and all noncurrent object versions
- One DNS zone and 10,000 non-alias DNS queries; CloudFront alias queries free
- One existing staging Secrets Manager secret and 100 API calls
- Ten billable alarm metrics across six alarms, one KMS key, 200 KMS requests, 100 SNS publications/email deliveries, and four Cost Explorer API requests
- No paid additional CloudFront metrics, custom dashboards, access logs, Route 53 health checks, or scheduled synthetic checks
- At most 1,000 invalidation paths across the account per month, within the existing free allowance

| Component                                            | Monthly USD before free allowances |
| ---------------------------------------------------- | ---------------------------------: |
| CloudFront requests, delivery and functions          |                           1.086000 |
| S3 storage and requests, including release retention |                           0.067000 |
| DNS                                                  |                           0.504000 |
| Existing staging secret and API calls                |                           0.400500 |
| Six alarms using ten metrics                         |                           1.000000 |
| Notification key and KMS calls                       |                           1.000600 |
| SNS publication and email                            |                           0.002050 |
| Four cost-review API requests                        |                           0.040000 |
| Total                                                |                       **4.100150** |

This leaves $5.899850 of the $10 account budget for other charges under these
assumptions. It is a planning estimate, not a maximum. Global viewer regions can
cost more than the US rate. The first and second automatic KMS key rotations
each add $1/month; revisit the estimate before the first annual rotation.
Domain registration stays with the existing registrar and is outside this AWS
estimate. Non-exportable ACM certificates and CloudFormation for AWS resources
have no additional charge under this setup.

CloudFront pay-as-you-go free allowances, CloudWatch's first ten eligible alarm
metrics, and SNS/KMS allowances are shared across the account. Check actual
eligibility and consumption rather than subtracting them twice. Neither
distribution was enrolled in a CloudFront flat-rate plan at the first review.
Recalculate after any plan enrollment, traffic change, logging change, or cache
policy deployment. Budget alerts still cover services outside a CloudFront plan.

Pricing sources: [CloudFront](https://aws.amazon.com/cloudfront/pricing/),
[S3](https://aws.amazon.com/s3/pricing/), [Route 53](https://aws.amazon.com/route53/pricing/),
[CloudWatch](https://aws.amazon.com/cloudwatch/pricing/), [KMS](https://aws.amazon.com/kms/pricing/),
[SNS](https://aws.amazon.com/sns/faqs/), [Secrets Manager](https://aws.amazon.com/secrets-manager/pricing/),
and [Cost Explorer](https://aws.amazon.com/aws-cost-management/aws-cost-explorer/pricing/).

### Review costs each month

The owner performs the review on the third day of each month for the preceding
calendar month, with an additional review after any budget alert. This is an
operating procedure; no recurring task has been scheduled automatically.

1. Confirm today's UTC date and choose an inclusive start and exclusive end for the prior month
2. Fetch account costs before credits/refunds and the existing budget's actual/forecast values
3. Run the estimate and summarize the saved cost response using decimal arithmetic
4. Compare like periods and scopes, investigate unexpected services, and review resource storage and tags
5. Record findings, corrective actions, the responsible owner, and the next review date

```sh
date -u '+%Y-%m-%dT%H:%M:%SZ'
aws ce get-cost-and-usage --region us-east-1 \
  --time-period Start=YYYY-MM-01,End=YYYY-MM-01 \
  --granularity MONTHLY --metrics UnblendedCost \
  --filter '{"Not":{"Dimensions":{"Key":"RECORD_TYPE","Values":["Credit","Refund"]}}}' \
  --group-by Type=DIMENSION,Key=SERVICE > /tmp/aws-monthly-costs.json
python3 scripts/review-aws-costs.py --costs /tmp/aws-monthly-costs.json
aws budgets describe-budget --region us-east-1 \
  --account-id ACCOUNT_ID --budget-name 'EXISTING_BUDGET_NAME'
```

Replace the first date with the month being reviewed and the second with the
first day of the following month. Check the returned `TimePeriod` and `Estimated`
flag. For a mid-month check, use today's UTC date as the exclusive end; do not
compare that partial account total directly with a full-month website estimate.

For notification verification, list the budget notifications, then run
`describe-subscribers-for-notification` for each returned notification. Confirm
all three comparison types and thresholds, an intended recipient for each, and
a healthy budget status. Keep the recipient address out of public reports.

Use `Project=static-site` and `Environment=staging|production|shared` where tags
are supported. Billing cost-allocation keys `Project` and `Environment` must
also be activated. Check their status using `aws ce list-cost-allocation-tags`.
The staging digest secret is bootstrapped outside CloudFormation; preserve its
Project and Environment tags when creating or rotating it. No secret value is
needed to inspect or update tags.
Tagging a resource alone does not activate billing attribution, and historical
project allocation may be incomplete. Include untagged and shared charges in
the account review rather than assuming a zero project-filter result means free
hosting. CloudFront functions, cache policies, OACs and response-header policies
do not expose the same tagging support as distributions.

Inspect S3 with `list-object-versions`, not only `list-objects-v2`: overwritten
files and retained versions still cost money. Use the existing release retention
preview before cleanup. Never remove active/previous releases, clear pending
release state, or delete cached assets just to reduce a small storage charge.

See [the first cost review](aws-cost-review-2026-09-16.md) for the baseline and
the initial corrective actions.

The cost helper's focused tests run separately from the npm application checks:

```sh
python3 -B -m unittest discover -s scripts -p 'test_*.py'
```

## Teardown and retained resources

Remove monitoring only after agreeing on replacement coverage. Deleting its
stack removes the alarms, topic and subscription, but retains the KMS key.
That retained key continues to incur charges until it is separately retired;
first check for remaining encrypted messages and any other consumers. Hosting
stacks, site buckets, releases, and the existing account budget are independent
and are not removed by monitoring teardown.
