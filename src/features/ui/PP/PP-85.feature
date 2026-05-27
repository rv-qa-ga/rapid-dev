# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-85 - Portal Written Records in OW Repository File | Tabs, Fields & Automated Processes
# Type: Story | Status: In QA | Priority: High
# Feature Type: portal-written, repository-file, tabs, mandatory-fields, automated-processes
# Updated: 2026-02-16 (From JIRA description - Operations User, Portal Written record type)
# Confluence: https://accelins.atlassian.net/wiki/x/T4DKrw
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: For record type "Portal Written" in the OW Repository File, tabs,
#           field mandatory/optional rules, and automated processes behave
#           consistently so Operations can process Portal Written submissions
#           without manual workarounds.
# Primary Entity: OW Repository File (record type = "Portal Written")
#
# Tabs – Visible: General, Submission Approval, Accounting, Internal Contacts,
#                 Related Work Items, Related.
# Tabs – Hidden: Processing Metrics, Timeline, Bordereau Sheets.
#
# General – Processing Details: Item Assigned to, Original Created Date,
#   First Receipt?, Right First Time? = mandatory. Work Item Status, First
#   Review Date, Clone for exposure = optional.
# General – Submission Details: MGA Name, Insurer, Insurer Organisation Name,
#   Production Period, Accounting Period = mandatory. Contract, Bordereau
#   Name, Accounting Platform = mandatory when status is "VIPR Complete".
# General – Financial Details: GWP Amount, Commission Amount, Original
#   Currency = mandatory all regions. GWP EUR, Brokerage EUR, Commission EUR,
#   Tax EUR = visible EU only. Tax Amount Payable, Brokerage Amount =
#   mandatory EU only.
# General – Original Submission Details: Sharepoint URL, File Name, Sender =
#   optional and read-only (locked).
# General – Comments and Notes: Comment, Processing Comments, Tax Notes =
#   optional.
#
# Submission Approval tab: Sign-off status editable only when Work Item
#   Status = "Awaiting Submission Approval". Signed-off by, Signed-off on =
#   locked. Rollback? = optional. When Rollback? = Yes, Rolled back By and
#   Fresh service link = mandatory.
#
# Automated actions: SharePoint sync skipped; Approval workflow, Rollback,
#   Bordereau Trackers update, Clone for Exposure, Accounting, Month end
#   close, Ownership assignment run successfully; Tagging/Bordereau Sheets
#   Process not available; Bordereau Sheets validation does not run when
#   status "VIPR Complete".
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @dynamics @PP-85 @high @dynamics @d365 @portal-written @repository-file @ow-repository
Feature: PP-85 - Portal Written Records in OW Repository File | Tabs, Fields & Automated Processes
  As an operations user working on Portal Written records in the OW Repository File
  I want the correct tabs, fields, and automated processes to behave consistently for this record type
  So that I can process Portal Written submissions accurately without relying on manual workarounds

  Background:
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"

  # ══════════════════════════════════════════════════════════════════════════
  # TABS – Visible for Portal Written
  # ══════════════════════════════════════════════════════════════════════════

  @PP-85 @PP-85-UI-001 @p1 @smoke @positive @tabs
  Scenario: Portal Written record displays required visible tabs
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    When I open the Repository File record
    Then the following tabs should be visible:
      | Tab Name            |
      | General             |
      | Submission Approval |
      | Accounting          |
      | Internal Contacts   |
      | Related Work Items  |
      | Related             |
    And I take a screenshot as evidence

  @PP-85 @PP-85-UI-002 @p1 @positive @tabs
  Scenario: Portal Written record hides Processing Metrics, Timeline, Bordereau Sheets
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    When I open the Repository File record
    Then the following tabs should be hidden:
      | Tab Name          |
      | Processing Metrics|
      | Timeline          |
      | Bordereau Sheets  |
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # General tab – Processing Details (mandatory / optional)
  # ══════════════════════════════════════════════════════════════════════════

  @PP-85 @PP-85-UI-003 @p1 @positive @general @processing-details
  Scenario: General tab Processing Details – mandatory fields enforced
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    When I open the Repository File record and navigate to the General tab
    Then "Item Assigned to", "Original Created Date", "First Receipt?", "Right First Time?" should be mandatory
    And I take a screenshot as evidence

  @PP-85 @PP-85-UI-004 @p2 @positive @general @processing-details
  Scenario: General tab Processing Details – optional fields are not required
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    When I open the Repository File record and navigate to the General tab
    Then "Work Item Status", "First Review Date", "Clone for exposure" should be optional
    And I can save the record without filling these fields
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # General tab – Submission Details (mandatory, conditional when VIPR Complete)
  # ══════════════════════════════════════════════════════════════════════════

  @PP-85 @PP-85-UI-005 @p1 @positive @general @submission-details
  Scenario: General tab Submission Details – MGA Name, Insurer, etc. are mandatory
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    When I open the Repository File record and navigate to the General tab
    Then "MGA Name", "Insurer", "Insurer Organisation Name", "Production Period", "Accounting Period" should be mandatory
    And I take a screenshot as evidence

  @PP-85 @PP-85-UI-006 @p1 @positive @general @submission-details @vipr-complete
  Scenario: General tab Submission Details – Contract, Bordereau Name, Accounting Platform mandatory when status VIPR Complete
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    And the record Work Item Status is "VIPR Complete"
    When I open the Repository File record and navigate to the General tab
    Then "Contract", "Bordereau Name", "Accounting Platform" should be mandatory
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # General tab – Financial Details (all regions vs EU only)
  # ══════════════════════════════════════════════════════════════════════════

  @PP-85 @PP-85-UI-007 @p1 @positive @general @financial-details
  Scenario: General tab Financial Details – GWP Amount, Commission Amount, Original Currency mandatory for all regions
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    When I open the Repository File record and navigate to the General tab
    Then "GWP Amount", "Commission Amount", "Original Currency" should be mandatory
    And I take a screenshot as evidence

  @PP-85 @PP-85-UI-008 @p2 @positive @general @financial-details @eu-only
  Scenario: General tab Financial Details – GWP EUR, Brokerage EUR, Commission EUR, Tax EUR visible for EU only
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written" and region EU
    When I open the Repository File record and navigate to the General tab
    Then "GWP EUR", "Brokerage EUR", "Commission EUR", "Tax EUR" should be visible
    And I take a screenshot as evidence

  @PP-85 @PP-85-UI-009 @p2 @positive @general @financial-details @eu-only
  Scenario: General tab Financial Details – Tax Amount Payable and Brokerage Amount mandatory for EU only
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written" and region EU
    When I open the Repository File record and navigate to the General tab
    Then "Tax Amount Payable" and "Brokerage Amount" should be mandatory
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # General tab – Original Submission Details (read-only)
  # ══════════════════════════════════════════════════════════════════════════

  @PP-85 @PP-85-UI-010 @p1 @positive @general @original-submission
  Scenario: General tab Original Submission Details – Sharepoint URL, File Name, Sender are optional and read-only
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    When I open the Repository File record and navigate to the General tab
    Then "Sharepoint URL", "File Name", "Sender" should be visible in Original Submission Details
    And these fields should be read-only (locked)
    And these fields should be optional
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # General tab – Comments and Notes
  # ══════════════════════════════════════════════════════════════════════════

  @PP-85 @PP-85-UI-011 @p2 @positive @general @comments-notes
  Scenario: General tab Comments and Notes – Comment, Processing Comments, Tax Notes are optional
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    When I open the Repository File record and navigate to the General tab
    Then "Comment", "Processing Comments", "Tax Notes" should be optional
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Submission Approval tab
  # ══════════════════════════════════════════════════════════════════════════

  @PP-85 @PP-85-UI-012 @p1 @positive @submission-approval
  Scenario: Submission Approval tab – Sign-off status editable only when Work Item Status is Awaiting Submission Approval
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    And the record Work Item Status is "Awaiting Submission Approval"
    When I open the Repository File record and navigate to the Submission Approval tab
    Then "Sign-off status" should be editable
    And I take a screenshot as evidence

  @PP-85 @PP-85-UI-013 @p1 @positive @submission-approval
  Scenario: Submission Approval tab – Sign-off status not editable when Work Item Status is not Awaiting Submission Approval
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    And the record Work Item Status is not "Awaiting Submission Approval"
    When I open the Repository File record and navigate to the Submission Approval tab
    Then "Sign-off status" should not be editable (read-only or disabled)
    And I take a screenshot as evidence

  @PP-85 @PP-85-UI-014 @p1 @positive @submission-approval
  Scenario: Submission Approval tab – Signed-off by and Signed-off on are locked (system-controlled)
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    When I open the Repository File record and navigate to the Submission Approval tab
    Then "Signed-off by" and "Signed-off on" should be locked (system-controlled, not editable)
    And I take a screenshot as evidence

  @PP-85 @PP-85-UI-015 @p1 @positive @submission-approval
  Scenario: Submission Approval tab – Rollback? is optional
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    When I open the Repository File record and navigate to the Submission Approval tab
    Then "Rollback?" should be optional
    And I take a screenshot as evidence

  @PP-85 @PP-85-UI-016 @p1 @positive @submission-approval @rollback
  Scenario: Submission Approval tab – Rolled back By and Fresh service link mandatory when Rollback? = Yes
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    And "Rollback?" is set to "Yes"
    When I open the Repository File record and navigate to the Submission Approval tab
    Then "Rolled back By" and "Fresh service link" should be mandatory
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Automated actions
  # ══════════════════════════════════════════════════════════════════════════

  @PP-85 @PP-85-UI-017 @p1 @positive @automated @sharepoint
  Scenario: SharePoint synchronisation is skipped for Portal Written records
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    When the SharePoint synchronisation process runs
    Then SharePoint synchronisation should be skipped for this Portal Written record
    And I take a screenshot as evidence

  @PP-85 @PP-85-UI-018 @p1 @positive @automated @approval-workflow
  Scenario: Approval workflow executes successfully for Portal Written records
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    When the Approval workflow runs for the record
    Then the Approval workflow should execute successfully
    And I take a screenshot as evidence

  @PP-85 @PP-85-UI-019 @p1 @positive @automated @rollback
  Scenario: Rollback process executes successfully and updates required fields
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    When the Rollback process runs for the record
    Then the Rollback process should execute successfully
    And the required fields should be updated
    And I take a screenshot as evidence

  @PP-85 @PP-85-UI-020 @p1 @positive @automated @bordereau-validation
  Scenario: Bordereau Sheets validation does not run when record status is VIPR Complete
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    And the record status is "VIPR Complete"
    When the Bordereau Sheets validation would run
    Then Bordereau Sheets validation should not run for this record
    And I take a screenshot as evidence

  @PP-85 @PP-85-UI-021 @p2 @positive @automated @bordereau-trackers
  Scenario: Expected Bordereau Trackers are updated when Portal Submission exists for period + Bordereau Name
    Given I am logged in to Dynamics 365
    And a Portal Submission exists for a period and Bordereau Name combination
    When the tracker update process runs
    Then the Expected Bordereau Trackers should be updated accordingly
    And I take a screenshot as evidence

  @PP-85 @PP-85-UI-022 @p1 @positive @automated @not-available
  Scenario: Tagging Process and Bordereau Sheets Process are not available for Portal Written records
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    When I view the available processes or actions for the record
    Then "Tagging Process" should not be available
    And "Bordereau Sheets Process" should not be available
    And I take a screenshot as evidence

  @PP-85 @PP-85-UI-023 @p1 @positive @automated @clone-for-exposure
  Scenario: Clone for Exposure process is available and completes successfully
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    When I run the "Clone for Exposure" process for the record
    Then the Clone for Exposure process should be available
    And the process should complete successfully
    And I take a screenshot as evidence

  @PP-85 @PP-85-UI-024 @p1 @positive @automated @accounting
  Scenario: Accounting process is available and completes successfully
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    When I run the Accounting process for the record
    Then the Accounting process should be available
    And the process should complete successfully
    And I take a screenshot as evidence

  @PP-85 @PP-85-UI-025 @p1 @positive @automated @month-end-close
  Scenario: Month end close process runs successfully for Portal Written records
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    When the Month end close process runs for the record
    Then the Month end close process should run successfully
    And I take a screenshot as evidence

  @PP-85 @PP-85-UI-026 @p1 @positive @automated @ownership
  Scenario: Ownership assignment runs successfully for Portal Written records
    Given I am logged in to Dynamics 365
    And I have a Repository File record with type "Portal Written"
    When the Ownership assignment process runs for the record
    Then the Ownership assignment should run successfully
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # COVERAGE ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Tabs (UI-001, UI-002), General Processing/Submission/Financial/Original/Comments (UI-003–011),
  # Submission Approval (UI-012–016), Automated actions (UI-017–026)
  # ══════════════════════════════════════════════════════════════════════════
  # STEP DEFINITION NOTES: Navigate to OW Repository File, filter by type
  # "Portal Written", assert tab visibility, field mandatory/read-only, process
  # availability and success.
  #
