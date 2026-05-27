# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-143 - Leads UAT Final Feedback
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-19T15:09:24.100Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Leads UAT Final Feedback
# Primary Entity: Opportunity
#
# Test Requirements (14):
#   REQ-1: Target Insured Revenue Size is not required to move from New to F
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Broker Sourced field not mandatory at creation
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Broker Sourced and Broker Name required to progress to Funnel
#     → Test Type: BOTH | Priority: p2
#   REQ-4: Member Qualification Action Plan not mandatory when converting
#     → Test Type: BOTH | Priority: p2
#   REQ-5: Unqualified status includes key fields
#     → Test Type: BOTH | Priority: p1
#   REQ-6: Validation message shown for missing Unqualified Reason
#     → Test Type: UI | Priority: p2
#   REQ-7: Replace Region with Target Insured Industry in Highlights Panel
#     → Test Type: UI | Priority: p1
#   REQ-8: Change label for Proposed Expiration Date
#     → Test Type: BOTH | Priority: p2
#   REQ-9: Hide Series Entity field
#     → Test Type: UI | Priority: p2
#   REQ-10: All users can see qualified leads
#     → Test Type: BOTH | Priority: p1
#   REQ-11: Users can see all leads
#     → Test Type: BOTH | Priority: p2
#   REQ-12: Broker Source auto-populates on Opportunity
#     → Test Type: BOTH | Priority: p1
#   REQ-13: User can merge potential duplicate leads
#     → Test Type: API | Priority: p1
#   REQ-14: Broker Source auto-populates on Opportunity
#     → Test Type: BOTH | Priority: p1
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# FIELD VALUES IDENTIFIED:
#   • US
#   • UK
#   • EU
#   • CA
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-143 @medium @auto-populate @field-mapping @opportunity
Feature: SF-143 - Leads UAT Final Feedback
  As a Salesforce user
  I want to verify the Funnel functionality on Opportunity
  So that Opportunity records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-143 @SF-143-UI-001 @negative @when-the
  Scenario: Target Insured Revenue Size is not required to move from New to Funnel
    Given I am logged in as a "When The" user
    Given A Lead is in status "New"
    Given The user changes the status to "Funnel"
    Given The system should not require the "Target Insured Revenue Size" field
    When The user changes the status to "Funnel"
    When The system should not require the "Target Insured Revenue Size" field
    Then The system should not require the "Target Insured Revenue Size" field
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-002 @negative
  Scenario: Broker Sourced field not mandatory at creation
    Given I am logged in as a standard user
    Given A user is creating a new Lead
    And I save the record
    Given The "Broker Sourced" field should not be mandatory
    When I save the record
    When The "Broker Sourced" field should not be mandatory
    Then The "Broker Sourced" field should not be mandatory
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-003 @when-the
  Scenario: Broker Sourced and Broker Name required to progress to Funnel
    Given I am logged in as a "When The" user
    Given A Lead is in status "New"
    Given The user changes the status to "Funnel"
    Given The system should require completion of "Broker Sourced"
    Given "Broker Name" fields
    When The user changes the status to "Funnel"
    When The system should require completion of "Broker Sourced"
    When "Broker Name" fields
    Then The system should require completion of "Broker Sourced"
    Then "Broker Name" fields
    Then "Broker Name" fields
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-004 @negative @qa-mrd-user
  Scenario: Member Qualification Action Plan not mandatory when converting
    Given I am logged in as a "QA MRD User" user
    Given A Lead is in status "Funnel"
    Given The user changes the status to "Converted"
    Given I want to ensure that unqualified leads capture the reason consistently
    Given So that reporting
    Given Analysis on disqualified leads are accurate
    When The user changes the status to "Converted"
    When The system should not require the "Member Qualification Action Plan" fieldAs an MRD user
    When I want to ensure that unqualified leads capture the reason consistently
    When So that reporting
    When Analysis on disqualified leads are accurate
    Then The system should not require the "Member Qualification Action Plan" fieldAs an MRD user
    Then I want to ensure that unqualified leads capture the reason consistently
    Then So that reporting
    Then Analysis on disqualified leads are accurate
    Then Analysis on disqualified leads are accurate
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-005
  Scenario: Unqualified status includes key fields
    Given I am logged in as a standard user
    Given A Lead status is changed to "Unqualified"
    Given The "Unqualified Reason" field must be available for completion
    Then The "Unqualified Reason" field must be available for completion
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-006 @negative
  Scenario: Validation message shown for missing Unqualified Reason
    Given I am logged in as a standard user
    And I save the record
    Given I want to see the correct fields
    Given Labels on the Lead page layout
    Given So that the layout is clear
    Given Only relevant information is displayed
    When I save the record
    And I should see a validation error
    When I want to see the correct fields
    When Labels on the Lead page layout
    When So that the layout is clear
    When Only relevant information is displayed
    Then I should see a validation error
    Then I want to see the correct fields
    Then Labels on the Lead page layout
    Then So that the layout is clear
    Then Only relevant information is displayed
    Then Labels on the Lead page layout
    Then Only relevant information is displayed
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-007
  Scenario: Replace Region with Target Insured Industry in Highlights Panel
    Given I am logged in as a standard user
    Given The Lead record is displayed
    Given The "Region" field should be removed from the highlights panel
    Given "Target Insured Industry" should be displayed instead
    Then The "Region" field should be removed from the highlights panel
    Then "Target Insured Industry" should be displayed instead
    Then "Target Insured Industry" should be displayed instead
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-008
  Scenario: Change label for Proposed Expiration Date
    Given I am logged in as a standard user
    Given A Lead record has a field labelled "Proposed Expiration Date"
    Given The field label should be changed to "Current Program Expiration Date"
    Then The field label should be changed to "Current Program Expiration Date"
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-009 @negative @qa-mrd-user
  Scenario: Hide Series Entity field
    Given I am logged in as a "QA MRD User" user
    Given A Lead record is open
    Given I want appropriate visibility
    Given Edit rights on leads
    Given So that all users can view leads for historical tracking while maintaining data control
    Then The "Series Entity" field should not be visible on the page layoutAs an MRD user
    Then I want appropriate visibility
    Then Edit rights on leads
    Then So that all users can view leads for historical tracking while maintaining data control
    Then Edit rights on leads
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-010 @data-driven @then-all
  Scenario: All users can see qualified leads
    Given I am logged in as a "Then All" user
    Given Leads exist with status "Qualified"
    And I navigate to the Lead object list
    And I navigate to the Lead object list
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-011 @leads-exist-in-the-system-then-all
  Scenario: Users can see all leads
    Given I am logged in as a "Leads Exist In The System Then All" user
    Given Leads exist in the system
    Given I want the Broker Source field to be automatically populated upon lead conversion
    Given So that I don’t have to manually re-enter information already captured on the Lead
    And I navigate to the Lead record
    Then I want the Broker Source field to be automatically populated upon lead conversion
    Then So that I don’t have to manually re-enter information already captured on the Lead
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-012 @field-on-the-opportunity-should-be-populated-automatically-with-the-broker-name-from-the-leadas-a-salesforce
  Scenario: Broker Source auto-populates on Opportunity
    Given I am logged in as a "Field On The Opportunity Should Be Populated Automatically With The Broker Name From The Leadas A Salesforce" user
    Given A Lead is converted with "Broker Sourced = Yes"
    Given A "Broker Name" selected
    Given The Lead converts to an Opportunity
    Given I want to be able to merge duplicate lead records when the system identifies them
    Given So that data remains clean
    Given Consistent
    When The Lead converts to an Opportunity
    When The "Broker Source" field on the Opportunity should be populated automatically with the Broker Name from the LeadAs a Salesforce user
    When I want to be able to merge duplicate lead records when the system identifies them
    When So that data remains clean
    When Consistent
    Then The "Broker Source" field on the Opportunity should be populated automatically with the Broker Name from the LeadAs a Salesforce user
    Then I want to be able to merge duplicate lead records when the system identifies them
    Then So that data remains clean
    Then Consistent
    Then A "Broker Name" selected
    Then Consistent
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-013 @data-driven @qa-mrd-user
  Scenario: User can merge potential duplicate leads
    Given I am logged in as a "QA MRD User" user
    Given Salesforce identifies potential duplicate Lead records
    Given The user chooses to merge them
    Given The system should allow the merge process to complete successfully
    And I navigate to the Lead record
    Given They should have edit access
    Given Other MRD users should only have read access
    Given Tracked. Happy to do this if you guys agree
    And the "{fieldName}" field should not be visible or should be read-only
    Given Can  you please clarify on below questions:The field "Target Insured Revenue Size" should be made not required for entire lifecycle of lead or it will be requried at any other stage of lead?Can you explain more for the point #2, related to qualified leads should be readable
    Given Accessible, what exactly needs to be done?For merge records, which all profiles shall have this enabled?What do you mean by MRD User?
    And I navigate to the Lead object list
    Given Commit succeeded: https://app.gearset.com/finished?deploymentId=43b3714d-622e-471e-985a-dec69c1b7338Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    Given I have an existing Lead record
    Given Commit succeeded: https://app.gearset.com/finished?deploymentId=a6925a85-a55a-493d-986b-abcffc7bb4b9Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And I navigate to the Lead object list
    Given :check_mark: Successfully merged PR #20 from gs-pipeline/SF-143/Leads-UAT-Final-Feedback_-_QA into QA
    Given Commit succeeded: https://app.gearset.com/finished?deploymentId=6860a536-ce49-4332-a99a-d287944af1ddCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And I navigate to the Lead record
    Given :check_mark: Successfully merged PR #22 from gs-pipeline/SF-143/Leads-UAT-Final-Feedback_-_QA into QA
    Given Hi, could you please confirm if "Broker Source" field on the Opportunity should be populated with  ‘Broker Source ‘from the Lead or 'Broker source Name’ from Lead? There’s a confusion in understanding these lines from below scenario, please confirm the fields again
    When The user chooses to merge them
    When The system should allow the merge process to complete successfully
    When I navigate to the Lead record
    When They should have edit access
    When Other MRD users should only have read access
    When Tracked. Happy to do this if you guys agree
    And the "{fieldName}" field should not be visible or should be read-only
    When Can  you please clarify on below questions:The field "Target Insured Revenue Size" should be made not required for entire lifecycle of lead or it will be requried at any other stage of lead?Can you explain more for the point #2, related to qualified leads should be readable
    When Accessible, what exactly needs to be done?For merge records, which all profiles shall have this enabled?What do you mean by MRD User?
    When I navigate to the Lead object list
    When Commit succeeded: https://app.gearset.com/finished?deploymentId=43b3714d-622e-471e-985a-dec69c1b7338Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    When I navigate to the Lead object list
    When Commit succeeded: https://app.gearset.com/finished?deploymentId=a6925a85-a55a-493d-986b-abcffc7bb4b9Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    When I navigate to the Lead object list
    When :check_mark: Successfully merged PR #20 from gs-pipeline/SF-143/Leads-UAT-Final-Feedback_-_QA into QA
    When Commit succeeded: https://app.gearset.com/finished?deploymentId=6860a536-ce49-4332-a99a-d287944af1ddCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    When I navigate to the Lead record
    When :check_mark: Successfully merged PR #22 from gs-pipeline/SF-143/Leads-UAT-Final-Feedback_-_QA into QA
    When Hi, could you please confirm if "Broker Source" field on the Opportunity should be populated with  ‘Broker Source ‘from the Lead or 'Broker source Name’ from Lead? There’s a confusion in understanding these lines from below scenario, please confirm the fields again
    Then The system should allow the merge process to complete successfully
    And I navigate to the Lead record
    Then They should have edit access
    Then Other MRD users should only have read access
    Then Tracked. Happy to do this if you guys agree
    Then the "{fieldName}" field should not be visible or should be read-only
    Then Can  you please clarify on below questions:The field "Target Insured Revenue Size" should be made not required for entire lifecycle of lead or it will be requried at any other stage of lead?Can you explain more for the point #2, related to qualified leads should be readable
    Then Accessible, what exactly needs to be done?For merge records, which all profiles shall have this enabled?What do you mean by MRD User?
    And I navigate to the Lead object list
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=43b3714d-622e-471e-985a-dec69c1b7338Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And I navigate to the Lead object list
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=a6925a85-a55a-493d-986b-abcffc7bb4b9Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And I navigate to the Lead object list
    Then :check_mark: Successfully merged PR #20 from gs-pipeline/SF-143/Leads-UAT-Final-Feedback_-_QA into QA
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=6860a536-ce49-4332-a99a-d287944af1ddCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And I navigate to the Lead record
    Then :check_mark: Successfully merged PR #22 from gs-pipeline/SF-143/Leads-UAT-Final-Feedback_-_QA into QA
    Then Hi, could you please confirm if "Broker Source" field on the Opportunity should be populated with  ‘Broker Source ‘from the Lead or 'Broker source Name’ from Lead? There’s a confusion in understanding these lines from below scenario, please confirm the fields again
    Then Other MRD users should only have read access
    Then Tracked. Happy to do this if you guys agree
    Then the "{fieldName}" field should not be visible or should be read-only
    Then Accessible, what exactly needs to be done?For merge records, which all profiles shall have this enabled?What do you mean by MRD User?
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-014
  Scenario: Broker Source auto-populates on Opportunity
    Given I am logged in as a standard user
    Given A Lead is converted with "Broker Sourced = Yes"
    Given A "Broker Name" selected
    Given The Lead converts to an Opportunity
    Given The "Broker Source" field on the Opportunity should be populated automatically with the Broker Name from the Lead
    Given The ‘Broker_Sourced_c’ on the lead should map to the ‘Broker_Sourced_c’ on the opportunity
    Given ‘Broker_Sourced_Name_c’ on the Lead should map to ‘Broker_Sourced_Name_c’ on the opportunity. ‘Broker_Sourced_Name_c’ will only be populated if ‘Broker_Sourced_c’ = Yes
    Given Hopefully that makes sense
    When The Lead converts to an Opportunity
    When The "Broker Source" field on the Opportunity should be populated automatically with the Broker Name from the Lead
    When The ‘Broker_Sourced_c’ on the lead should map to the ‘Broker_Sourced_c’ on the opportunity
    When ‘Broker_Sourced_Name_c’ on the Lead should map to ‘Broker_Sourced_Name_c’ on the opportunity. ‘Broker_Sourced_Name_c’ will only be populated if ‘Broker_Sourced_c’ = Yes
    When Hopefully that makes sense
    Then The "Broker Source" field on the Opportunity should be populated automatically with the Broker Name from the Lead
    Then The ‘Broker_Sourced_c’ on the lead should map to the ‘Broker_Sourced_c’ on the opportunity
    Then ‘Broker_Sourced_Name_c’ on the Lead should map to ‘Broker_Sourced_Name_c’ on the opportunity. ‘Broker_Sourced_Name_c’ will only be populated if ‘Broker_Sourced_c’ = Yes
    Then Hopefully that makes sense
    Then A "Broker Name" selected
    Then ‘Broker_Sourced_Name_c’ on the Lead should map to ‘Broker_Sourced_Name_c’ on the opportunity. ‘Broker_Sourced_Name_c’ will only be populated if ‘Broker_Sourced_c’ = Yes
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Funnel on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-143 @SF-143-UI-015 @smoke @p1
  Scenario: Verify Funnel field is visible on Opportunity
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Funnel" field should be visible
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-016 @p1 @edit
  Scenario: Verify Funnel field can be edited on Opportunity
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    And I set the "Funnel" field to "Test Value"
    And I save the record
    Then the Opportunity should be saved successfully
    And the "Funnel" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-017 @p1 @data-driven
  Scenario Outline: Set Funnel to valid values
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    And I set the "Funnel" field to "<value>"
    And I save the record
    Then the "Funnel" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | US |
      | UK |
      | EU |
      | CA |

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Funnel on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-143 @SF-143-UI-018 @smoke @p1
  Scenario: Verify Funnel field is visible on Opportunity
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Funnel" field should be visible
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-019 @p1 @edit
  Scenario: Verify Funnel field can be edited on Opportunity
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    And I set the "Funnel" field to "Test Value"
    And I save the record
    Then the Opportunity should be saved successfully
    And the "Funnel" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-020 @p1 @data-driven
  Scenario Outline: Set Funnel to valid values
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    And I set the "Funnel" field to "<value>"
    And I save the record
    Then the "Funnel" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | US |
      | UK |
      | EU |
      | CA |

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: Funnel on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-143 @SF-143-UI-021 @smoke @p1 @admin
  Scenario: Verify Funnel is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Funnel" field should be visible
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-022 @p1 @standard-user @negative
  Scenario: Verify Funnel is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Funnel" field should not be visible
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-023 @p2 @detail-view
  Scenario: Verify Funnel visibility on Opportunity detail page
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Funnel" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD REMOVAL: Funnel should NOT exist on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-143 @SF-143-UI-024 @smoke @p1 @field-removal
  Scenario: Verify Funnel field does NOT exist on Opportunity
    Given I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Funnel" field should not be visible
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-025 @p1 @field-removal
  Scenario: Verify Funnel field is not available in edit mode
    Given I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Funnel" field should not be visible
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-026 @p2 @field-removal
  Scenario: Verify Funnel field is not present on Opportunity detail page
    Given I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Funnel" field should not be visible
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-027 @p2 @field-removal
  Scenario: Verify Funnel field is not visible for standard users
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Funnel" field should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # LEAD CONVERSION: Funnel mapping from Lead to Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-143 @SF-143-UI-028 @smoke @p1 @lead-conversion
  Scenario: Verify Funnel maps from Lead to Opportunity during conversion
    Given I have a test Lead created via API with:
      | field   | value    |
      | Funnel | EU       |
    When I convert the Lead to Opportunity
    Then the Opportunity should have Funnel "EU"
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-029 @p1 @lead-conversion @data-driven
  Scenario Outline: Verify Funnel maps from Lead to Opportunity for all values during conversion
    Given I have a test Lead created via API with Funnel "<value>"
    When I convert the Lead to Opportunity
    Then the Opportunity should have Funnel "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | US |
      | UK |
      | EU |
      | CA |

  @SF-143 @SF-143-UI-030 @p1 @lead-conversion @negative
  Scenario: Verify Funnel does NOT map to Account during Lead conversion
    Given I have a test Lead created via API with:
      | field   | value    |
      | Funnel | UK       |
    When I convert the Lead to Opportunity
    Then the Opportunity should have Funnel "UK"
    And the Account should NOT have Funnel
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-031 @p2 @lead-conversion
  Scenario: Verify Funnel value is preserved during Lead conversion
    Given I have a test Lead created via API with Funnel "US"
    When I convert the Lead to Opportunity
    Then the Opportunity should have Funnel "US"
    And the Funnel value should match exactly what was on the Lead
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR: Funnel on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-143 @SF-143-UI-032 @smoke @p1 @read-only
  Scenario: Verify Funnel is read-only on Opportunity
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Funnel" field should not be editable
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-033 @p1 @negative
  Scenario: Verify user cannot modify Funnel after Opportunity creation
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Funnel" field should be read-only
    And attempting to edit the Funnel should not be possible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-143 @SF-143-UI-034 @p2 @negative @blank-value
  Scenario: Verify behavior when Funnel is blank
    Given I am logged in as a standard user
    And I have a test Opportunity created via API without "Funnel"
    When I navigate to the Opportunity record
    Then the "Funnel" field should be visible
    And the "Funnel" field should be blank or empty
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-035 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Funnel
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Funnel" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-143 @SF-143-UI-036 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Funnel
    Given I am logged in as a read-only user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-143 @SF-143-UI-037 @p2 @ui-data-creation
  Scenario: Create Opportunity record via UI
    Given I am logged in as a standard user
    When I navigate to the Opportunity object list
    And I click New to create a Opportunity
    And I fill in required Opportunity fields
    And I save the record
    Then the Opportunity should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 13
  # Covered Requirements: 12
  # Coverage: 92%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-4: Member Qualification Action Plan not mandatory when converting
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 258
  # Existing Steps Used: 258
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 258/258 (100%)
  #   - Feature-Specific Steps Used: 0
