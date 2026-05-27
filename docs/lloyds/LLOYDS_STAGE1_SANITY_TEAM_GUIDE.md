# Lloyd's Stage 1 Sanity — Team Testing Guide

**Audience:** QA engineers on the Lloyd's / BSG QA automation team.
**What you get out of it:** an automated way to test Stage 1 of the Lloyd's ADP → MuleSoft → D365 F&O pipeline (the `mule-xml-generation` → `func-xml-totals` → Dataverse record hop) — positive happy path **and** 4 negative (dead-letter) scenarios — without waiting for any SPN permissions ticket to land.

> **TL;DR** — one command prepares a Service Bus JSON payload, you paste it into Service Bus Explorer, one command verifies the Dataverse record (or the absence of it, for negatives). Everything runs as your own Azure identity after a one-time `az login`.

---

## 1. What this change contains

Six things landed together:

1. **A sanity planner** that combines:
   - Live listing of the `mulesoft-xml` Azure blob container, and
   - Live Dataverse queries against `accelins_legalentity` + `accelins_repositoryfile` master tables

   … and produces a committed snapshot `src/features/lloyds/test-data/sanity-plan.json` telling you exactly which XMLs are *runnable* today versus *blocked* (each blocked row has a reason). **Programme agency branch for Lloyd's is AEUM** — treat AEUM as the canonical `<LEDGER>` in documentation; older planner rows may still list other ledgers until master data catches up.

2. **A positive send-and-verify CLI** — one command prepares the payload, you paste it in Service Bus Explorer, another command polls Dataverse and asserts the record is created with correct lookups + totals.

3. **Four negative scenario generators** — pick a blocked row (repo-not-in-master, ledger-not-in-master), or synthesise a bad blob URL, or a malformed file name. Each is proven to dead-letter with a specific error signature.

4. **An idempotency check** — resend the same correlation id twice → record count stays at 1.

5. **Cucumber wiring** — Lloyd's Stage 1 feature under tags `@PP-391-API-*`, runnable as a normal BDD feature.

6. **A knowledge doc** at `docs/lloyds/SKILL.md` — capturing observed `func-xml-totals` behaviour, exact DLQ error shapes, and the `PROCESS_TRACKER` state machine.

> **Programme decisions (MoM — Tom / Sucharan / Peter / Ravindranath / Emily):** Use a **composite key (`repo ID` + Excel unique run ID`)** for tracking across messages and tables. The **summary** ADP product will add **`_accel_std_table_row_created_timestamp`** (standard-detail row-created time on the summary) so Mule can run correct **incremental** logic and pick the **latest row per repo** for XML generation. **After posting:** no resubmission on the same repo run; **reversals/replacements require new repo IDs**. Follow-up: Tom adds the field and notifies Sucharan with the query. Full write-up: [`SKILL.md`](./SKILL.md) §5 schema notes and Snowflake ADP validation §.

See also:

- **Deep technical reference:** [`docs/lloyds/SKILL.md`](./SKILL.md) — includes **Snowflake** queries (`FOWD__AGENCY_POLICY_FO_SUMMARY_V1` per `_accel_repository_id`, plus `FOWC`/`FOWD` row-count smoke checks) to validate ADP totals independently of the automation.
- **Command reference:** [`src/features/lloyds/README.md`](../../src/features/lloyds/README.md)
- **SPN permissions ticket draft (for future full-auto CI):** [`docs/servicenow-ticket-lloyds-spn-permissions.md`](../servicenow-ticket-lloyds-spn-permissions.md)
- **JIRA epic:** [PP-391](https://accelins.atlassian.net/browse/PP-391)
- **Dynamics `accelins_repositoryfile` clone checklist (Agency cohort):** [`LLOYDS_QA_PROGRESS.md`](./LLOYDS_QA_PROGRESS.md) §4.0.1 — **blob / ADP: thirteen** ids in `LLOYDS_AGENCY_COHORT_12`; **Power Apps: ten** cloned after **2026-04-29** reload, **three** (`US-58237`, `US-58338`, `US-57250`) still pending within days.

---

## 2. What you can do with it

| You can test today | How |
|---|---|
| ✅ The positive happy path for any **runnable** row in `sanity-plan.json` (ledger **AEUM** in programme docs and examples) | Positive flow (§6) |
| ✅ REPO_NOT_IN_MASTER — send for a repo code that isn't loaded in Dataverse master; expect DLQ, no record | Negative flow (§7), `--blocked-reason REPO_NOT_IN_MASTER` |
| ✅ LEDGER_NOT_IN_MASTER — send using a planner row blocked as **ledger not in** `accelins_legalentity` | Negative flow, `--blocked-reason LEDGER_NOT_IN_MASTER` |
| ✅ BLOB_MISSING — runnable row + wrong blob container; expect DLQ `Blob not found` | Negative flow, `--blob-missing --row-index N` |
| ✅ BAD_FILE_NAME — synthesised malformed name; expect DLQ | Negative flow, `--bad-file-name "ZZZZ XX-00000 202604181800.xml"` |
| ✅ Idempotency — resend same correlation id; record count stays at 1 | Positive §6, using `--correlation-id` on the second send |
| ✅ Add your own curated test rows to the BDD Examples table | See §9 |

**What you cannot do yet** (all gated on the SPN permissions ticket landing):

| Blocked capability | Why |
|---|---|
| ❌ Fully automated Service Bus send (framework-end-to-end) | SPN lacks `Azure Service Bus Data Sender` on `sb-dev-uks-lyd`. Workaround today: manual paste into Service Bus Explorer (your personal login has rights). |
| ❌ Programmatic DLQ message inspection | Needs `Azure Service Bus Data Receiver` on the namespace. Today: peek the DLQ manually in Service Bus Explorer. |
| ❌ Test that `func-xml-totals` *reads* the blob (vs the payload fallback) | Needs `Storage Blob Data Contributor` to upload a test XML with divergent totals. |

---

## 3. One-time setup (both options)

Same ~10 minutes regardless of which branch you're on:

```powershell
# 1. Clone (if you don't already have it) or fetch latest
git fetch origin

# 2. Install dependencies — @azure/storage-blob is new
npm install

# 3. Create / refresh your local .env.qa
#    .env.qa is gitignored (has secrets). Copy from Keeper / a teammate / Key Vault.
#    Critical value for this work:
#      D365_BASE_URL=https://accelinsqatest.crm11.dynamics.com
#      D365_SCOPE=https://accelinsqatest.crm11.dynamics.com/.default
#      D365_WEB_API_BASE_URL=https://accelinsqatest.crm11.dynamics.com/api/data/v9.2/
#    (NOT accelinsqatest2 — that's the RDM env, different instance.)

# 4. Sign in to Azure as yourself (one-time per machine; survives reboots)
az login --tenant 7f2a4710-29fa-4343-8422-e2cf0174c0ec

# 5. Quick sanity of your identity
az account show
```

Your `az login` identity needs, at minimum, read access to:
- Dataverse on `https://accelinsqatest.crm11.dynamics.com/` (for the verify step)
- Azure Storage Blob on `saaccdevukslyd` → container `mulesoft-xml` (for the discovery step)

Most team members already have both. If an api call 403s, ping the BSG Dataverse admins.

---

## 4. Which branch are you on?

| Situation | Your path |
|---|---|
| The PP-391 Lloyd's PR hasn't merged to `main` yet (as of today, Apr 18 2026) | **Option 1** — use `SmokeUAT` branch (§5.A) |
| The PR has merged to `main` | **Option 2** — use `main` (§5.B) |
| You're specifically reviewing the standalone Lloyd's PR #44 | Use `feat/lloyds-row1-sanity` — same commands as Option 1, just substitute the branch name |

Both branches contain the *same* Lloyd's code; only the surrounding context differs (`SmokeUAT` may carry unrelated UAT smoke work; `main` will have the clean, merged result).

---

## 5. Checking out the branch

### Option 1 — from `SmokeUAT` (today, before PR merge)

```powershell
git fetch origin
git checkout -b SmokeUAT --track origin/SmokeUAT   # first time
# or, if you already had SmokeUAT locally:
git checkout SmokeUAT
git pull
npm install                                         # picks up @azure/storage-blob
```

> **Heads-up:** `SmokeUAT` is a long-lived branch that may include unrelated UAT smoke work. For Lloyd's-only testing you do not need that context; nothing in the Lloyd's code depends on it.

### Option 2 — from `main` (after PR merge)

```powershell
git fetch origin
git checkout main
git pull
npm install                                         # picks up @azure/storage-blob
```

> Once the PR is merged, `main` is always the right branch for new testing sessions. SmokeUAT becomes historical.

---

## 6. Daily positive test flow

Same commands on either branch. The framework auto-detects `sanity-plan.json` and routes through it.

### First session of the day — refresh the plan

```powershell
npm run lloyds:sanity:plan
```

You should see something like:

```
Runnable rows:        27
Blocked rows:         111
Snapshot written:     src\features\lloyds\test-data\sanity-plan.json
```

### Pick a row and run a positive test

```powershell
# 1. Prepare — framework generates the payload + bumps the committed correlation-id
#    counter. Prints JSON you need to paste. Takes ~5 s.
npm run lloyds:sanity:prepare -- --row-index 0
```

Copy the JSON block from the output.

```powershell
# 2. In Azure Portal:
#    Service Bus namespace `sb-dev-uks-lyd`
#    → Entities → Queues → `mule-xml-generation`
#    → Service Bus Explorer → Send messages tab
#    → Content-Type: application/json
#    → paste the JSON → Send
#    → wait for the green "Completed sending messages" toast

# 3. Verify — framework polls Dataverse for up to 3 min
npm run lloyds:sanity:paste-and-verify -- --row-index 0
```

Expected output:

```
Dataverse record found:
  name:            01823                            ← auto-numbered
  statuscode:      100000003 (Ready to Ship to Dynamics)
  repositoryFile:  <guid>
  legalEntity:     <guid>
  processPath:     true
  Workflow totals: currency=CAD prm=… com=… coi=… …
  overall_match:   true

Sanity PASS: record created and reached Ready to Ship to Dynamics.
```

### Alternative — pick a specific file by name

```powershell
npm run lloyds:sanity:prepare -- --row-name "AEUM US-58338 202604091630.xml"
npm run lloyds:sanity:paste-and-verify -- --row-name "AEUM US-58338 202604091630.xml"
```

---

## 7. Daily negative test flow

Same two-step paste-and-verify pattern, different commands.

### REPO_NOT_IN_MASTER

```powershell
npm run lloyds:sanity:negative:prepare -- --blocked-reason REPO_NOT_IN_MASTER
# paste the printed JSON into Service Bus Explorer
npm run lloyds:sanity:negative:paste-and-verify -- --blocked-reason REPO_NOT_IN_MASTER
```

Expected: `Negative Sanity PASS: produced no Dataverse record (message dead-lettered as expected).`

### LEDGER_NOT_IN_MASTER

```powershell
npm run lloyds:sanity:negative:prepare -- --blocked-reason LEDGER_NOT_IN_MASTER
npm run lloyds:sanity:negative:paste-and-verify -- --blocked-reason LEDGER_NOT_IN_MASTER
```

### BLOB_MISSING

```powershell
npm run lloyds:sanity:negative:prepare -- --blob-missing --row-index 0
npm run lloyds:sanity:negative:paste-and-verify -- --blob-missing --row-index 0
```

### BAD_FILE_NAME

```powershell
npm run lloyds:sanity:negative:prepare -- --bad-file-name "ZZZZ XX-00000 202604181800.xml"
npm run lloyds:sanity:negative:paste-and-verify -- --bad-file-name "ZZZZ XX-00000 202604181800.xml"
```

### (Optional, for stronger assertions) Peek the DLQ manually

For any negative above, after pasting you can also peek the Dead-Letter Queue to read the exact error shape:

- Service Bus Explorer on the `mule-xml-generation` queue → switch to the **Dead-Letter** sub-tab → Peek.
- The `DeadLetterErrorDescription` JSON matches the signatures documented in [`SKILL.md §12`](./SKILL.md).

---

## 8. Running via Cucumber BDD

Stage 1 scenarios live in **`src/features/lloyds/lloyds-pipeline-hops.feature`** (`@stage-1 @phase-1`): `@PP-391-API-001` (positive), `@PP-391-API-002..005` (4 negatives), `@PP-391-API-006` (idempotency), `@PP-391-API-007` (synthetic failed message), `@PP-391-API-008` (ADP-vs-XML mismatch). Snowflake modules and downstream scaffolds remain in **`lloyds-pipeline.feature`** (`@phase-2` / `@wip`). Post-load ten-repo read-only: **`lloyds-pipeline-e2e-readonly.feature`**.

```powershell
# Runs only the positive canary scenarios (@smoke)
npm run test:api -- --tags "@lloyds and @smoke"

# All six Lloyd's scenarios (needs manual paste for the ones that send to SB, until SPN grants land)
npm run test:api -- --tags "@lloyds"
```

The positive path runs fully automated today because it only sends (needs SPN grant) — wait, no, it also needs to send. So until the SPN lands, the Cucumber positive scenario needs the same manual paste flow. The **verify** half is fully automated via `az login`.

---

## 9. Extending coverage

### Add more rows to the positive Cucumber Examples table

1. Open `src/features/lloyds/lloyds-pipeline-hops.feature` and locate `@stage-1` Stage 1.
2. Find the `Examples:` under `@PP-391-API-001`.
3. Add a row with any name from the `runnable` section of `sanity-plan.json`:

```gherkin
Examples:
  | row                                 |
  | AEUM US-58338 202604091630.xml      |
```

4. Commit on your own feature branch, PR per normal process.

### Test against a different dev environment

Set these in your local `.env.qa` (don't commit — `.env.*` is gitignored):

```
LLOYDS_DATAVERSE_BASE_URL=https://<other-env>.crm11.dynamics.com
LLOYDS_BLOB_CONTAINER_URL=https://<other-storage-account>.blob.core.windows.net/mulesoft-xml
```

Then re-run `npm run lloyds:sanity:plan` — the snapshot will reflect the other env's master data + blobs.

---

## 10. When something fails — report-back protocol

If you get a `Sanity FAIL` or an unexpected behaviour, please capture these items (in this order) before asking for help:

1. **The command you ran** — full line including args.
2. **The generated `correlation_id`** — printed by every prepare / paste-and-verify invocation.
3. **Service Bus queue state** — peek `mule-xml-generation` and its Dead-Letter twin; copy the `DeadLetterErrorDescription` JSON (or confirm it's empty if the record did appear).
4. **Dataverse record state** — if one was created, screenshot the XML File form showing Name, Status Reason, Repository File ID, Destination Ledger, and the Match toggles.
5. **Terminal output** — the last ~30 lines of the failing command, with any ERROR lines.

Drop all five into the Lloyd's QA Slack channel (or the JIRA ticket if it's a specific repro). 9 times out of 10 the error message + correlation id is enough to pinpoint the class of failure; cross-reference against [`SKILL.md §12`](./SKILL.md) — the observed DLQ shapes are catalogued there.

---

## 11. Glossary — things you'll see in logs / on the form

| Term | What it is |
|---|---|
| `mule-xml-generation` queue | Azure Service Bus queue — where MuleSoft publishes "a new XML is ready" messages. We play MuleSoft by pasting here manually. |
| `func-xml-totals` | Azure Function App that consumes `mule-xml-generation` messages, reads the blob, and creates/updates the Dataverse `accelins_workflow` record. |
| `func-dimension-validation` | Azure Function App that validates the XML's financial dimensions against D365 master data. Runs automatically after `func-xml-totals`. |
| `accelins_workflow` / "XML File" | Dataverse table that stores each processed XML. Visible in Operational Workflow → Accounting Approvals. |
| `accelins_correlation_id` | Unique identifier threaded through every message + record for one send. Format `0000-0000-0000-NNNNN`. Framework auto-assigns from a committed counter starting at `03000`. |
| Status Reason **Approved** / **Ready to Ship to Dynamics** | Both valid happy-path end states (100000002 / 100000003). The record progresses from the former to the latter as dimension validation completes. |
| Dead-Letter Queue (DLQ) | Every SB queue has a `$DeadLetterQueue` twin — messages that failed processing land there with the failure reason attached. Our negative tests assert on DLQ destination, not a Dataverse record. |

---

## 12. Quick reference — every useful command in one block

```powershell
# Setup (one-time)
az login --tenant 7f2a4710-29fa-4343-8422-e2cf0174c0ec
npm install
npm run lloyds:sanity:plan

# Plan maintenance
npm run lloyds:sanity:plan:status   # read the committed snapshot (no network)
npm run lloyds:sanity:plan          # refresh against live env

# Positive (manual paste flow)
npm run lloyds:sanity:prepare -- --row-index 0                   # print JSON to paste
npm run lloyds:sanity:paste-and-verify -- --row-index 0          # verify record

# Positive by name
npm run lloyds:sanity:prepare -- --row-name "AEUM US-58338 202604091630.xml"
npm run lloyds:sanity:paste-and-verify -- --row-name "AEUM US-58338 202604091630.xml"

# Negative
npm run lloyds:sanity:negative:prepare -- --blocked-reason REPO_NOT_IN_MASTER
npm run lloyds:sanity:negative:paste-and-verify -- --blocked-reason REPO_NOT_IN_MASTER

npm run lloyds:sanity:negative:prepare -- --blocked-reason LEDGER_NOT_IN_MASTER
npm run lloyds:sanity:negative:paste-and-verify -- --blocked-reason LEDGER_NOT_IN_MASTER

npm run lloyds:sanity:negative:prepare -- --blob-missing --row-index 0
npm run lloyds:sanity:negative:paste-and-verify -- --blob-missing --row-index 0

npm run lloyds:sanity:negative:prepare -- --bad-file-name "ZZZZ XX-00000 202604181800.xml"
npm run lloyds:sanity:negative:paste-and-verify -- --bad-file-name "ZZZZ XX-00000 202604181800.xml"

# Replay a specific correlation id (for idempotency tests, or to retry after fixing something)
npm run lloyds:sanity:paste-and-verify -- --row-index 0 --correlation-id "0000-0000-0000-03042"

# Cucumber
npm run test:api -- --tags "@lloyds and @smoke"
npm run test:api -- --tags "@lloyds"

# CLI help
npx ts-node scripts/lloyds/send-mule-xml-generation-test-message.ts --help
npx ts-node scripts/lloyds/refresh-sanity-plan.ts --help

# Pre-push sanity — same checks CI runs
npm run ci:system-tests     # tsc --noEmit + eslint src --ext .ts
```

---

*Last updated 2026-04-18 — based on the Apr 18 session landing the framework end-to-end. As SPN permissions land (see the linked ServiceNow ticket), this guide will evolve: the manual paste step goes away, Cucumber runs fully automated, and negative scenarios gain programmatic DLQ assertions.*
