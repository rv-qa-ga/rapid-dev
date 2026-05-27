# E2E Automation Framework

## Executive Summary

The **E2E Automation Framework** is a unified test automation platform that consolidates UI and API testing into a single, integrated solution. The framework provides comprehensive testing coverage across the **Accelerant / BSG data pipeline**, automating critical phases of the QA lifecycle while maintaining human oversight and control at each stage.

**At a glance (May 2026):**

| Metric | Scale |
|--------|--------|
| **Test cases** (Zephyr + repo) | **2,500+** (~**2,200** Salesforce) |
| **Feature files** | **449+** |
| **npm automation commands** | **364+** |
| **Systems** | Salesforce, Dynamics, MuleSoft, SQL Server ODS/TDS, ADP/Snowflake, Lloyd's, go-live programmes, and more |
| **AI agents** | **Cursor** — generation, step automation, debugging, new-system scaffolding (see [QA Cursor getting started](QA_CURSOR_GETTING_STARTED.md)) |

**Contributing and code review:** see [Code review and contribution process](process/CODE_REVIEW_AND_CONTRIBUTION.md).

---

## Systems Integration Overview

The framework provides end-to-end testing capabilities across the CLM ecosystem. The diagram below illustrates the systems currently **in scope** for automation testing.

```
                          CLM ECOSYSTEM - AUTOMATION COVERAGE
================================================================================

    +-------------+                                      +----------------+
    | Salesforce  |------------------------------------>>|   Data Cloud   |
    |    CRM      |                                      +----------------+
    +------+------+
           |
           | (two-way)
           v
    +------------------------------------------------------------------+
    |                         MuleSoft                                  |
    |                   (Integration Layer)                             |
    +------------------------------------------------------------------+
            |                     |                     |
            | (two-way)           | (two-way)           | (two-way)
            v                     v                     v
    +------------------------------------------------------------------+
    |                       SOURCE SYSTEMS                              |
    |                                                                   |
    |   +--------------+      +--------------+      +--------------+    |
    |   |  Operations  |      |     RDM      |      |     CMT      |    |
    |   |   Workflow   |      | (Ref Data)   |      |  (Config)    |    |
    |   +--------------+      +--------------+      +--------------+    |
    |                                                                   |
    +------------+-----------------------------+-----------------------+
                 |                             |
                 |                             |  Fivetran
                 |                             v
                 |                                        +------------------+
                 |              +--------------------+    | Data Ingestion   |
                 |              |     Snowflake      |<<--|     Layer        |
                 |              |  (Data Product)    |    | (External Data)  |
                 |              +----------+---------+    +------------------+
                 |                         |
                 v                         v
    +------------------------------------------------------------------+
    |                      ODS/TDS (SQL Server)                         |
    |                   Operational Data Store                          |
    |   * Data Aggregation              * Business Rules                |
    |   * Data Transformation           * Cross-System Validation       |
    +----------------------------------+-------------------------------+
                                       |
                                       v
                    +----------------------------------+
                    |       Downstream Systems         |
                    |       (Blob/SharePoint)          |
                    +----------------------------------+

================================================================================
```

### Systems In Scope

| System | Type | Testing Coverage |
|--------|------|------------------|
| **Salesforce CRM** | Core Platform | UI + API Testing |
| **Data Cloud** | Data Platform | API Integration Testing |
| **MuleSoft** | Integration Layer | API Contract Testing |
| **Operations Workflow** | Business Process | UI + API Testing |
| **RDM** | Reference Data Management | API Testing |
| **CMT** | Configuration Management | API Testing |
| **ODS** | Operational Data Store (SQL Server) | Data Validation Testing, SSIS pipeline checks |
| **TDS** | Transaction Data Store (SQL Server) | Data Validation Testing, loader / downstream checks |
| **ADP (Snowflake)** | Analytics Data Platform (FinOps / CLM data products) | Read-only Snowflake queries via Entra SPN |
| **Blob/SP** | Storage (SharePoint/Blob) | File Upload/Download Testing |
| **Snowflake** | Data Warehouse | Data Validation Testing |

### Systems Out of Scope

| System | Type | Reason |
|--------|------|--------|
| Tagetik | Financial Reporting | Separate validation process (Lloyd's loader rows tested via SQL where in scope) |
| MS Dynamics 365 GL | General Ledger Interface | Out of CLM scope |
| VIPR Local | Data Processing | Not in current roadmap |
| Launchpad | Portal | Future - Planned |
| Intrali | External Integration | Future - Planned |
| Duck Creek | Policy Admin | Future - Planned |
| Bordereaux Submission | Data Submission | Future - Planned |

---

## Microsoft Entra QA SPN — unified authentication

Automation connects to **Dynamics, SQL Server (ODS/TDS), Snowflake (ADP), Service Bus, and Blob** using the same governed QA service principal where possible — typically the **`BSG - QA - NonProd-Automation`** Entra app registration (`D365_CLIENT_ID` / `D365_CLIENT_SECRET`, or dedicated `SQLSERVER_*` / `SNOWFLAKE_*` vars pointing at the same app).

Secrets live in `src/config/env/.env.<env>` (gitignored). See [Team secrets and onboarding](setup/TEAM_SECRETS_AND_ONBOARDING.md).

### How connections are made

| Target | Auth mechanism | Env vars (typical) | OAuth scope / notes |
|--------|----------------|-------------------|---------------------|
| **Dynamics / Dataverse** | Entra client credentials | `D365_TENANT_ID`, `D365_CLIENT_ID`, `D365_CLIENT_SECRET` | `https://<org-host>/.default` |
| **SQL Server (ODS/TDS, Azure SQL)** | Entra client credentials → SQL access token | `SQLSERVER_*` **or** reuse `D365_*` when SQL vars omitted | `https://database.windows.net/.default` via `SqlServerAuth` (`src/utils/sqlserver-auth.ts`) |
| **Snowflake (ADP reads)** | Entra OAuth → Snowflake External OAuth | `SNOWFLAKE_CLIENT_ID`, `SNOWFLAKE_CLIENT_SECRET`, `SNOWFLAKE_USER`, `SNOWFLAKE_OAUTH_SCOPE` or `SNOWFLAKE_OAUTH_RESOURCE` | Application ID URI + `/.default` for client_credentials; see `src/utils/fowd-agency-xml-compare/snowflake-fetch.ts` |
| **Azure Service Bus / Blob (Lloyd's hops)** | Same SPN | `LLOYDS_SERVICE_BUS_*` or `D365_*` when `LLOYDS_USE_SPN=true` | Queue sender / blob data roles on non-prod resources |

**Local developer fallback:** When SPN secrets are not loaded, several clients fall back to **`DefaultAzureCredential`** (`az login`, VS Code sign-in) — see `src/integrations/lloyds/credential.ts`. CI and headless runs should use the SPN path.

**Diagnostics:**

```bash
npm run lloyds:snowflake:entra-diagnose   # Entra token / scope errors for Snowflake ADP
npm run lloyds:snowflake:probe            # Read-only ADP cohort probe (Snowflake)
```

Config reference: `src/config/env/env.sample` — blocks **LLOYD'S / FINOPS — SNOWFLAKE** and **SQL Server**.

---

## ADP / Snowflake integration

The framework performs **read-only** queries against Snowflake ADP tables (FinOps Lloyd's cohorts, go-live data products such as `MEMBER_WRITTEN_PREMIUM_VS_PLAN_V2`) using the **same QA SPN** as Dynamics and SQL Server.

| Capability | Location | Command / tag |
|------------|----------|---------------|
| ADP cohort diagnostic (FOWC/FOWD/summary) | `scripts/lloyds/probe-snowflake-cohort.ts` | `npm run lloyds:snowflake:probe` |
| Cucumber Snowflake module tests | `lloyds-snowflake-adp.steps.ts`, `lloyds-pipeline.feature` §B | `npm run test:lloyds:phase2` |
| ADP totals in Service Bus payloads | `xmlTotals.ts`, `snowflakeSummaryClient.ts` | Used by `lloyds-pipeline-hops.feature` |
| Go-live / ADP federation checks | `src/features/integration/clm-go-live/` (and related) | Manual / `@snowflake` scenarios |

Further detail: [Lloyd's test strategy](lloyds/LLOYDS_TEST_STRATEGY.md) §2.3 and migration / go-live test plans under `docs/clm/` where applicable.

Snowflake login uses **`OAUTH_CLIENT_CREDENTIALS`** when `SNOWFLAKE_CLIENT_ID` + `SNOWFLAKE_CLIENT_SECRET` are set; otherwise **`EXTERNALBROWSER`** for interactive local runs. One shared connection per process avoids multiple SSO tabs (`SNOWFLAKE_REUSE_SHARED_CONNECTION`).

---

## ODS/TDS pipeline test utility

A reusable **SQL Server pipeline test utility** drives SSIS / SQL Agent jobs and validates ODS/TDS outcomes without requiring a full manual load every time. It complements UI/API tests by asserting **database and job state** across the DE pipeline.

### Components

| Layer | Module | Purpose |
|-------|--------|---------|
| **Connection** | `src/sqlserver/client/SqlServerClient.ts` | Multi-database client; QA SPN via Entra (`SQLSERVER_*` or `D365_*`) |
| **SSIS / Agent jobs** | `src/sqlserver/helpers/ssis-jobs.ts` | Start jobs, poll completion, run individual job steps (e.g. Source Staging step 2) |
| **Validation helpers** | `src/sqlserver/tests/helpers/validation.ts` | Row waits, field compare, source ↔ SQL reconciliation |
| **Cucumber steps** | `src/step-definitions/api/sqlserver/sqlserver.steps.ts` | Reusable Given/When/Then for queries, jobs, and cross-system checks |
| **Scenarios** | `src/features/integration/sqlserver/businessdata-validation.feature` | Business Data job, Source Staging Loads, E2E Account → Reference Party in ODS |

### Stubbing and boundary testing

Where upstream systems are slow or unavailable, tests **stub or isolate** one hop and assert the next layer:

| Pattern | What is stubbed / triggered | What is asserted |
|---------|----------------------------|------------------|
| **BSG ODS pipeline** | Salesforce/Dynamics setup via API; **SSIS job step** triggered by automation | `[Reference].master.[Party]` and related ODS tables after Business Data / Source Staging |
| **Lloyd's per-hop pipeline** | **Service Bus message** published by QA SPN (simulates MuleSoft/Dataverse publisher); ADP totals from Snowflake | Dataverse workflow, blob XML, **TDS Tagetik loader** (`lloydsTagetikTdsClient.ts`), Mule `PROCESS_TRACKER` on Azure SQL |
| **Seed / fixture mode** | JSON log fixtures or SQL seed scripts (see Lloyd's ENG/PP test plan) | ODS/TDS row presence without live ingestion |

Lloyd's hop tests: `src/features/lloyds/lloyds-pipeline-hops.feature`, CLI `npm run lloyds:sanity:send-xml`, `npm run test:lloyds:hops`.

BSG SQL-only checks:

```bash
npm run test:feature -- src/features/integration/sqlserver/businessdata-validation.feature --tags "@businessdata"
```

Example steps (orchestrated by the utility):

- `When I run the SSIS job "Business Data"`
- `When I run step 2 of the SSIS job "Source Staging Loads"`
- `Then I confirm the party should exist in the Reference Party table`

---

## QA Lifecycle Automation

The framework automates **five key phases** of the QA lifecycle. Each phase is **initiated, controlled, and reviewed by QA engineers** to ensure quality and accuracy.

```
                       E2E AUTOMATION FRAMEWORK
========================================================================

  +--------------+     +--------------+     +--------------+
  |   PHASE 1    |     |   PHASE 2    |     |   PHASE 3    |
  |  Requirement | --> |  Test Case   | --> |  Test Data   |
  |   Analysis   |     |    Design    |     |    Setup     |
  +--------------+     +--------------+     +--------------+
         |                   |                    |
         v                   v                    v
  +------------------------------------------------------+
  |              QA REVIEW & APPROVAL                     |
  +------------------------------------------------------+
         |                   |                    |
         v                   v                    v
  +--------------+     +--------------+     +--------------+
  |   PHASE 4    |     |   PHASE 5    |     |   PHASE 6    |
  |    Test      | --> |   Evidence   | --> | Bug Creation |
  |  Execution   |     |  Generation  |     |  (Planned)   |
  +--------------+     +--------------+     +--------------+

========================================================================
```

---

## Phase 1: Requirement Analysis

**Objective:** Extract and analyze requirements from Jira work items to understand test scope.

| Aspect | Description |
|--------|-------------|
| **Input** | Jira Work Item ID (e.g., SF-520, CLM-1234) |
| **Process** | Connects to Jira API, extracts acceptance criteria, field definitions, and business rules |
| **Output** | Structured test requirements ready for test case design |
| **QA Control** | QA reviews extracted requirements for completeness and accuracy |

**Automation Command:**
```bash
npm run jira:generate -- --work-item SF-520
```

---

## Phase 2: Test Case Design

**Objective:** Generate comprehensive test cases from requirements in Gherkin (BDD) format.

| Aspect | Description |
|--------|-------------|
| **Input** | Analyzed requirements from Phase 1 |
| **Process** | Generates feature files with scenarios covering positive, negative, and edge cases |
| **Output** | Cucumber feature files (.feature) with tagged scenarios |
| **QA Control** | QA reviews and refines generated test cases before execution |

**Generated Test Types:**
- ✅ Data-driven scenarios (Scenario Outlines)
- ✅ End-to-end workflow tests
- ✅ Permission-based access tests
- ✅ Validation and error handling tests
- ✅ Search and filter tests
- ✅ Cross-system integration tests

**Step 1: Generate Test Cases**
```bash
# Generate UI test cases
npm run jira:generate -- --work-item SF-520 --type ui

# Generate API test cases
npm run jira:generate -- --work-item SF-520 --type api
```

**Step 2: QA Review**
- QA reviews generated feature files in `src/features/ui/` or `src/features/api/`
- Refines scenarios, adds edge cases, adjusts test data
- Approves test cases for Zephyr upload

**Step 3: Upload to Zephyr Scale**

After QA approval, test cases are uploaded to Zephyr Scale for test management and traceability.

```bash
# Upload all test cases for a work item
npm run zephyr:UploadTestCase -- --work-item SF-520

# Upload a specific test case
npm run zephyr:UploadTestCase -- --test-case SF-520-UI-001
```

**Zephyr Upload Process:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    ZEPHYR SCALE SYNC                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Feature File (.feature)                                         │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Parse Scenarios                                         │    │
│  │  • Extract tags (@SF-520-UI-001)                        │    │
│  │  • Extract scenario name                                 │    │
│  │  • Extract Gherkin steps                                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Check Existing in Zephyr                                │    │
│  │  • Search by test case ID                                │    │
│  │  • Update if exists, Create if new                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Zephyr Test Case                                        │    │
│  │  • Name: SF-520-UI-001 - Scenario Name                   │    │
│  │  • Labels: SF-520, UI, smoke, p1                         │    │
│  │  • Test Script: Gherkin steps (Step-by-Step format)      │    │
│  │  • Linked to Jira Work Item                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

| Upload Option | Command | Description |
|---------------|---------|-------------|
| **By Work Item** | `--work-item SF-520` | Uploads all test cases for the work item |
| **By Test Case** | `--test-case SF-520-UI-001` | Uploads a specific test case |
| **Dry Run** | `--dry-run` | Preview without uploading |

---

## Phase 3: Test Data Setup

**Objective:** Create and manage test data required for test execution across all integrated systems.

| Aspect | Description |
|--------|-------------|
| **Input** | Test scenario data requirements |
| **Process** | Creates records via API across Salesforce, RDM, and other systems |
| **Output** | Ready-to-use test data with unique identifiers |
| **QA Control** | QA defines data templates and validation rules |

**Features:**
- 🔄 Automatic test data creation before each scenario
- 🧹 Automatic cleanup after test completion
- 🔑 Unique identifiers to prevent data conflicts
- 📋 Comprehensive field population (24+ fields per Account)
- 🔗 Cross-system data synchronization

**Test Data Factory Capabilities:**
```
┌──────────────────────────────────────────────────────────────┐
│                    TEST DATA FACTORY                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Salesforce        RDM              MuleSoft                  │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐               │
│  │ Account │◄────▶│Reference│◄────▶│ Message │               │
│  │ Contact │      │  Data   │      │ Payload │               │
│  │Opportun.│      │         │      │         │               │
│  └─────────┘      └─────────┘      └─────────┘               │
│       │                │                │                     │
│       └────────────────┼────────────────┘                     │
│                        ▼                                      │
│              Data Consistency Validation                      │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Phase 4: Test Execution

**Objective:** Execute tests across UI and API layers with intelligent handling across all integrated systems.

| Aspect | Description |
|--------|-------------|
| **Input** | Feature files + Test data |
| **Process** | Playwright browser automation + REST API testing |
| **Output** | Pass/Fail results with detailed logs |
| **QA Control** | QA selects test scope, environment, and execution mode |

**Execution Modes:**
- 🖥️ **Headed Mode** - Visual browser for debugging
- 👻 **Headless Mode** - Fast CI/CD execution
- 🔍 **Debug Mode** - Step-by-step with Playwright Inspector

**Multi-System Test Architecture:**
```
                         TEST EXECUTION ENGINE
========================================================================

    +----------------+                    +----------------+
    |   UI Tests     |                    |   API Tests    |
    |  (Playwright)  |                    |   (REST/JWT)   |
    +-------+--------+                    +-------+--------+
            |                                     |
            +------------------+------------------+
                               |
                               v
    +------------------------------------------------------------------+
    |            Page Object Model (POM) + Field Registry               |
    +----------------------------------+-------------------------------+
                                       |
                                       v
    +------------------------------------------------------------------+
    |                      SYSTEMS UNDER TEST                           |
    +------------+------------+------------+------------+--------------+
    | Salesforce |  MuleSoft  |    RDM     |    CMT     |  Snowflake   |
    |    CRM     |   (APIs)   |   (APIs)   |   (APIs)   |    (Data)    |
    +------------+------------+------------+------------+--------------+
                               |
                               v
    +------------------------------------------------------------------+
    |                      ODS (SQL Server)                             |
    |                   Operational Data Store                          |
    |   * Data Aggregation              * Business Rules                |
    |   * Data Transformation           * Cross-System Validation       |
    +----------------------------------+-------------------------------+
                                       |
                                       v
    +------------------------------------------------------------------+
    |                   DOWNSTREAM VALIDATION                           |
    |                     Blob/SharePoint                               |
    +------------------------------------------------------------------+

========================================================================
```

**Automation Commands:**
```bash
# Run all tests for a work item
npm run test:all -- --tags @SF-520

# Run specific test case
npm run test:all -- --tags @SF-520-UI-001

# Run in specific environment
npm run test:all -- --tags @SF-520  # Prompts for environment selection
```

---

## Phase 5: Evidence Generation

**Objective:** Capture comprehensive evidence for audit, compliance, and debugging.

| Aspect | Description |
|--------|-------------|
| **Input** | Test execution results |
| **Process** | Screenshots, HTML reports, and structured JSON results |
| **Output** | Evidence stored in Confluence with Zephyr linking |
| **QA Control** | QA reviews evidence and approves test results |

**Evidence Types:**
- 📸 **Screenshots** - Captured at key verification points
- 📄 **HTML Reports** - Interactive test result summaries
- 📊 **JSON Reports** - Machine-readable results for CI/CD
- 🔗 **Zephyr Integration** - Test executions linked to test cycles

**Evidence Flow:**
```
Test Execution
      │
      ▼
┌─────────────────┐
│ Local Evidence  │
│ • Screenshots   │
│ • HTML Report   │
│ • JSON Results  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Confluence    │
│ • Cycle Folder  │
│ • Test Pages    │
│ • Attachments   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Zephyr Scale   │
│ • Executions    │
│ • Evidence Link │
│ • Status Update │
└─────────────────┘
```

**Automation Commands:**
```bash
# Upload results to Zephyr with Confluence evidence
npm run zephyr:UploadResult -- --cycle "Sprint-93-QA" --test-case SF-520-UI-001
```

---

## Phase 6: Bug Creation (Planned)

**Objective:** Automatically create Jira bugs for failed test cases.

| Aspect | Description |
|--------|-------------|
| **Input** | Failed test execution with error details |
| **Process** | Extract failure info, screenshots, and create Jira bug |
| **Output** | Linked Jira bug with reproduction steps |
| **QA Control** | QA reviews and triages created bugs |

*This phase is planned for future implementation.*

---

## Test Tagging Strategy

The framework uses a structured tagging system for test organization and execution control.

### Tag Format

```
@{PROJECT}-{WORKITEM}-{TYPE}-{SEQUENCE}

Examples:
  @SF-520-UI-001    → Salesforce Work Item 520, UI Test, Scenario 1
  @SF-520-API-001   → Salesforce Work Item 520, API Test, Scenario 1
  @CLM-1234-UI-001  → CLM Work Item 1234, UI Test, Scenario 1
```

### Tag Categories

| Tag Type | Purpose | Examples |
|----------|---------|----------|
| **Work Item** | Links to Jira story | `@SF-520`, `@CLM-1234` |
| **Test Case ID** | Unique test identifier | `@SF-520-UI-001`, `@SF-520-API-002` |
| **Priority** | Execution priority | `@p1`, `@p2`, `@p3` |
| **Test Type** | Test category | `@smoke`, `@regression`, `@e2e` |
| **Feature** | Feature area | `@workflow`, `@validation`, `@permissions` |

### Execution by Tags

```bash
# Run by work item (all tests)
npm run test:all -- --tags @SF-520

# Run by test case ID
npm run test:all -- --tags @SF-520-UI-001

# Run by priority
npm run test:all -- --tags @p1

# Run smoke tests only
npm run test:all -- --tags @smoke

# Combine tags (AND logic)
npm run test:all -- --tags "@SF-520 and @smoke"

# Exclude tags
npm run test:all -- --tags "@SF-520 and not @wip"
```

---

## Technical Architecture

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Test Runner** | Cucumber.js (BDD) |
| **Browser Automation** | Playwright |
| **API Testing** | Axios + JWT Authentication |
| **Language** | TypeScript |
| **Reporting** | HTML + JSON + Allure |
| **CI/CD Ready** | Headless execution support |

### Design Patterns

| Pattern | Purpose |
|---------|---------|
| **Page Object Model (POM)** | Encapsulates UI interactions per system |
| **Field Registry** | Centralized field locators for all systems |
| **Test Data Factory** | Manages test data lifecycle across systems |
| **Step Definitions** | Reusable Cucumber steps |
| **API Client Pattern** | Consistent API interactions per system |

### External Integration Points

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                         INTEGRATION ARCHITECTURE                               │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌───────────────────────────────────────────────────────────────────────┐    │
│  │                      QA TOOLING INTEGRATIONS                          │    │
│  ├─────────────┬─────────────┬─────────────────────────────────────────┤    │
│  │    Jira     │   Zephyr    │            Confluence                    │    │
│  │  (Stories)  │   Scale     │            (Evidence)                    │    │
│  └──────┬──────┴──────┬──────┴─────────────────┬───────────────────────┘    │
│         │              │                        │                            │
│         └──────────────┼────────────────────────┘                            │
│                        │                                                      │
│                        ▼                                                      │
│         ┌──────────────────────────────────┐                                 │
│         │    E2E AUTOMATION FRAMEWORK      │                                 │
│         └──────────────────────────────────┘                                 │
│                        │                                                      │
│                        ▼                                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │                    SYSTEMS UNDER TEST                                  │   │
│  ├───────────┬───────────┬───────────┬───────────┬───────────────────────┤   │
│  │ Salesforce│  MuleSoft │    RDM    │    CMT    │  Snowflake  │   ODS   │   │
│  │    CRM    │   (APIs)  │   (APIs)  │   (APIs)  │   (Data)    │  (SQL)  │   │
│  └───────────┴───────────┴───────────┴───────────┴─────────────┴─────────┘   │
│                                                                                │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Framework Utilities & Tools

The framework includes a comprehensive set of utilities to support the entire QA lifecycle.

### 0. ODS/TDS pipeline & ADP reads (summary)

| Utility | Command | Description |
|---------|---------|-------------|
| SSIS / SQL Agent pipeline | Steps in `sqlserver.steps.ts` | Run and wait for DE pipeline jobs; query ODS/TDS |
| Business Data validation | `businessdata-validation.feature` | Job completion + Reference Party E2E |
| Snowflake ADP probe | `npm run lloyds:snowflake:probe` | Read-only ADP cohort diagnostic |
| Lloyd's hop stub + assert | `npm run test:lloyds:hops` | Service Bus stub + Snowflake + SQL boundaries |

See [ODS/TDS pipeline test utility](#odstds-pipeline-test-utility) and [ADP / Snowflake integration](#adp-snowflake-integration) above.

---

### 1. Test Data Factory

Automatically creates and manages test data via Salesforce API.

```bash
# Test data is created automatically before each scenario
# No manual data setup required
```

**Features:**
| Feature | Description |
|---------|-------------|
| **Auto-Creation** | Creates Accounts, Contacts, Opportunities before tests |
| **Full Field Population** | 24+ fields populated with realistic data |
| **Auto-Cleanup** | Removes test data after test completion |
| **Unique Identifiers** | Prevents data conflicts with timestamped names |
| **Cross-Object** | Maintains parent-child relationships |

---

### 2. Test Data Cleanup

Removes orphaned test data from failed or interrupted test runs.

```bash
# Clean up test accounts
npm run cleanup:accounts

# Clean up with custom parameters
npm run cleanup:test-data -- Account "Test Account%" 100
```

**Parameters:**
| Parameter | Description | Default |
|-----------|-------------|---------|
| Entity | Salesforce object type | Account |
| Pattern | Name pattern to match | Test Account% |
| Limit | Max records to delete | 100 |

---

### 3. On-Demand Test Data Creation

Create **persistent test data** that is NOT automatically cleaned up. Use this for manual testing, demo environments, or when you need sample records to remain in the QA org.

```bash
# Create accounts for all 16 Account Types
npm run test:feature src/features/ui/General/on-demand-test-data.feature -- --tags "@onDemand and @allTypes"

# Create accounts with all 7 Account Statuses
npm run test:feature src/features/ui/General/on-demand-test-data.feature -- --tags "@onDemand and @allStatuses"

# Create accounts for all Regions (US, UK, EU, CA, ROW)
npm run test:feature src/features/ui/General/on-demand-test-data.feature -- --tags "@onDemand and @allRegions"

# Create accounts for 15 different Countries
npm run test:feature src/features/ui/General/on-demand-test-data.feature -- --tags "@onDemand and @allCountries"

# Create everything (comprehensive data set)
npm run test:feature src/features/ui/General/on-demand-test-data.feature -- --tags "@onDemand"
```

**Available Tags:**

| Tag | Records Created | Data Diversity |
|-----|-----------------|----------------|
| `@allTypes` | 16 Accounts | Acquisition Company, Agency, Agency Branch, Distribution Partner, Group, Insurer, Insurer Branch, Legal Entity, Member, Non-Member MGA, Placing Broker, Reinsurance Broker, Reinsurer, Reinsurer Branch, Service Company, Third Party Administrator |
| `@allStatuses` | 7 Accounts | Prospect, Onboarding, Contracted, Active, Runoff, Offboarded, Invalid |
| `@allRegions` | 5 Accounts | US, UK, EU, CA, ROW |
| `@allCountries` | 15 Accounts | Germany, UK, France, Netherlands, Belgium, US, Canada, Australia, Singapore, Japan, Switzerland, Spain, Italy, Hong Kong, UAE |
| `@createLeads` | Sample Leads | Various lead sources and statuses |
| `@createContacts` | Sample Contacts | Various departments and titles |
| `@createOpportunities` | Sample Opportunities | Various stages and amounts |

**Key Features:**
- 🔒 Records are marked as **persistent** and will NOT be deleted by cleanup hooks
- 🌍 Automatically populates region-specific data (currency, phone format, address)
- 📝 Uses unique timestamps to avoid naming conflicts
- ✅ API-based creation for speed and reliability

---

### 4. Step Definition Validator

Validates that all Gherkin steps have matching step definitions.

```bash
# Validate all feature files
npm run validate:steps:all

# Validate specific feature file
npm run validate:steps -- --feature src/features/ui/SF/SF-520.feature
```

**Output:**
- ✅ Lists matched steps
- ❌ Reports missing step definitions
- 📝 Suggests step definition templates

---

### 5. Interactive Test Runner

Run tests with Playwright Inspector for debugging and locator selection.

```bash
# Run interactive test (opens Playwright Inspector)
npm run test:interactive

# Run specific feature interactively
npm run test:interactive:login
```

**Features:**
- 🔍 Visual debugging with step-through execution
- 🎯 Pick locators directly from the browser
- ⏸️ Pause and resume test execution
- 📸 Inspect DOM at any point

---

### 6. Playwright Recorder (Codegen)

Record interactions to generate selectors and test code.

```bash
# Record account creation flow
npm run record:account

# Record account field interactions
npm run record:account:fields
```

**Use Cases:**
- Discover correct selectors for new pages
- Generate code snippets for complex interactions
- Identify dynamic element patterns

---

### 7. Field Registry

Centralized repository for all Salesforce field locators.

```typescript
// Usage in step definitions
const registry = new FieldRegistry(page);
await registry.setValue('Account Status', 'Contracted');
const value = await registry.getValue('Account Status');
```

**Supported Field Types:**
| Type | Examples |
|------|----------|
| `text` | Account Name, Description |
| `combobox` | Account Status, Type, Industry |
| `dual-listbox` | Country (multi-select) |
| `lookup` | Parent Account, Owner |
| `checkbox` | Active, Do Not Call |
| `date` / `datetime` | Contract Start Date |
| `currency` / `number` | Annual Revenue, Employees |
| `phone` / `email` / `url` | Contact fields |

---

### 8. Report Generation

Multiple report formats for different audiences.

```bash
# Generate full HTML report
npm run report:full

# Generate report by work item
npm run report:full:work-item

# Generate Allure report
npm run report:allure
npm run report:allure:open
```

**Report Types:**
| Report | Format | Audience |
|--------|--------|----------|
| **HTML Report** | Interactive HTML | QA Team, Stakeholders |
| **JSON Report** | Machine-readable | CI/CD Integration |
| **Allure Report** | Rich visualization | Detailed Analysis |
| **Cucumber Report** | Standard format | BDD Traceability |

---

### 9. Jira Integration

Generate test cases from Jira work items.

```bash
# Generate UI and API tests from Jira story
npm run jira:generate -- --work-item SF-520

# Generate specific type
npm run jira:generate -- --work-item SF-520 --type ui
npm run jira:generate -- --work-item SF-520 --type api
```

**Process:**
1. Fetches work item details from Jira
2. Analyzes description, acceptance criteria, comments
3. Extracts field values and validation rules
4. Generates comprehensive Gherkin scenarios

---

### 10. Zephyr Scale Integration

Sync test cases and upload execution results.

```bash
# Upload test cases to Zephyr
npm run zephyr:UploadTestCase -- --work-item SF-520
npm run zephyr:UploadTestCase -- --test-case SF-520-UI-001

# Upload execution results
npm run zephyr:UploadResult -- --cycle "Sprint-93-QA" --test-case SF-520-UI-001
```

**Features:**
| Feature | Description |
|---------|-------------|
| **Test Case Sync** | Creates/updates test cases in Zephyr |
| **Test Script Upload** | Uploads Gherkin steps to Test Script tab |
| **Execution Results** | Maps Pass/Fail/Skipped to Zephyr statuses |
| **Test Cycle Management** | Creates or uses existing test cycles |

---

### 11. Confluence Evidence Storage

Upload test evidence to Confluence for audit trails. (Due to space limit in Zephyr Scale)

```bash
# Evidence is uploaded automatically when running zephyr:UploadResult
# Creates folder structure: Test Cycle → Test Case → Attachments
```

**Structure:**
```
📁 Test Evidence (Parent Folder)
└── 📁 Sprint-93-QA (Test Cycle Folder)
    ├── 📄 SF-520-UI-001 - Set Status to valid values
    │   ├── 📸 screenshot-1.png
    │   ├── 📸 screenshot-2.png
    │   └── 📊 test-report.html
    └── 📄 SF-520-UI-002 - Complete workflow
        └── 📸 evidence.png
```

---

### Utility Command Reference

| Command | Description |
|---------|-------------|
| `npm run test:all` | Run all tests with environment selection |
| `npm run test:ui` | Run UI tests only |
| `npm run test:api` | Run API tests only |
| `npm run test:interactive` | Run with Playwright Inspector |
| `npm run jira:generate` | Generate tests from Jira |
| `npm run zephyr:UploadTestCase` | Upload test cases to Zephyr |
| `npm run zephyr:UploadResult` | Upload results to Zephyr |
| `npm run validate:steps` | Validate step definitions |
| `npm run cleanup:accounts` | Clean up test data |
| `npm run report:full` | Generate full HTML report |
| `npm run report:allure` | Generate Allure report |
| `npm run record:account` | Record with Playwright Codegen |

---

## Environment Support

| Environment | Purpose | Configuration | Systems |
|-------------|---------|---------------|---------|
| **DEV** | Development testing | `.env.dev` | Salesforce DEV, MuleSoft DEV |
| **QA** | QA validation | `.env.qa` | Full QA ecosystem |
| **UAT** | User acceptance testing | `.env.uat` | Full UAT ecosystem |
| **PROD** | Production verification | `.env.prod` | Read-only validation |

---

## Key Benefits

| Benefit | Impact |
|---------|--------|
| **Unified Platform** | Single framework for UI + API testing across all CLM systems |
| **Multi-System Coverage** | Tests span Salesforce, MuleSoft, RDM, CMT, and downstream systems |
| **Faster Execution** | Parallel test execution capability |
| **Reduced Maintenance** | Centralized locators and reusable steps |
| **Full Traceability** | Jira → Test Case → Execution → Evidence |
| **QA Control** | Human oversight at every phase |
| **Audit Ready** | Comprehensive evidence in Confluence |
| **Data Integrity** | Cross-system data validation |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Access to Salesforce, MuleSoft, and other system environments
- Jira/Zephyr API tokens
- Confluence API tokens

### Quick Start
```bash
# Install dependencies
npm install

# Run tests for a specific work item
npm run test:all -- --tags @SF-520

# Run tests by priority
npm run test:all -- --tags @p1

# Upload results to Zephyr
npm run zephyr:UploadResult -- --cycle "Sprint-93-QA"
```

---

### SF-612 — Member Legal Entity Relationship platform events (API)

`src/features/api/SF/SF-612.feature` aligns with JIRA **SF-612**: eligibility (related Accounts must have `Dataverse_ID__c`), `Is_Active__c` from Start/End dates (see **SF-614**), Create vs Update behaviour, and Streaming API verification.

- **RBT / API-only scenarios** (`@SF-612-API-001` … `003`): no Streaming subscription; safe for CI when platform events are not configured.
- **Streaming scenarios** (`@platform-events`): subscribe before create/update. Default channel: `/event/Member_Legal_Entity_Relationship_Event__e`. If your org uses a different custom platform event, set:
  - `SF612_MLER_PLATFORM_EVENT_CHANNEL` — full channel path (e.g. `/event/Your_Event__e`)
  - `SF612_MLER_PLATFORM_EVENT_API_NAME` — optional; API name used when filtering by `Identifier__c` (e.g. `Your_Event__e`)
- **Handshake / slow CometD:** default handshake wait is **120s** (`getStreamingHandshakeTimeoutMs`). Override with `SALESFORCE_STREAMING_HANDSHAKE_TIMEOUT_MS` (minimum `15000`). Faye HTTP timeout scales with this value.
- **`Is_Active__c`:** streaming scenarios assert the field is present on the event payload; there is **no bypass**—missing `Is_Active__c` fails the test until the platform event metadata matches SF-612.
- **API-007 (no Member `Dataverse_ID__c`):** uses a **Prospect** Member with a **verified blank** `Dataverse_ID__c` before MLER create (same idea as manual QA: Prospect/New, no debtor id). An **Onboarding** Member can pick up `Dataverse_ID__c` from org flows, which incorrectly makes “no event” scenarios fail.

Run API-only: `--tags "@SF-612 and not @platform-events"`.

**QA payload note:** Inspector may show `Record_Id__c` (underscore) on `Member_Legal_Entity_Relationship_Event__e`; the streaming client normalizes that for assertions. **`Is_Active__c` must be present on the event** per SF-612; if it is absent, streaming scenarios fail with an explicit defect message until the platform event metadata is fixed.

### SF-788 — Account Relationship (TPA Maps) platform events (API)

`src/features/api/SF/SF-788.feature` mirrors JIRA **SF-788**: TPA + TPA Group accounts (`Dataverse_ID__c` **strict** when eligibility is required), `Account_Relationship__c` (Source = TPA Group, Related = TPA), Create/Update platform events, ineligible paths, failed-save noise check, traceability.

- **Shared helpers:** `src/integrations/salesforce/dataverse-relationship-testkit.ts` (stamp/assert/clear `Dataverse_ID__c`). **Shared background steps** (eligibility wording): `src/step-definitions/common/dataverse-relationship-background.steps.ts` (used by SF-612 and SF-788).
- **RBT / API-only** (`@SF-788-API-001`, `002`, `011`–`013`): no Streaming.
- **Streaming** (`@platform-events`): 20s publish wait + 120s receive timeout (same spirit as SF-612). Channel default `/event/Account_Relationship_Event__e`; override with **`SF788_PLATFORM_EVENT_CHANNEL`** if needed.
- **Record ID in events:** generic platform-event steps resolve **`accountRelationshipId` before `accountId`** so TPA Map `Record_Id__c` assertions are correct.
- **API-008:** clears `Dataverse_ID__c` on the TPA Group via API; if the org blocks nulling the field, the step fails with a clear message (cannot fake ineligibility).
- **API-010:** invalid create payload → API error → assert no `Account_Relationship_Event__e` in the streaming buffer for 60s.
- **MuleSoft → Dataverse** behaviour from the story is **not** automated here (integration scope); API-011 asserts **`Is_Active__c` is queryable** on the relationship for payload alignment.

Run API-only: `--tags "@SF-788 and not @platform-events"`.

---

## Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| ✅ | Salesforce CRM UI Testing | Complete |
| ✅ | Salesforce CRM API Testing | Complete |
| ✅ | MuleSoft Integration Testing | Complete |
| ✅ | Zephyr Scale Integration | Complete |
| ✅ | Confluence Evidence Storage | Complete |
| 🔄 | RDM/CMT API Testing | In Progress |
| 📋 | ODS Data Validation | Planned (Phase 1) |
| 📋 | Automatic Bug Creation | Planned |

### Out of Scope

| System | Reason |
|--------|--------|
| Tagetik | Financial system - separate validation process |
| MS Dynamics 365 GL | GL interface - out of CLM scope |
| TDS | Transaction Data Store - future consideration |
| VIPR Local | Data processing - not in current roadmap |

---

*Documentation maintained by QA Automation Team*  
*Last Updated: December 2024*
