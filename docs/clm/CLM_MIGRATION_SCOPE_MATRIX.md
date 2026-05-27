# CLM migration scope — M-tab vs test plan

**Governance workbook:** `data/excel/Mapping and Governance of Data Attributes for CLM Design.xlsx`  
**BA runbook (Confluence):** [Per-Object Migration Procedures](https://accelins.atlassian.net/wiki/spaces/SA/pages/3180691488) · [ETL Overview](https://accelins.atlassian.net/wiki/spaces/SA/pages/3155165214)  
**Automation registry:** `src/utils/clm-migration-entity-config.ts`  
**Feature:** `src/features/integration/clm-go-live/CLM-MIGRATION-VALIDATION.feature`

## Decisions (May 2026)

| Topic | Decision |
|-------|----------|
| INT load | Workbench (BA runbook); validation = OData/SOQL API |
| SF API names | Probed on arx--int — `Classes_of_Business__c`, `Member_Product_and_Program__c`; Product = `Product_ins__c` (alt `Insurance_Product__c`) |
| Correlation field | Probed per object — `Dataverse_ID__c` on INT-ready entities |
| Phase A audit | Full Owner/CreatedBy/LastModifiedBy via Azure AD user map |
| External contact delta | Expected (37) — duplicates → ACR |
| Internal contact | ~833 on INT; inactive/departed users excluded |
| Go/No-Go | Full BA entity table (default `CLM_MIGRATION_GONOGO_FULL_TABLE=true`) |

## BA load order vs automation entity key

| BA order | Entity key | Jira | SF object (automation) | SF object (BA doc) | Match? |
|---------|------------|------|------------------------|-------------------|--------|
| 1 | party | SF-736 | Account | Account | Yes |
| 2 | contact-external | SF-738 | Contact | Contact | Yes |
| 3 | contact-internal | SF-737 | AccountTeamMember | AccountTeamMember | Yes |
| 4 | member-map | SF-769 | Member_Legal_Entity_Relationship__c | Member_Legal_Entity_Relationship__c | Yes |
| 5 | tpa-map | SF-775 | TPA_Maps__c | TPA_Maps__c | Yes |
| 6 | country | SF-739 | Country__c | Country__c | Yes |
| — | product-map | SF-767 | Product_Map__c | Product_Map__c | Yes |
| — | sub-product | SF-766 | Sub_Product__c | Sub_Product__c | Yes |
| — | product | SF-785 | Product_ins__c | Insurance_Product__c | **Both on INT** — migration uses `Product_ins__c` |
| — | class-of-business | SF-781 | Classes_of_Business__c | Classes_of_Business__c | **Yes** (probed INT) |
| — | member-product-program | SF-779 | Member_Product_and_Program__c | Member_Product_and_Program__c | **Yes** (probed INT) |

## M migration tabs (programme checklist)

| M tab | Entity key | Jira | SF object | Dynamics OData set | In automation | Notes |
|-------|------------|------|-----------|-------------------|---------------|-------|
| M party -> accounts | party | SF-736 | Account | accelins_parties | Yes (enabled) | |
| M externalcontact -> contacts | contact-external | SF-738 | Contact | contacts | Yes | ACR tolerance (37) |
| M internal_contact ->TeamMember | contact-internal | SF-737 | AccountTeamMember | accelins_internal_contacts | Yes | ~833 INT; exclusions |
| M membermap -> memberLEgroup | member-map | SF-769 | Member_Legal_Entity_Relationship__c | accelins_membermappings | Yes | |
| M tpamap -> TPA_Map__c | tpa-map | SF-775 | TPA_Maps__c | accelins_tpamapses | Yes | |
| M accelins_country -> country_c | country | SF-739 | Country__c | accelins_countries | Yes | |
| M accelins_p_m -> productmap | product-map | SF-767 | Product_Map__c | accelins_productmappings | Yes | |
| M accelins_sp -> sp | sub-product | SF-766 | Sub_Product__c | accelins_subproducts | Yes | |
| M accelins_p -> Product(ins) | product | SF-785 | Product_ins__c | accelins_products | Yes | **Migrated (BA May 2026)** |
| M accelins_aslob -> aslob | aslob | SF-780 | ASLOB__c | accelins_aslobs | Yes | |
| M accelins_osficode -> osfi | osfi | SF-798 | OSFI__c | accelins_osficodes | Yes | |
| M accelins_cob -> cob | class-of-business | SF-781 | Classes_of_Business__c | accelins_cobs | Yes | |
| M accelins_lob -> lob | line-of-business | SF-782 | Line_of_Business__c | accelins_lobs | Yes | |
| M accelins_b_c -> begaap_cob | begaap-cob | SF-783 | BEGAAP_COB__c | accelins_begaap_cobs | Yes | |
| M accelins_s_i -> solvencyII | solvency-ii | SF-784 | Solvency_II__c | accelins_solvency_iis | Yes | |
| M accelins_mpp -> mpp | member-product-program | SF-779 | Member_Product_and_Program__c | accelins_memberproductsprograms | Yes | |
| M accelins_pog_p -> pog_p | pog-product | SF-872 | POG_Product__c | accelins_pog_products | Yes | |

## Plan coverage (CLM-MIGRATION-VALIDATION) — gaps

| Jira | Plan dynamics entity | Covered by M-tab |
|------|---------------------|------------------|
| SF-786 | transactioncurrency | **No M-tab in checklist** — currency entity stubbed; confirm mapping sheet |

## Out of scope this cycle

- **SF-785 Product** (`M accelins_p -> Product(ins)`) — documented in feature `@out-of-scope`

## Probe scripts

```bash
npm run probe:clm:sf-object-names:int
npm run probe:clm:sf-correlation-fields:int
```
