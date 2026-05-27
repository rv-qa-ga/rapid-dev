# ServiceNow Ticket Draft: QA SPN Permissions — Lloyd's Automated Sanity Testing

**Use this text to request permissions on the existing QA Automation Service Principal (SPN) so the Lloyd's Row-1 sanity automation — and subsequent pipeline-stage scenarios — can run end-to-end from the QA framework without relying on individual user accounts.**

> **Single SPN, single ticket, all components in one request.** This ticket intentionally bundles Service Bus, Dataverse, and Blob Storage permissions so there is no multi-ticket round-trip. Each bundle item is independently justified below; if any item is owned by a different team, please split the ticket accordingly — do not block the others.

---

## Short title (for ticket summary)

**Grant `BSG - QA - NonProd-Automation` SPN Azure Service Bus Sender + Blob Storage Data Contributor + Dataverse Application User on the Lloyd's non-prod environment**

---

## Request type

- **Category:** Access management
- **Subcategory:** Service Principal role / permission grant
- **Environment:** QA / non-production
- **Urgency / Priority:** Medium — blocks Lloyd's Row-1 sanity test automation (JIRA PP-391)

---

## Target Service Principal (reuse — no new SPN)

| Field | Value |
|---|---|
| **App registration display name** | `BSG - QA - NonProd-Automation` |
| **Tenant ID** | `7f2a4710-29fa-4343-8422-e2cf0174c0ec` |
| **Application (client) ID** | `c7bf4365-7b36-49a8-a58a-fa64ba6bdbc4` |
| **Current usage** | QA Automation framework for Dynamics 365 CRM (Dataverse) — already has D365 CRM read access on `accelinsqatest2.crm11.dynamics.com` (RDM) and `accelinsqatest.crm11.dynamics.com` (Lloyd's) |

**Why reuse this SPN?** It's already governed, rotated, and wired into the QA automation framework (`D365_*` env vars, Key Vault / .env.qa). Introducing a second SPN for Service Bus and Blob alone would double the secret-rotation surface and add no security benefit in a non-prod QA context.

---

## Permissions requested (all on non-prod Lloyd's resources only)

### 1. Azure Service Bus — Data Sender (and optionally Receiver)

| Field | Value |
|---|---|
| **Namespace** | `sb-dev-uks-lyd.servicebus.windows.net` |
| **Subscription / Resource Group** | *\<to be confirmed by Platform team owning `sb-dev-uks-lyd`\>* |
| **Required role** | **`Azure Service Bus Data Sender`** — grant at **namespace scope** (covers current and future queues) |
| **Preferred scope** | Namespace-level (all queues). If namespace-level is not acceptable, grant per queue: `mule-xml-generation`, `dv-xml-approval`, `mule-d365-import`, `dv-d365-journalposting`, `mule-dependantproduct` |
| **Optional (for later DLQ / message inspection scenarios)** | **`Azure Service Bus Data Receiver`** on the same namespace |

**Why:** The framework publishes canonical programme messages (e.g. `mule-xml-generation-success`) to these queues to simulate MuleSoft and Dataverse publishers when those systems are not yet wired up in dev. This is exactly the same operation your team performs manually today via Service Bus Explorer — we are only substituting the identity from "individual user" to "QA SPN".

**Evidence the permission is currently missing (from a live test run):**

```
ServiceBusError: Unauthorized access. 'Send' claim(s) are required to perform this operation.
Resource: 'sb://sb-dev-uks-lyd.servicebus.windows.net/mule-xml-generation'
TrackingId: 684cde8ee3ed40e4b9b238d40fb20a2f_G11
```
Three retries, all `UnauthorizedAccess` on the same queue.

### 2. Dataverse / Power Platform — Application User

| Field | Value |
|---|---|
| **Environment** | `accelinsqatest.crm11.dynamics.com` *(the Lloyd's Power Platform non-prod env — note: this is `accelinsqatest`, not `accelinsqatest2` which is RDM)* |
| **Required action** | Create (or confirm) an **Application User** tied to this SPN, and assign a security role that grants at minimum **Read** on the following tables |
| **Tables** | `accelins_workflow` ("XML File"), `accelins_repositoryfile`, `accelins_legal_entity` |
| **Nice to have** | Read on all `accelins_*` tables for broader regression / future scenarios |

**Why:** The sanity test polls Dataverse for the `accelins_workflow` record that `func-xml-totals` creates, and asserts on its `statuscode`, Repository File lookup, and workflow totals (`accelins_ods_*`). Without Read access the final `Then` step of the Cucumber scenario cannot verify the record. This SPN already has the equivalent role on `accelinsqatest2` — we need the same role applied on `accelinsqatest`.

**Verification once granted:** `GET https://accelinsqatest.crm11.dynamics.com/api/data/v9.2/WhoAmI` using a client-credentials token issued to this SPN should return `200 OK` with a `UserId`, and `GET /api/data/v9.2/accelins_workflows?$top=1` should return `200 OK` with one record.

### 3. Azure Blob Storage — Data Contributor

| Field | Value |
|---|---|
| **Storage account** | `saaccdevukslyd` |
| **Containers** | `mulesoft-xml` |
| **Required role** | **`Storage Blob Data Contributor`** at container scope (or storage-account scope if container-level is impractical) |

**Why (today):** The Row-1 sanity test currently references an existing blob URL in the payload — fa-xmltotals tolerates a missing blob in dev (falls back to payload totals), so this permission is **not a blocker today**.

**Why (next step):** To actually prove that `func-xml-totals` reads the blob and computes XML totals from it (rather than falling back to payload values), the framework must upload a test XML to the `mulesoft-xml` container with a known, divergent total. Without Data Contributor this cannot be automated. The container is not internet-exposed; this permission is internal to the non-prod Lloyd's storage account only.

### 4. (Optional, future) — D365 F&O Application User

| Field | Value |
|---|---|
| **Environment** | D365 F&O non-prod (Lloyd's instance) — URL to be confirmed by the D365 platform team |
| **Required action** | Create an Application User tied to this SPN and grant read access on DMF execution summary endpoints |

**Why (future only):** Stage 3 of the pipeline (DMF submission) needs the framework to poll `GetExecutionSummaryStatus`. Currently blocked at Stage 1/2, so this can be a separate follow-up ticket if easier for the D365 team. Flagged here for visibility only — NOT a blocker for this request.

---

## Business justification

### Problem statement

Lloyd's bordereaux journal automation testing (JIRA PP-391) today relies on individual team members opening Azure Portal → Service Bus Explorer → manually pasting JSON messages onto the `mule-xml-generation` queue, then manually checking the Operational Workflow Accounting Approvals page. This creates:

- **No reproducible evidence** — every run is a manual click-through with no recorded correlation id, timestamp, or pass/fail artefact.
- **Single-person dependency** — only people with the Service Bus Sender role on their individual user can run the test.
- **Setup drift** — manually pasted JSON occasionally has typos (container name, missing fields, stale correlation ids) which produce false failures.
- **Onboarding friction** — every new QA engineer needs their personal account granted Service Bus Sender before they can contribute.

### Proposed solution

Automate the exact same manual procedure via the QA automation framework (code already implemented — see References below), running as the existing governed QA SPN. No new secret material, no new SPN governance, just three scoped role grants on non-prod resources.

### Business benefits

| Benefit | Description |
|---|---|
| **Reproducible regression** | Every sanity run produces a correlation id, payload, Dataverse record, and pass/fail artefact — committed to the repository via a counter file (`src/features/lloyds/test-data/sanity-counter.json`). |
| **Person-independent runs** | Any QA engineer, or a CI pipeline, can execute the sanity test without needing individual SB rights. |
| **Onboarding reduction** | New QA hires do not need personal Service Bus role grants — they consume the framework. |
| **Stronger security posture** | Replaces individual-identity writes with a governed, centrally-rotated SPN whose secret lives in Key Vault / .env.qa (not on personal laptops). |
| **Foundation for later stages** | Same SPN will carry the framework through Stages 2–5 (approval, DMF submission, journal posting, downstream products) as each becomes testable — no second permissions request. |

### Scope limitations (security / risk)

- **Non-prod only.** `sb-dev-uks-lyd`, `accelinsqatest`, `saaccdevukslyd` — all dev/QA tier resources.
- **No customer data / no PII.** Test XMLs are curated sample bordereaux already committed to the repo under `docs/lloyds/XMLs/`; their contents are synthetic.
- **Send-only for Service Bus (initially).** Receiver role is optional and only needed for later DLQ inspection scenarios.
- **Same tenant.** All resources are in Accelerant tenant `7f2a4710-29fa-4343-8422-e2cf0174c0ec` — no cross-tenant access requested.

### Risk of *not* approving

- Continued reliance on individual team-member accounts for pipeline testing, contradicting our QA-automation objective.
- Manual test fidelity issues (typos, drift) continue to produce false positives / negatives.
- Unblocks 0 of 6+ planned Lloyd's test automation scenarios (PP-391 Row-1 sanity + Row-2 through Row-5 as dev progresses).

---

## Open items / dependencies (please confirm or action)

1. **Service Bus resource group / subscription owner** for `sb-dev-uks-lyd` — please CC on the ticket for role assignment.
2. **Power Platform admin** for `accelinsqatest.crm11.dynamics.com` — please CC for Application User creation.
3. **Storage account admin** for `saaccdevukslyd` — please CC for container-level RBAC.
4. If any of the three scopes are owned by different teams and must be split, please split the ticket at that boundary — do **not** block the others on the slowest one.

---

## Acceptance criteria

- [ ] SPN `c7bf4365-7b36-49a8-a58a-fa64ba6bdbc4` has **Azure Service Bus Data Sender** on namespace `sb-dev-uks-lyd` (or on the five queues listed above).
- [ ] SPN has an **Application User** on `accelinsqatest.crm11.dynamics.com` with Read on `accelins_workflow`, `accelins_repositoryfile`, `accelins_legal_entity`.
- [ ] SPN has **Storage Blob Data Contributor** on storage account `saaccdevukslyd` (scoped to container `mulesoft-xml` if possible, otherwise account-level).
- [ ] Functional verification completed from the QA framework:
  - `npm run lloyds:sb:send-xml-generation -- --dry-run` does not error on credential resolution.
  - `npm run lloyds:sanity:send-xml -- --row-index 0 --timeout-ms 180000` sends the message (no `UnauthorizedAccess`), and the polling `Then` step retrieves the created `accelins_workflow` record.
  - `az role assignment list --assignee c7bf4365-7b36-49a8-a58a-fa64ba6bdbc4 --scope /subscriptions/.../sb-dev-uks-lyd` shows the Sender role.

---

## References (code and framework context)

- **Row-1 sanity implementation:** `scripts/lloyds/send-mule-xml-generation-test-message.ts`, `src/integrations/lloyds/*`, `src/step-definitions/lloyds/xml-generation.steps.ts`, `src/features/lloyds/lloyds-pipeline-hops.feature` (Stage 1 — `@stage-1 @phase-1`).
- **Data-flow knowledge doc (authoritative for this ticket):** `docs/lloyds/SKILL.md`.
- **Run book:** `src/features/lloyds/README.md` → "Row-1 Sanity Test" section.
- **Existing SPN context:** reuses the same SPN already approved for D365 CRM access — see `.env.qa` → `D365_*`.
- **Confluence (programme side):** <https://accelins.atlassian.net/wiki/spaces/ISDE/pages/3159359512> (Lloyds Testing Helper), <https://accelins.atlassian.net/wiki/spaces/ISDE/pages/3118760006> (Service Bus Messages contract).
- **JIRA epic:** PP-391 (Lloyd's D365 Journal Integration — Capture Source & XML Financial Summaries).

---

## Proof the permission is currently missing (attach to the ticket)

```
Command:
  npm run lloyds:sanity:send-xml -- --row-index 1 --timeout-ms 180000

Output (truncated):
  Lloyd's Row-1 sanity send
    FQNS:           sb-dev-uks-lyd.servicebus.windows.net
    Queue:          mule-xml-generation
    correlation_id: 0000-0000-0000-03001
    [sb] Credential source: D365_* (client id c7bf4365-7b36-49a8-a58a-fa64ba6bdbc4)
    [sb] Connecting (AMQP) with send timeout 90000ms…
  ERROR.errors[0]: Unauthorized access. 'Send' claim(s) are required to perform this operation.
    Resource: 'sb://sb-dev-uks-lyd.servicebus.windows.net/mule-xml-generation'
    TrackingId: 684cde8ee3ed40e4b9b238d40fb20a2f_G11
    Timestamp: 2026-04-18T20:55:36  [ServiceBusError, code=UnauthorizedAccess]
  ERROR.errors[1]: (same)
  ERROR.errors[2]: (same)
```

---

## Contact

| Role | Name | Email |
|---|---|---|
| **Requestor** | *\<your name\>* | *\<your.email@accelins.com\>* |
| **Technical contact (framework)** | *\<your name or QA Automation lead\>* | *\<same\>* |
| **Team / cost center** | QA Automation / *\<cost center code\>* | |

---

*Ticket drafted: 2026-04-18*
*Drafted from: `docs/servicenow-ticket-lloyds-spn-permissions.md` — update this file if the programme gains more SPN-consuming integrations.*
