# Staging asset failure exercise — September 16, 2026

Status: staging restored; HTTP and owner-performed browser recovery checks passed.

This report records the execution of the [staging failure procedure](aws-staging-failure-exercise.md)
for #66 and the associated monitoring evidence for #63. A missing staging
JavaScript asset produced 25 confirmed authenticated `403` responses after
CloudFront invalidation. Removing the exercise's delete marker restored the
original object. Production verification passed throughout the exercise.

## Scope and recovery plan

Temporarily add a delete marker to one staging homepage JavaScript asset,
invalidate its exact CloudFront path, reproduce the failed authenticated request,
and remove only that marker to restore the original object version and metadata.
Invalidate the path again and verify the current release. Production is a
read-only control throughout the exercise.

Recover immediately after collecting the failure evidence, within ten minutes
of injection, or on an unexpected error, production failure, credential failure,
new deployment, or release-state change. Do not extend the fault to force an alarm.

## Known-good release

Both environments record active release `2882b3186feb-35117898185-1`, previous
release `59360c0fd0e3-35107837010-1`, and no pending operation.
The [baseline deployment](https://github.com/joshuamae/slugify.me/actions/runs/35117898185)
passed infrastructure validation, environment planning, and publication. Its
40 file/route checks completed in staging at 15:52:09 UTC and production at
15:54:46 UTC.

The active archive SHA-256 is
`940797de0b9e5baaa6f2ba042b137c456dc212d37583e59165bac448795a4816`.
The manifest SHA-256 is
`b7332526f144969bb9968208730a3a541ab9f06bb244925fec9b2fde51449b84`.

## Initial monitoring finding

The staging 4xx alarm entered ALARM at 16:00:58 UTC, before this exercise.
Its recorded breaching values were 62.5% and 67.41071428571429% in the periods
identified by alarm history as 15:46 and 15:51 UTC. These intervals overlap
the successful deployment's staging verification. The verifier sends two
deliberately unauthorized requests for every successful file/route check.

This is consistent with expected authentication failures driving the aggregate
alarm. It is not evidence of the planned missing-asset fault. Request-level
access logs are disabled, so the aggregate metric alone cannot classify every
4xx response. Production alarms and staging request/5xx alarms were OK when
initially inspected.

## Impact and diagnosis

The affected file was `assets/Home-B9yoOiFF.js`, a 7,101-byte homepage JavaScript
module. Its verified SHA-256 before and after the exercise was
`1b1ed0f9171da2c62b9bb5d074e355a5f2be279ddcb84f5be3d48b227757add9`.

Only the staging copy was changed. The original version stayed in S3, and the
release archive, manifest, and state were not modified. The fault was confirmed
by the current delete marker and the retained original object version. The
authenticated homepage still returned its expected HTML while the required
module failed. Fresh browser loads could therefore lose hydration and live
conversion despite a successful page-only smoke check. No affected visitor
count or during-failure browser result is claimed.

| Observation   | Failed staging asset    | Recovered staging asset          | Production control                                  |
| ------------- | ----------------------- | -------------------------------- | --------------------------------------------------- |
| HTTP status   | `403`                   | `200`                            | `200`                                               |
| Content-Type  | `application/xml`       | `text/javascript; charset=utf-8` | `text/javascript; charset=utf-8`                    |
| Cache-Control | `private, no-store`     | `private, no-store`              | `public,max-age=31536000,immutable`                 |
| X-Cache       | `Error from cloudfront` | `Miss from cloudfront`           | `Hit from cloudfront`                               |
| Age           | Absent                  | Absent                           | `69` seconds on the recorded during-failure control |
| Body          | 111-byte error XML      | Exact original module            | Exact original module                               |

The failure XML SHA-256 was
`a824bc7739e226e1b40ea0f8c4e4f4c6f796fc3b4abfa6e9abe3bd119a30d938`.
Staging retained `X-Robots-Tag: noindex` on both failed and recovered responses.
The production control's cached success alone would not establish origin health;
the exercise also compared object identity and verified every published file.

## Timeline and recovery time

All timestamps are UTC on September 16, 2026. The runner used a cleanup block
to restore the asset after evidence collection or an unexpected error. It checked
for active GitHub workflows and release-state changes during probing, and used
a recovery deadline shorter than the ten-minute maximum. No stop condition fired.

| Time         | Observed event                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| 16:18:42.582 | Authenticated staging and production baseline checks passed; release state, object identity, and alarm state saved |
| 16:19:17.070 | Staging delete marker created                                                                                      |
| 16:19:18.032 | Exact-path failure invalidation submitted                                                                          |
| 16:19:36.399 | Failure invalidation completed                                                                                     |
| 16:19:36.652 | First authenticated asset failure confirmed as `403`                                                               |
| 16:19:51.043 | All 25 deliberate asset probes confirmed `403`                                                                     |
| 16:19:51.440 | Staging homepage HTML verified as `200` with exact expected bytes                                                  |
| 16:19:52.154 | Production asset control verified as `200` with exact expected bytes                                               |
| 16:19:53.346 | S3 version listing confirmed the current delete marker and retained original version                               |
| 16:19:54.121 | Recovery started                                                                                                   |
| 16:19:56.584 | Only the exercise's delete marker removed                                                                          |
| 16:19:57.358 | Original version ID, ETag, modification time, size, content type, and cache metadata verified                      |
| 16:19:58.167 | Exact-path recovery invalidation submitted                                                                         |
| 16:20:16.729 | Recovery invalidation completed                                                                                    |
| 16:20:17.009 | First recovered authenticated asset request returned `200` and matched the manifest                                |
| 16:20:50.218 | Staging passed all 40 file/route checks and additional access/error checks                                         |
| 16:21:07.190 | Production passed all 40 file/route checks and additional access/error checks                                      |
| 16:21:10.542 | Both release-state documents and the production homepage identity matched baseline; no workflow was active         |

- Confirmed failed response to confirmed recovery: 40.357 seconds
- Delete-marker creation to confirmed recovery: 59.939 seconds
- Recovery action start to confirmed recovery: 22.888 seconds

These are probe-based intervals, not a claim about every edge location or browser.
The first interval includes diagnosis and recovery. The second also includes
the initial cache invalidation. Both invalidations targeted only the affected
staging asset path; production received no writes or invalidations.

## Recovery verification

The operator runner called the repository's existing `verifyPublished` function.
It passed all 33 manifest files and seven route variants in each environment,
checking content bytes, size, MIME type, and cache headers. Staging also passed
anonymous and incorrect-credential denial on every checked URL after warming
the cache, along with noindex and no-store checks. Missing assets and unknown
routes returned errors, and anonymous direct S3 access was denied.

The original staging object version and metadata were restored, rather than
replaced with a new object. Both release-state documents retained identical
checksums, active and previous releases, and `pending: null`. Production's
homepage version ID, ETag, modification time, and other object metadata matched
the baseline exactly. Authenticated failure probes were interleaved with
successful production asset controls.

The baseline GitHub workflow's six jobs all reported success. This exercise ran
through an operator process, so no new deployment workflow run is claimed. Its
timestamped command results, request headers, state snapshots, manifests, object
metadata, and CloudWatch responses were retained in a private local evidence
directory. Credentials and account-specific resource identifiers are excluded
from this report. The temporary local staging credential was removed after
verification.

The owner confirmed the recovery browser checks after the HTTP verification:
hard-refreshing the homepage, immediate conversion of `Crème brûlée 東京` to
`creme-brulee-東京`, copying with Tab and Enter, and direct loads and refreshes of
`/about`, `/faq`, and `/privacy-policy`. These are owner-performed checks; browser
automation was unavailable for the protected staging site. This confirmation
provides the browser evidence that HTTP checks alone cannot establish.

## Monitoring evidence

The alarm was already ALARM before injection and remained in that state during
the failed probes. It returned to OK at 16:19:58.791 UTC, before the recovered
asset request, because its evaluation used an older sparse-traffic interval.
CloudWatch recorded a successful SNS recovery action at 16:19:58.866 UTC.
This transition is not evidence that the asset had recovered, and no fresh
failure-detection notification or inbox delivery is claimed for this exercise.

The 16:23:15 UTC collection requested the interval 16:00:00–16:23:15 UTC with
five-minute periods. It returned the following snapshot; the 16:20 period was
still open, and delayed samples can revise these values:

| Environment | Period start (UTC) | Requests (Sum) | 4xxErrorRate (Average) | 5xxErrorRate (Average) |
| ----------- | ------------------ | -------------: | ---------------------: | ---------------------: |
| Staging     | 16:10              |              1 |                   100% |                     0% |
| Staging     | 16:15              |             29 |               89.6552% |                     0% |
| Staging     | 16:20              |            142 |               57.7465% |                     0% |
| Production  | 16:15              |              7 |                     0% |                     0% |
| Production  | 16:20              |             42 |                4.7619% |                     0% |

The failure period exceeded the 20-request minimum. The isolated 16:10 staging
request did not. All six alarms were OK at this collection. No new ALARM
transition after injection was present in the retrieved history. This proves
metric visibility, not timely alarm detection of the short fault.

The full recovery verifier itself emits 80 expected unauthorized requests plus
missing-resource checks in staging, so aggregated 4xx during recovery cannot be
attributed solely to the 25 injected-failure probes. Five-minute Average error
rates are not reconstructed request-weighted error counts. Production's two
deliberate missing-resource checks are consistent with its recorded 4xx increase;
all required production content passed. Aggregate metrics cannot independently
classify the origin of each error without request-level logs.

## Follow-up actions

| Action                                                           | Owner             | Completion or next step                                                                                                                                   |
| ---------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Restore the original staging asset and verify both environments  | Exercise operator | Completed at 16:21:10 UTC                                                                                                                                 |
| Preserve recovery procedure, evidence, and links                 | Maintainer        | Four documentation files prepared on the exercise branch for commit and merge                                                                             |
| Review staging alarm noise from expected authentication failures | Maintainer        | Review before the next drill; preserve negative authentication tests and evaluate a separate authenticated availability signal before changing thresholds |
| Review coverage for short and low-traffic failures               | Maintainer        | Consider the existing budget and privacy constraints before adding scheduled checks; current traffic-based alarms do not guarantee detection              |
| Finish AWS hosting/privacy disclosures                           | Maintainer        | Remains separately tracked in #70                                                                                                                         |

The drill added bounded requests, two single-path invalidations, and one temporary
delete marker that was removed. It created no new recurring resource or logging
stream. Existing request and invalidation pricing still applies. Access logs
remain disabled under the [documented retention and privacy decision](aws-operations.md#logging-and-retention-decision).

Local validation: `npm run check` passed type checking, linting, formatting, and
81 tests. Vitest printed existing `EMFILE` file-watcher warnings but exited
successfully. Application code and infrastructure configuration were unchanged.
