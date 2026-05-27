# language: en
@sf-api @sf-parity-auto-report
Feature: QA to UAT Salesforce parity and API regression entry points
  # Baseline: .env.<ENV> (e.g. .env.qa). UAT JWT: src/config/env/.env.uat (SF_JWT_USERNAME). Optional: SF_PARITY_UAT_JWT_USERNAME in .env.qa overrides UAT user.
  # @sf-parity-auto-report: after EVERY scenario an Excel artifact is written under reports/sf-org-parity/<runStamp>/<scenarioName>.xlsx
  # Overrides: SF_PARITY_REPORT_DIR, SF_PARITY_REPORT_OBJECTS (all|custom), SF_PARITY_REPORT_EXCLUDE_PREFIXES (csv), SF_PARITY_REPORT_FIELD_DIFF_MAX (int, 0 = off), SF_PARITY_REPORT_PERMISSION_SETS (true|false)
  # Mismatching rows (API name missing on one side OR label differs) are highlighted yellow in Objects and PermissionSets sheets.
  # Strict parity only: npm run test:sf:parity:qa-uat
  # Inventory export scenario: npm run test:sf:parity:report
  # Full API regression on UAT: npm run test:api:uat

  Background:
    Given I have paired Salesforce API clients for QA baseline and UAT target parity

  @sf-parity
  Scenario: API - Verify describe-global custom objects match strictly between QA and UAT
    When I capture describe-global custom object names from the parity baseline org
    And I capture describe-global custom object names from the parity UAT org
    Then describe-global custom object API names should match strictly between baseline and UAT

  @sf-parity
  Scenario: API - Verify Tooling EntityDefinition custom objects match strictly between QA and UAT
    When I capture Tooling EntityDefinition custom API names with no namespace from the parity baseline org
    And I capture Tooling EntityDefinition custom API names with no namespace from the parity UAT org
    Then Tooling custom EntityDefinition API names should match strictly between baseline and UAT

  @sf-parity
  Scenario Outline: API - Verify standard object custom fields match strictly between QA and UAT describe
    When I capture field API names for "<Object>" from the parity baseline org
    And I capture field API names for "<Object>" from the parity UAT org
    Then custom fields on "<Object>" should match strictly between baseline and UAT describe

    Examples:
      | Object      |
      | Account     |
      | Contact     |
      | Lead        |
      | Opportunity |

  @sf-parity-report
  Scenario: API - Export describeGlobal SObject inventory QA vs UAT to Excel
    When I capture describe-global all SObject rows from the parity baseline org for parity report
    And I capture describe-global all SObject rows from the parity UAT org for parity report
    And I write the QA vs UAT parity workbook to Excel
    Then the parity report workbook should exist on disk
