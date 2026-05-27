# CLM Migration — QA Progress detail (INT / preprod)

**Confluence dashboard:** [CLM Migration QA Progress](https://accelins.atlassian.net/wiki/spaces/SA/pages/3329785980) · **Dashboard source:** [`CLM_MIGRATION_QA_PROGRESS.md`](./CLM_MIGRATION_QA_PROGRESS.md)

**Last updated:** 2026-05-25 (INT read-only validation rerun)  
**Latest run:** `npx ts-node scripts/run-clm-all-entities-validation.ts` · JSON: `reports/clm/migration/all-entities-validation-2026-05-25T14-38-13-378Z.json`  
**SOURCE (Dynamics):** [accelinspreprod.crm11.dynamics.com](https://accelinspreprod.crm11.dynamics.com)  
**TARGET (Salesforce):** [arx--int.sandbox.my.salesforce.com](https://arx--int.sandbox.my.salesforce.com)

---

## INT load status — Salesforce probe (2026-05-25)

Read-only probe + A2 counts + A3 field validation (governance Excel mappings, Include in Migration = Y).  
Run: `ENV=int` · no writes · `reports/clm/migration/CLM-MIG-*.xlsx`

| Jira | Entity | SF object | Data loaded | Count match? | Field validation (ALL FIELDS) done? | Comments |
|------|--------|-----------|-------------|--------------|-------------------------------------|----------|
| SF-736 | Party | Account | **Yes** (1,436) | **Yes** | **Fail** (20 diffs) | All SOURCE rows on SF; 20 records with mapped-field diffs — see Excel |
| SF-738 | External contact | Contact | **Yes** (344 migrated) | **Yes** (Δ37 ACR) | **Fail** (381 diffs) | BA `accelins_contact` → OData `contacts`; 37 duplicates routed to ACR (within tolerance) |
| SF-737 | Internal contact | AccountTeamMember | **Yes** (833) | **Yes** (SF ≤ SOURCE) | **Fail** (959 diffs) | 126 inactive/departed excluded per BA; existence check skipped |
| SF-769 | Member map | Member_Legal_Entity_Relationship__c | **Yes** (345) | **Yes** | **Pass** | Full match |
| SF-775 | TPA map | TPA_Maps__c | **Yes** (22) | **Yes** | **Fail** (22 diffs) | All rows exist; all 22 have field diffs — review Excel |
| SF-739 | Country | Country__c | **Yes** (252) | **Yes** | **Fail** (247 diffs) | Existence OK; 247/252 records with diffs — mapping/transform |
| SF-767 | Product map | Product_Map__c | **Yes** (7,929 w/ `Dataverse_ID__c`) | **No** | **Fail** (5,000 diffs) | SOURCE preprod OData = 5,000; SF migrated = 7,929 (+32 rows without GUID). Count + field check blocked on SOURCE gap |
| SF-766 | Sub product | Sub_Product__c | **Yes** (2,018) | **Yes** | **Fail** (18 missing) | Count OK; 18 Dynamics names not found on SF by `Sub_Product_Name__c` |
| SF-785 | Product | Product_ins__c | **Yes** (66) | **Yes** | **Pass** | Name-key correlation (`accelins_name` ↔ `Insurance_Product_Name__c`) |
| SF-780 | ASLOB | ASLOB__c | **Yes** (57) | **Yes** | **Fail** (57 diffs) | Existence via `accelins_aslob` ↔ `ASLOB_Name__c`; all rows differ on mapped fields |
| SF-798 | OSFI | OSFI__c | **Yes** (38) | **Yes** | **Fail** (38 diffs) | Existence via zero-padded `accelins_name` ↔ `OSFI_Code__c`; all rows differ on mapped fields |
| SF-781 | Class of business | Classes_of_Business__c | **Yes** (18) | **Yes** | **Pass** | Full match |
| SF-782 | Line of business | Line_of_Business__c | **Yes** (96) | **Yes** | **Pass** | Full match |
| SF-783 | BEGAAP COB | BEGAAP_COB__c | **Yes** (9) | **Yes** | **Pass** | Full match |
| SF-784 | Solvency II | Solvency_II__c | **Yes** (8) | **Yes** | **Pass** | Full match |
| SF-779 | MPP | Member_Product_and_Program__c | **Yes** (791) | **Yes** | **Pass** | Full match |
| SF-872 | POG product | POG_Product__c | **Yes** (304) | **Yes** | **Fail** (1 diff) | 1 record with mapped-field diff — see Excel |
| SF-786 | Currency | CurrencyType (ISO) | **Yes** (4 ISO codes) | **Yes** (SF ≥ SOURCE) | **Pass** | Not custom `Currency__c`; Dynamics ISO present on SF; CMDT gaps informational only |

### Column definitions

| Column | Meaning |
|--------|---------|
| **Data loaded** | SF object exists on INT with migrated rows (count shown where useful) |
| **Count match?** | A2: Dynamics SOURCE count vs SF rows with correlation id (or BA-tolerated rules) |
| **Field validation (ALL FIELDS) done?** | A3: every governance-mapped field compared SOURCE → TARGET — **Pass** = zero diffs; **Fail** = diffs or missing rows |
| **Comments** | Exceptions, correlation keys, Excel evidence path |

### Summary (2026-05-25)

| Metric | Count |
|--------|------:|
| Entities in scope | **18** |
| Data loaded on INT | **18 / 18** |
| Count match (incl. BA tolerance) | **17 / 18** |
| Field validation **Pass** (all fields) | **8 / 18** |
| Field validation **Fail** (diffs highlighted in Excel) | **10 / 18** |

---

## BA clarifications applied

| # | Topic | Decision applied |
|---|--------|------------------|
| 1 | Product SF object | `Product_ins__c` only |
| 2 | External contact | BA logical `accelins_contact` → OData `contacts` |
| 3 | RDM correlation | Dynamics business name fields (`accelins_name`, `accelins_aslob`, etc.) |
| 4 | Product Map counts | SF rows with `Dataverse_ID__c` vs Dynamics (32 extra SF rows without GUID excluded) |
| 5 | OData entity sets | BA table names; working plural sets where singular 404 |
| 6 | Internal contact | `Internal_Contact_Master_ID__c` ↔ `accelins_internal_contact_master_id` |
| 7 | Currency | Standard `CurrencyType` ISO + CMDT — not custom object |
| 8 | Existence exceptions | External contact ≤37 (ACR); internal inactive exclusions |

---

## Phase A — step status

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| **A1** | API smoke (SF JWT + Dynamics OData) | **Pass** | MIG-001 |
| **A2** | Record counts per entity | **17/18 match** | Product Map SOURCE=5,000 vs SF migrated=7,929 |
| **A3** | Field-level SOURCE vs TARGET | **Complete** | 8 Pass · 10 Fail (Excel evidence) |
| **A4** | Data Cloud RDM visibility | **Pending** | Manual |

---

## Correlation strategy

| Entity | Dynamics match field | Salesforce match field |
|--------|---------------------|------------------------|
| Party, maps, country, product map | GUID | `Dataverse_ID__c` |
| External contact | `contactid` | `Dataverse_Id__c` (probed) |
| Internal contact | `accelins_internal_contact_master_id` | `Internal_Contact_Master_ID__c` |
| Product, sub-product, COB, LOB, MPP, POG | `accelins_name` | `*_Name__c` |
| ASLOB | `accelins_aslob` (description) | `ASLOB_Name__c` |
| OSFI | `accelins_name` (zero-padded code) | `OSFI_Code__c` (normalized) |
| Currency | `isocurrencycode` | `CurrencyType.IsoCode` |

---

## Commands

```bash
npm run test:clm:go-live:migration          # Full Phase A cucumber
npx ts-node scripts/run-clm-all-entities-validation.ts   # A2 + A3 batch (read-only)
npx ts-node scripts/probe-clm-all-entities-int.ts
npm run docs:upload:clm-migration-progress
```

Reports: `reports/clm/migration/CLM-MIG-*.xlsx` · Latest JSON: `all-entities-validation-2026-05-25T14-38-13-378Z.json`
