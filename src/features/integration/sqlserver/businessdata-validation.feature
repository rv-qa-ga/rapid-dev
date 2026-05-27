@sqlserver @integration @businessdata
Feature: SQL Server Business Data validation
  As a QA engineer
  I want to run SQL Server–only checks (Reference data count, Business Data job)
  So that I can validate ODS/TDS and pipeline jobs without Salesforce or Dynamics

  Background:
    Given I have a valid SQL Server connection

  @reference @businessdata
  Scenario: Log BordereauRepository row count from Reference database
    When I run the following query in "Reference" database and log the result:
      """
      SELECT COUNT(*) AS cnt FROM [Reference].[master].[BordereauRepository]
      """

  @businessdata
  Scenario: Run Business Data job and verify completion
    # SQL Server Agent job "Business Data" (Owner: SVC_SSIS_JOBS_TST, Category: DE - Pipeline Process).
    # Job can run for a long time (e.g. Import SP Bordereau Accounting); wait uses 45 min timeout.
    When I run the SSIS job "Business Data"
    And I wait for the SSIS job "Business Data" to complete with timeout 45 minutes
    Then the SSIS job should have completed successfully

  @DynamicsUILogin @ui @integration
  Scenario: Smoke test for Dynamics UI login
    Given I am an authenticated Dynamics 365 user
    Then I should be on the Dynamics home page
    When I navigate to the Parties page
    Then I should see the text "Parties" in the page title
    And the current account name is "E2E Party Test2"
    When I filter for "E2E Party Test2" in the Name field
    Then I should see the Party record exists in the list
    When I click on the Party record in the list
    Then I should see the Party record details
 

  # E2E: Salesforce Account -> sync to Dynamics -> Source Staging step 2 -> Business Data job -> Reference Party.
  # Creates Member type with required fields; Region and Distribution Region auto-calculate from billing address.
  # Active Members must be related to at least one Legal Entity; we ensure the relationship exists before setting Status to Active.
  # Note: Reference Data Load (step 2) often loads only Active parties; if Party is Onboarding in Dataverse it may not appear in [Reference].master.[Party] until set to Active and job re-run.
  # Data is NOT deleted after the run (@persist-data) so it can be used for end-to-end validation in other systems.
  @e2e @integration @sqlserver @ui @persist-data
  Scenario: E2E Account to Reference Party via Business Data pipeline
    Given I am an authenticated Salesforce user
    And I have a valid SQL Server connection
    When I create a new Member account with name "E2E Party Test2" marked as 'Onboarding' via API
    And I ensure the Member is related to a Legal Entity
    And I navigate to the created Account record
    And I update the Account Status to "Active" to trigger integration via the UI
    And I capture the current Account Id from the page
    And I wait 30 seconds for MuleSoft processing
    When I open Dynamics RDM Parties page 
    And I filter by the current account name in the Name field
    And I verify the Party record exists in the list
    When I run step 2 of the SSIS job "Source Staging Loads"
    And I wait for the Step 2 of the SSIS job "Source Staging Loads" to complete with timeout 15 minutes
    And I confirm step 2 of the SSIS job "Source Staging Loads" has completed successfully

#Via dynamics API
  @e2e @integration @sqlserver @api-ui @ui @persist-data @demo-e2e-api
  Scenario: E2E Account to Reference Party via Business Data pipeline
    Given I am an authenticated Salesforce user
    And I have a valid SQL Server connection
    When I create a new Member account with name "E2E Party Test2" marked as 'Onboarding' via API
    And I ensure the Member is related to a Legal Entity
    And I navigate to the created Account record
    And I update the Account Status to "Active" to trigger integration via the UI
    And I capture the current Account Id from the page
    And I wait 30 seconds for MuleSoft processing
    When I check Dynamics Party record exists for the current account via API
    And I confirm the party details are correct in the Dynamics API
    When I run step 2 of the SSIS job "Source Staging Loads"
    And I wait for the Step 2 of the SSIS job "Source Staging Loads" to complete with timeout 15 minutes
    And I confirm step 2 of the SSIS job "Source Staging Loads" has completed successfully
    And I confirm the party should exist in the Reference Party table