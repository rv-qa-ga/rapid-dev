# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-607 - Add validations to Member-Legal Entity-Group Relationships
# Type: Story | Priority: Medium
# User story: As an MRD – Member relationship records follow a standard ID format
#   (MMA-00000) and Active Members must have Legal Entity relationships.
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-607 @medium @member @legal-entity @validation @auto-population
Feature: SF-607 - Member-Legal Entity relationship validations and naming
  As an MRD
  I want Member relationship records to follow a standard ID format and enforce that Active Members have Legal Entity relationships
  So that records are consistent, and data quality is maintained across Salesforce and downstream systems

  Background:
    Given Accounts exist in Salesforce with Type values including Member and Legal Entity
    And relationships between Members and Legal Entities are represented by Member_Legal_Entity_Relationship__c

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 1: Auto-generate relationship Name with prefix MMA-00000
  # ══════════════════════════════════════════════════════════════════════════

  @SF-607 @SF-607-UI-001 @p1 @smoke @positive
  Scenario: Auto-generate relationship Name with prefix MMA-00000
    Given I am logged in as a "QA MRD User" user
    And a user creates a new Member_Legal_Entity_Relationship__c record
    When the record is saved for the first time
    Then the Name must be automatically populated
    And the Name must start with the prefix MMA-
    And the Name must follow the format MMA-00000
    And the numeric portion must auto-increment by 1 for each new record created
    And any user must not be able to manually edit the auto-generated Name value
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 2: Prevent saving an Active Member without any Legal Entity relationships
  # ══════════════════════════════════════════════════════════════════════════

  @SF-607 @SF-607-UI-002 @p1 @positive @negative @validation
  Scenario: Prevent saving an Active Member without any Legal Entity relationships
    Given I am logged in as a "QA MRD User" user
    And an Account exists with Type = Member
    And Account_Status__c = "Active"
    And the Member has zero related Member_Legal_Entity_Relationship__c records where the related Account Type is Legal Entity
    When a MRD user attempts to save the Member record
    Then the system must prevent the save
    And display the error message "Active Members must be related to at least one Legal Entity."
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 3: Allow saving an Active Member when at least one Legal Entity relationship exists
  # ══════════════════════════════════════════════════════════════════════════

  @SF-607 @SF-607-UI-003 @p1 @positive
  Scenario: Allow saving an Active Member when at least one Legal Entity relationship exists
    Given I am logged in as a "QA MRD User" user
    And an Account exists with Type = Member
    And Account_Status__c = "Active"
    And the Member has one or more related Member_Legal_Entity_Relationship__c records where the related Account Type is Legal Entity
    When a MRD user saves the Member record
    Then the save must succeed
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 4: Status change to Active is blocked if the Member has no Legal Entity relationship
  # ══════════════════════════════════════════════════════════════════════════

  @SF-607 @SF-607-UI-004 @p1 @positive @negative @validation
  Scenario: Status change to Active is blocked if the Member has no Legal Entity relationship
    Given I am logged in as a "QA MRD User" user
    And an Account exists with Type = Member
    And Account_Status__c is not "Active"
    And the Member has zero related Member_Legal_Entity_Relationship__c records where the related Account Type is Legal Entity
    When a MRD user attempts to update Account_Status__c to "Active"
    Then the status update must be prevented
    And display the error message "Members cannot be set to Active until they are related to at least one Legal Entity."
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 5: Status change to Active succeeds when the Member has a Legal Entity relationship
  # ══════════════════════════════════════════════════════════════════════════

  @SF-607 @SF-607-UI-005 @p1 @positive
  Scenario: Status change to Active succeeds when the Member has a Legal Entity relationship
    Given I am logged in as a "QA MRD User" user
    And an Account exists with Type = Member
    And Account_Status__c is not "Active"
    And the Member has one or more related Member_Legal_Entity_Relationship__c records where the related Account Type is Legal Entity
    When a MRD user updates Account_Status__c to "Active"
    Then the update must succeed
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 6: Guidance message shown for Contracted Members without Legal Entity relationship
  # ══════════════════════════════════════════════════════════════════════════

  @SF-607 @SF-607-UI-006 @p1 @positive
  Scenario: Guidance message shown for Contracted Members without Legal Entity relationship
    Given I am logged in as a "QA MRD User" user
    And an Account exists with Type = Member
    And Account_Status__c = "Contracted"
    And the Member has zero related Member_Legal_Entity_Relationship__c records where the related Account Type is Legal Entity
    When a MRD user views or edits the Member record
    Then the system must display an informational message stating "A Legal Entity must be added before this Member can be moved to Active."
    And the Member must not be prevented from remaining in Contracted status
    And the message must remain visible until at least one Legal Entity relationship is created
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-607 @SF-607-UI-007 @p2 @ui-data-creation
  Scenario: Create Member_Legal_Entity_Relationship__c record via UI
    Given I am logged in as a "QA MRD User" user
    And I have a Member Account and a Legal Entity Account
    When I create a new Member_Legal_Entity_Relationship__c record linking the Member to the Legal Entity
    And I save the record
    Then the record should be created successfully
    And the Name must start with the prefix MMA-
    And I take a screenshot as evidence
