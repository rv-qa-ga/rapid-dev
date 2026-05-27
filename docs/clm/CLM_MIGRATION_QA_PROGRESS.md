**Last updated:** 2026-05-26 (INT read-only validation rerun — lookup resolution + case-insensitive email)  
**Latest run:** `ENV=int npx ts-node scripts/run-clm-all-entities-validation.ts` · JSON: `reports/clm/migration/all-entities-validation-2026-05-26T22-17-03-636Z.json`  
**SOURCE (Dynamics):** [accelinspreprod.crm11.dynamics.com](https://accelinspreprod.crm11.dynamics.com)  
**TARGET (Salesforce):** [arx--int.sandbox.my.salesforce.com](https://arx--int.sandbox.my.salesforce.com)  
**BA status (May 2026):** All programme entities migrated to INT  
**Load method:** Workbench (BA); validation = OData/SOQL API only — **no record creation in automation**  
**Parent test plan:** [Migration & Integration (Regression) Test Plan](https://accelins.atlassian.net/wiki/spaces/SA/pages/3330703367)

---

## QA progress dashboard — all phases (INT / preprod)

*Last automation run: 2026-05-26 · read-only · no record creation*

### Programme KPIs

| Metric | Result | Status |
|--------|--------|--------|
| Entities loaded on INT | **18 / 18** | Pass |
| Phase A2 count match | **18 / 18** | Pass |
| Phase A3 all-fields Pass | **14 / 18** | In progress |
| Phase B scenarios runnable | **2 / 9** | Blocked |
| Phases C–E automated | **0 / 14** | Not started |

### Legend

| Colour | Meaning |
|--------|---------|
| **Green** | Pass / complete |
| **Yellow** | In progress / partial |
| **Red** | Fail / blocked |
| **Blue** | Active (in flight) |
| **Grey** | Not started / pending |

### Phase pipeline

PHASE_PIPELINE_PLACEHOLDER

### Phase A — sub-step progress

| Step | Description | Progress | Outcome |
|------|-------------|----------|---------|
| **A1** | API smoke | 100% | Pass |
| **A2** | Record counts | 100% (18/18) | Pass |
| **A3** | Field validation (all mapped fields) | 78% Pass (14/18) | In progress |
| **A4** | Data Cloud RDM visibility | 0% | Pending |

### Phase A — entity summary (Load · Count · Fields)

| Jira | Entity | Load | Count | Fields |
|------|--------|------|-------|--------|
| SF-736 | Party | Pass | Pass | Fail |
| SF-738 | External contact | Pass | Pass | Fail |
| SF-737 | Internal contact | Pass | Pass | Fail |
| SF-769 | Member map | Pass | Pass | Pass |
| SF-775 | TPA map | Pass | Pass | Pass |
| SF-739 | Country | Pass | Pass | Fail |
| SF-767 | Product map | Pass | Pass | Fail |
| SF-766 | Sub product | Pass | Pass | Pass |
| SF-785 | Product | Pass | Pass | Pass |
| SF-780 | ASLOB | Pass | Pass | Pass |
| SF-798 | OSFI | Pass | Pass | Pass |
| SF-781 | Class of business | Pass | Pass | Pass |
| SF-782 | Line of business | Pass | Pass | Pass |
| SF-783 | BEGAAP COB | Pass | Pass | Pass |
| SF-784 | Solvency II | Pass | Pass | Pass |
| SF-779 | MPP | Pass | Pass | Pass |
| SF-872 | POG product | Pass | Pass | Pass |
| SF-786 | Currency | Pass | Pass | Pass |

### Phase B — lifecycle (`CLM-GL-INT-001`)

| Scenario | Automation | Outcome |
|----------|------------|---------|
| INT-001 Integration smoke | Implemented | Runnable when MuleSoft creds OK |
| INT-010…014 Per-Jira packs | Stub (`PENDING`) | Manual — run SF-736/769/788/796/872 separately |
| INT-020 B-L1 New create | `@pending-step-def` | Not implemented |
| INT-021 B-L2 Migrated update | `@pending-step-def` | **Programme gap** |
| INT-030 Ineligible Account | Implemented | Runnable |

### Phases C · D · E

| Phase | Feature | Scenarios | Automation | Outcome |
|-------|---------|-----------|------------|---------|
| C | CLM-GL-INT-002 | 5 | 0% | Pending |
| D | CLM-GL-INT-003 | 5 | 0% | Pending |
| E | CLM-GL-INT-004 | 5 | 0% | Pending |

---

## Open items / blockers

1. **Party (20 records)** — `BillingStreet` concatenates address lines 1+2 on SF; Dynamics stores separate lines. Expected migration behaviour — not missing data.
2. **External contact (37 missing + 41 diffs)** — 37 ACR-duplicate rows tolerated as missing; remaining diffs on rows with empty SF name/email. Email compare is case-insensitive.
3. **Internal contact (126 missing)** — inactive/departed users excluded per BA; diffs only on excluded rows.
4. **Country (247 diffs)** — `accelins_business_area` option-set **code** vs SF **label** (picklist code/label mismatch).
5. **Product map (50 diffs)** — residual lookup/name edge cases after Product2 resolution (COB/LOB/SubProduct/OSFI/POG/MPP/ASLOB). Optional ASLOB blank in Dynamics skipped.
6. Download **failures-only Excel** attachment on this page for field-level detail.

---

## Detailed evidence

| Resource | Location |
|----------|----------|
| **Excel field diffs (attached)** | `CLM-MIGRATION-QA-EVIDENCE.xlsx` on this Confluence page |
| **Failures only (attached)** | `CLM-MIGRATION-QA-FAILURES.xlsx` — one tab per failing entity |
| **Interactive dashboard (attached)** | `CLM-MIGRATION-QA-DASHBOARD.html` on this Confluence page |
| Full entity table, BA clarifications | [`CLM_MIGRATION_QA_PROGRESS_DETAIL.md`](./CLM_MIGRATION_QA_PROGRESS_DETAIL.md) (repo) |
| Latest validation JSON | `reports/clm/migration/all-entities-validation-2026-05-26T22-17-03-636Z.json` |
| Publish this page | `npm run docs:upload:clm-migration-progress` |
