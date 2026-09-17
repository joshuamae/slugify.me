# Rehearse recovery from a missing staging asset

Use this exercise to diagnose a missing JavaScript asset and restore the exact
S3 object version. Run it only against staging. Keep production available as a
read-only control.

## Before you start

1. Pause merges, deployments, rollback, and retention work for the exercise
2. Confirm both environments have a verified active release and no pending operation
3. Record the staging and production release state, distribution configuration,
   and the production homepage object version, ETag, and modification time
4. Confirm the staging bucket has versioning enabled and differs from production
5. Verify authenticated staging requests, production pages, and the chosen asset
   before introducing a fault
6. Save the staging asset's bytes, SHA-256, version ID, content type, and cache
   metadata in a private directory outside the repository
7. Prepare the recovery commands below, including permission to remove the
   exercise's delete marker and invalidate the staging path
8. Record CloudWatch alarm states and history; investigate existing alarms before
   attributing any later state change to this exercise

Use the current release manifest to choose one `assets/Home-*.js` file used by
the homepage. Do not choose a release archive, state file, HTML page, or production
object. Confirm the downloaded bytes match the manifest. Keep the existing
staging password in a protected local process or credential file, never in Git,
command arguments, logs, or the report.

Set these values from verified stack outputs and the release manifest. Examples
use placeholders deliberately:

```sh
export AWS_PROFILE="YOUR_SIGNED_IN_PROFILE"
export AWS_REGION="us-east-1"
export AWS_PAGER=""
export EXERCISE_BUCKET="VERIFIED_STAGING_BUCKET"
export EXERCISE_DISTRIBUTION="VERIFIED_STAGING_DISTRIBUTION_ID"
export EXERCISE_ASSET="assets/Home-CURRENT_HASH.js"
export EXERCISE_KEY="site/$EXERCISE_ASSET"
export EXERCISE_DIRECTORY="$(mktemp -d)"
chmod 700 "$EXERCISE_DIRECTORY"

aws s3api get-bucket-versioning --bucket "$EXERCISE_BUCKET"
aws s3api get-object --bucket "$EXERCISE_BUCKET" --key "$EXERCISE_KEY" \
  "$EXERCISE_DIRECTORY/asset-before.js" > "$EXERCISE_DIRECTORY/object-before.json"
shasum -a 256 "$EXERCISE_DIRECTORY/asset-before.js"
```

Expected result: versioning is `Enabled`, the object has a non-null version ID,
and its checksum matches the release manifest. Verify the bucket and distribution
against staging stack outputs before every mutation.

## Stop conditions

- Begin recovery immediately after collecting the failure evidence, and no later
  than ten minutes after injection
- Recover immediately if production checks fail, credentials stop working, a new
  deployment starts, or release state changes
- Recover on any unexpected command failure; do not wait for an alarm to fire
- If recovery fails, stop all additional changes and use the saved object version
  or the existing selected-release rollback procedure to restore staging

Have a recovery operator or a bounded runner with guaranteed cleanup available.
Do not run an unattended deletion followed by an unbounded wait. This exercise
does not require changing IAM, bucket policies, authentication, DNS, alarms, or
production resources.

## 1. Introduce the missing-asset failure

Record the UTC start time. Delete the current staging object **without** a version
ID, so S3 adds a delete marker and retains the original bytes:

```sh
date -u '+%Y-%m-%dT%H:%M:%SZ'
aws s3api delete-object --bucket "$EXERCISE_BUCKET" --key "$EXERCISE_KEY" \
  > "$EXERCISE_DIRECTORY/delete-marker.json"
cat "$EXERCISE_DIRECTORY/delete-marker.json"
```

Expected result: `DeleteMarker` is `true`. Save its `VersionId` as
`EXERCISE_DELETE_MARKER`. This is the new marker's ID, not the original asset's
version ID. Never permanently delete the original version.

```sh
EXERCISE_DELETE_MARKER="$(python3 -c \
  'import json, sys; value = json.load(open(sys.argv[1])); assert value["DeleteMarker"] is True; print(value["VersionId"])' \
  "$EXERCISE_DIRECTORY/delete-marker.json")"
```

Invalidate only the selected staging URL:

```sh
EXERCISE_INVALIDATION="$(aws cloudfront create-invalidation \
  --distribution-id "$EXERCISE_DISTRIBUTION" --paths "/$EXERCISE_ASSET" \
  --query Invalidation.Id --output text)"
aws cloudfront wait invalidation-completed \
  --distribution-id "$EXERCISE_DISTRIBUTION" --id "$EXERCISE_INVALIDATION"
```

Apply the ten-minute stop condition while waiting. A random query string is not
a cache bypass: the deployed asset cache policy excludes query strings. A warm
browser module cache can also hide the failure; use a fresh request after the
invalidation completes. See [CloudFront invalidation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html).

## 2. Diagnose and record the failure

1. Request the exact asset with valid staging credentials after invalidation
2. Record status, Content-Type, Cache-Control, Age, X-Cache, and body checksum
3. Confirm the homepage HTML still succeeds and production's matching asset succeeds
4. Inspect the staging object's versions and confirm the exercise marker is current
5. Compare Requests, 4xxErrorRate, and 5xxErrorRate with the same UTC interval
6. Save the successful baseline deployment output and any verification failure

Expected result: the asset returns `403` or `404` while the page can still return
`200`. A private S3 origin can report `403` for a missing key; this alone does not
prove that an IAM policy changed. The known delete marker and original version
provide the diagnosis. A failed JavaScript load can prevent hydration and live
conversion even when the server-rendered form is visible.

Use the [monitoring evidence procedure](aws-operations.md#investigate-an-alarm-and-capture-exercise-evidence).
Record actual datapoints and alarm history after publication delay. The alarms
require two breaching periods out of three and at least 20 requests per period.
A short failure may produce metrics without an ALARM transition. Do not extend
an outage solely to satisfy an alarm threshold.

The existing staging verifier deliberately sends one anonymous and one invalid
credential request for each successful check. These expected `401` responses can
dominate the aggregate 4xx metric. Correlate the deployment output and timestamps
before treating an alarm as evidence of an origin failure.

## 3. Restore the original asset

Confirm the saved marker is still the latest version for this exact key. Remove
only that marker:

```sh
aws s3api list-object-versions --bucket "$EXERCISE_BUCKET" \
  --prefix "$EXERCISE_KEY"
aws s3api delete-object --bucket "$EXERCISE_BUCKET" --key "$EXERCISE_KEY" \
  --version-id "${EXERCISE_DELETE_MARKER:?Read the saved exercise delete marker first}"
aws s3api head-object --bucket "$EXERCISE_BUCKET" --key "$EXERCISE_KEY"
```

Expected result: the original version ID, ETag, content type, cache metadata, and
modification time return unchanged. Removing the marker restores the object;
deleting without a version ID again would add another marker. See [S3 delete
marker recovery](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManagingDelMarkers.html).

Repeat the exact-path invalidation and wait for completion to remove cached
errors. Record the first successful authenticated asset response and verify its
bytes against the manifest. Measure recovery from the first confirmed failed
response to this successful response, and report the total injection-to-recovery
interval separately.

## 4. Verify recovery and publish the evidence

1. Run the existing release verifier for every manifest file and page-route variant
2. Verify staging authentication, no-store and noindex headers, missing-resource
   errors, and anonymous S3 denial
3. In a browser, load and refresh each public route, then verify real-time slug
   conversion for accented and non-ASCII text and keyboard copying
4. Verify production pages and assets and compare its release state and homepage
   object identity with the baseline
5. Confirm staging's original object and release state are restored with no pending operation
6. Capture post-exercise metrics and alarm history, then remove temporary credentials
7. Write a sanitized incident report covering impact, UTC timeline, diagnosis,
   recovery intervals, monitoring limitations, and owned follow-up work

Do not record credentials, private hostnames, bucket names, account IDs, or raw
private evidence in the public report. Keep release IDs and public workflow links
as traceable evidence. Report missing browser or monitoring evidence explicitly.

## Troubleshooting

| Symptom                                  | Action                                                                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Asset still returns `200` after deletion | Check invalidation completion, the exact URL, and the current S3 delete marker; do not assume a query parameter bypasses cache               |
| Request returns `401`                    | Fix the existing staging credentials before proceeding; this does not demonstrate the missing-asset failure                                  |
| HTML returns `200` but conversion fails  | Check the required JavaScript asset and hydration; a page-only smoke check is insufficient                                                   |
| Restored object still returns an error   | Confirm the original object version, then invalidate the error response for the exact asset path                                             |
| Alarm stays OK or was already ALARM      | Preserve the real history, traffic counts, and timing; distinguish sparse traffic and expected authentication errors from exercise detection |
| Another deployment starts                | Restore immediately, preserve evidence, and repeat later from the new verified baseline                                                      |
