# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-429 - Implement HTTP-triggered Dimension Validation Function (fa-dimensionvalidation)
# https://accelins.atlassian.net/browse/PP-429
# Type: Story | HTTP Azure Function + Dataverse UX (Lloyd's / D365 F&O agency journals)
#
# Confluence: docs/lloyds/confluence-lloyds-mulesoft-d365-agency-journals.md
#   Wiki: https://accelins.atlassian.net/wiki/spaces/ISDE/pages/2848423969
#
# Zephyr Scale (PP project) + Jira link:
#   npm run zephyr:UploadAndLink:PP429
#   Naming: @PP-429-API-### for HTTP/function scenarios; @PP-429-UI-### for Dataverse form/command bar (matches framework convention).
#
# Step definitions: `src/step-definitions/lloyds/pp429-dimension-validation.steps.ts` (+ env.sample).
# HTTP scenarios skip until `LLOYDS_DIMENSION_VALIDATION_BASE_URL` is set. UI rows remain @wip until Playwright.
# ══════════════════════════════════════════════════════════════════════════════

# Feature-level @ui would inherit onto every HTTP @api scenario and open Salesforce unnecessarily.
@api @pp @PP-429 @lloyds @azure-function @http @dataverse @dimension-validation
Feature: API - PP-429 - HTTP dimension validation function and Dataverse UX (fa-dimensionvalidation)

  As a finance approver
  I want to run dimension validation from Dataverse before approving an XML entry
  So that invalid financial dimensions are caught early using D365 F&O / Fabric master data

  Background:
    Given the PP-429 test configuration is loaded

  # ═══════════════════════════════════════════════════════════════════════════
  # HTTP function (Zephyr: PP-429-API-###)
  # ═══════════════════════════════════════════════════════════════════════════

  @PP-429 @PP-429-API-001 @p1 @smoke @component
  Scenario: API - Dimension validation POST returns echoed correlationId and pass flag
    Given the fa-dimensionvalidation base URL and authentication are configured for the test environment
    When a POST is sent to the dimension validation endpoint with JSON body:
      """
      { "correlationId": "pp429-comp-001", "blobUri": "<non-prod test blob with valid XML>" }
      """
    Then the HTTP status should be successful
    And the response body should include "correlationId" with value "pp429-comp-001"
    And the response body should include boolean "pass"

  @PP-429 @PP-429-API-002 @p1 @component
  Scenario: API - Request with minimum correlationId or blobUri accepted when policy allows
    When a POST is sent with only "correlationId" "pp429-comp-002" and resolvable context for blob lookup
    Then the HTTP status should be successful
    And the response should include "pass" and optional "invalidCombinations" list

  @wip @PP-429 @PP-429-API-003 @p1 @component
  Scenario: API - Function reads blob XML and extracts distinct financial dimension combinations
    Given blob storage contains XML with multiple DEFAULTDIMENSIONDISPLAYVALUE patterns
    When the dimension validation function processes the blob referenced in the request
    Then the function should derive a distinct set of financial dimension combinations for validation
    And each combination should be eligible for batch query to the master data endpoint

  @PP-429 @PP-429-API-004 @p1 @component
  Scenario: API - Valid dimensions return pass true and empty invalidCombinations
    When a POST is sent for XML whose dimensions exist in D365 F&O or Fabric master data (test fixture)
    Then the response "pass" should be true
    And "invalidCombinations" should be empty or omitted

  @wip @PP-429 @PP-429-API-005 @p2 @component @negative
  Scenario: API - Invalid dimensions return pass false with line references
    When a POST is sent for XML containing at least one unknown dimension combination
    Then the response "pass" should be false
    And "invalidCombinations" should list each invalid combination with a reference such as line number or id

  @PP-429 @PP-429-API-006 @p1 @component @security
  Scenario: API - Unauthenticated request receives 401 or 403
    When a POST is sent to the dimension validation endpoint without valid AAD token function key or APIM credential
    Then the HTTP status should be 401 or 403
    And no validation result body should be returned for unauthorised clients

  @PP-429 @PP-429-API-007 @p2 @component
  Scenario: API - Security model for QA documented without committed secrets
    Given security is agreed (AAD app registration function key APIM or equivalent)
    Then test documentation should reference how QA obtains a token or key without committing secrets

  # ═══════════════════════════════════════════════════════════════════════════
  # Dataverse UX (Zephyr: PP-429-UI-###)
  # ═══════════════════════════════════════════════════════════════════════════

  @wip @ui @PP-429 @PP-429-UI-001 @p1 @integration @dataverse
  Scenario: UI - Command bar or plugin invokes dimension validation from XML review record
    Given an operational workflow user opens an XML review record in Dataverse that is ready for validation
    When the user runs the "Validate dimensions" action (or equivalent command)
    Then the dimension validation function should be invoked with correlationId or blobUri from the record
    And the HTTP response should be captured for display

  @wip @PP-429 @PP-429-UI-002 @p1 @integration @dataverse @ui
  Scenario: UI - Validation results show invalid combinations in a grid or list
    Given dimension validation returned pass false with invalid combinations
    When the user views the validation results panel
    Then each invalid combination should appear with message or dimension detail
    And line or record references from the response should be visible to the user

  @wip @PP-429 @PP-429-UI-003 @p2 @integration @dataverse @ui
  Scenario: UI - User can re-run validation after correcting data
    Given validation previously failed for an XML review record
    When underlying data or dimensions are corrected per Ops process
    And the user runs "Validate dimensions" again
    Then the function should be invoked again
    And the UI should reflect the latest pass or fail outcome

  @wip @PP-429 @PP-429-UI-004 @p1 @integration @dataverse @business-rule
  Scenario: UI - Approval blocked while dimension validation has failed
    Given dimension validation result is fail for the current XML review record
    When the user attempts to approve or submit for approval
    Then the system should prevent approval (plugin or business rule)
    And a clear message should indicate that dimension validation must pass first

  @wip @PP-429 @PP-429-UI-005 @p2 @integration @servicebus @lloyds-flow
  Scenario: UI - After approval, dv-xml-approval-success emitted per Confluence design
    Given dimension validation pass is true and user completes approval in Op Workflow
    When the platform publishes approval success to Service Bus channel "dv-xml-approval"
    Then downstream consumers should receive "dv-xml-approval-success" with expected identifiers
