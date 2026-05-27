@onDemand @mrd-process @data-creation @api
Feature: MRD Process Flow - On-Demand Test Data Creation
  # ═══════════════════════════════════════════════════════════════════════════
  # MRD (Member Relationship Director) Process Flow Test Data Factory
  # ═══════════════════════════════════════════════════════════════════════════
  #
  # Purpose: Create persistent test data at ANY stage of the MRD process flow
  # for QA testing. Each scenario creates records at a specific point in
  # the lifecycle, using real-world data from data/excel/contacts.xlsx.
  #
  # Account Types covered: Member, Non-Member MGA
  # Regions covered: US, UK, EU, CA, ROW
  #
  # Process Flow:
  #   Lead(New) -> Lead(Funnel) -> Decision(Qualified/Disqualified)
  #     -> If Qualified: Convert Lead -> Contact(Active) + Account(Prospect) + Opportunity(Pipeline)
  #     -> Opportunity(Pipeline) + Account(Prospect) [parallel]
  #     -> Opportunity Summary Fields Populated -> Approval (US: MOU fields, Non-US: no MOU)
  #     -> Opportunity(Due Diligence) + Account(Onboarding) [parallel]
  #     -> Onboarding Team Assigned -> Prospect Coding -> Questionnaire Sent
  #
  # Usage:
  #   npx cucumber-js --tags "@mrd-lead-new" src/features/api/SF/SF-MRD-process-data.feature
  #   npx cucumber-js --tags "@mrd-pipeline-us" src/features/api/SF/SF-MRD-process-data.feature
  #   npx cucumber-js --tags "@mrd-full-flow" src/features/api/SF/SF-MRD-process-data.feature
  #   npx cucumber-js --tags "@mrd-all-combos" src/features/api/SF/SF-MRD-process-data.feature
  # ═══════════════════════════════════════════════════════════════════════════

  Background:
    Given I am logged in as a "MRD" user

  # ═══════════════════════════════════════════════════════════════════════════
  # STAGE 1: LEAD CREATION AT VARIOUS STATUSES
  # Covers: Member + Non-Member MGA types across all 5 regions
  # ═══════════════════════════════════════════════════════════════════════════

  @mrd-lead-new
  Scenario Outline: Create Lead at New status - <AccountType> in <Region>
    When I create a persistent MRD Lead at status "New" for region "<Region>" with type "<AccountType>" using Excel data
    Then the Lead should be created successfully with status "New"
    And I log the MRD process record summary

    Examples: Member across all regions
      | Region | AccountType |
      | US     | Member      |
      | UK     | Member      |
      | EU     | Member      |
      | CA     | Member      |
      | ROW    | Member      |

    Examples: Non-Member MGA across all regions
      | Region | AccountType    |
      | US     | Non-Member MGA |
      | UK     | Non-Member MGA |
      | EU     | Non-Member MGA |
      | CA     | Non-Member MGA |
      | ROW    | Non-Member MGA |

  @mrd-lead-funnel
  Scenario Outline: Create Lead at Funnel status - <AccountType> in <Region>
    When I create a persistent MRD Lead at status "New" for region "<Region>" with type "<AccountType>" using Excel data
    And I transition the Lead to "Funnel" status
    Then the Lead should be created successfully with status "Funnel"
    And I log the MRD process record summary

    Examples: Member + Non-Member MGA across key regions
      | Region | AccountType    |
      | US     | Member         |
      | UK     | Member         |
      | EU     | Member         |
      | CA     | Member         |
      | ROW    | Member         |
      | US     | Non-Member MGA |
      | UK     | Non-Member MGA |
      | EU     | Non-Member MGA |
      | CA     | Non-Member MGA |
      | ROW    | Non-Member MGA |

  @mrd-lead-qualified
  Scenario Outline: Create Lead at Qualified status - <AccountType> in <Region>
    When I create a persistent MRD Lead at status "New" for region "<Region>" with type "<AccountType>" using Excel data
    And I transition the Lead to "Funnel" status
    And I transition the Lead to "Qualified" status
    Then the Lead should be created successfully with status "Qualified"
    And I log the MRD process record summary

    Examples:
      | Region | AccountType    |
      | US     | Member         |
      | UK     | Member         |
      | EU     | Member         |
      | CA     | Member         |
      | ROW    | Member         |
      | US     | Non-Member MGA |
      | UK     | Non-Member MGA |
      | EU     | Non-Member MGA |
      | CA     | Non-Member MGA |
      | ROW    | Non-Member MGA |

  @mrd-lead-unqualified
  Scenario Outline: Create Lead at Unqualified status (disqualified) - <AccountType> in <Region>
    When I create a persistent MRD Lead at status "New" for region "<Region>" with type "<AccountType>" using Excel data
    And I transition the Lead to "Funnel" status
    And I transition the Lead to "Unqualified" status
    Then the Lead should be created successfully with status "Unqualified"
    And I log the MRD process record summary

    Examples:
      | Region | AccountType    |
      | US     | Member         |
      | EU     | Non-Member MGA |

  # ═══════════════════════════════════════════════════════════════════════════
  # STAGE 2: LEAD CONVERSION (Creates Contact + Account + Opportunity)
  # Covers: Member + Non-Member MGA across US and Non-US
  # ═══════════════════════════════════════════════════════════════════════════

  @mrd-post-conversion
  Scenario Outline: Create records via Lead Conversion - <AccountType> in <Region>
    When I create a persistent MRD Lead at status "New" for region "<Region>" with type "<AccountType>" using Excel data
    And I transition the Lead to "Funnel" status
    And I transition the Lead to "Qualified" status
    And I convert the MRD Lead to create Account, Contact, and Opportunity with type "<AccountType>"
    Then the converted Account should have status "Prospect"
    And the converted Account should have type "<AccountType>"
    And the converted Contact should be "Active"
    And the converted Opportunity should have stage "Pipeline"
    And I log the MRD process record summary

    Examples: All region x type combos
      | Region | AccountType    |
      | US     | Member         |
      | UK     | Member         |
      | EU     | Member         |
      | CA     | Member         |
      | ROW    | Member         |
      | US     | Non-Member MGA |
      | UK     | Non-Member MGA |
      | EU     | Non-Member MGA |
      | CA     | Non-Member MGA |
      | ROW    | Non-Member MGA |

  # ═══════════════════════════════════════════════════════════════════════════
  # STAGE 3: PIPELINE STAGE (Opportunity) + PROSPECT STATUS (Account)
  # ═══════════════════════════════════════════════════════════════════════════

  @mrd-pipeline
  Scenario Outline: Create records at Pipeline stage - <AccountType> in <Region>
    When I create MRD test data at "Pipeline" stage for region "<Region>" with type "<AccountType>" using Excel data
    Then the Opportunity should have stage "Pipeline"
    And the Account should have status "Prospect"
    And the Account should have type "<AccountType>"
    And I log the MRD process record summary

    Examples:
      | Region | AccountType    |
      | US     | Member         |
      | UK     | Member         |
      | EU     | Member         |
      | CA     | Member         |
      | ROW    | Member         |
      | US     | Non-Member MGA |
      | UK     | Non-Member MGA |
      | EU     | Non-Member MGA |
      | CA     | Non-Member MGA |
      | ROW    | Non-Member MGA |

  # ═══════════════════════════════════════════════════════════════════════════
  # STAGE 4: PIPELINE + SUMMARY FIELDS POPULATED (Pre-Approval)
  # US = MOU required, Non-US = no MOU
  # ═══════════════════════════════════════════════════════════════════════════

  @mrd-pipeline-summary
  Scenario Outline: Pipeline with Summary Fields - <AccountType> in <Region>
    When I create MRD test data at "Pipeline" stage for region "<Region>" with type "<AccountType>" using Excel data
    And I populate the Opportunity summary fields for "<Region>" region
    Then the Opportunity should have stage "Pipeline"
    And the Opportunity summary fields should be populated
    And I log the MRD process record summary

    Examples: US region (MOU required)
      | Region | AccountType    |
      | US     | Member         |
      | US     | Non-Member MGA |

    Examples: Non-US regions (no MOU)
      | Region | AccountType    |
      | UK     | Member         |
      | EU     | Member         |
      | CA     | Member         |
      | ROW    | Member         |
      | UK     | Non-Member MGA |
      | EU     | Non-Member MGA |
      | CA     | Non-Member MGA |
      | ROW    | Non-Member MGA |

  @mrd-pipeline-summary-us-mou
  Scenario Outline: Pipeline with Summary + MOU Fields (US only) - <AccountType>
    When I create MRD test data at "Pipeline" stage for region "US" with type "<AccountType>" using Excel data
    And I populate the Opportunity summary fields for "US" region
    Then the Opportunity should have stage "Pipeline"
    And the Opportunity summary fields should be populated
    And the MOU fields should be populated for US region
    And I log the MRD process record summary

    Examples:
      | AccountType    |
      | Member         |
      | Non-Member MGA |

  # ═══════════════════════════════════════════════════════════════════════════
  # STAGE 5: DUE DILIGENCE (Opportunity) + ONBOARDING (Account)
  # ═══════════════════════════════════════════════════════════════════════════

  @mrd-due-diligence
  Scenario Outline: Create records at Due Diligence - <AccountType> in <Region>
    When I create MRD test data at "Due Diligence" stage for region "<Region>" with type "<AccountType>" using Excel data
    Then the Opportunity should have stage "Due Diligence"
    And the Account should have status "Onboarding"
    And the Account should have type "<AccountType>"
    And I log the MRD process record summary

    Examples:
      | Region | AccountType    |
      | US     | Member         |
      | UK     | Member         |
      | EU     | Member         |
      | CA     | Member         |
      | ROW    | Member         |
      | US     | Non-Member MGA |
      | UK     | Non-Member MGA |
      | EU     | Non-Member MGA |
      | CA     | Non-Member MGA |
      | ROW    | Non-Member MGA |

  @mrd-due-diligence-onboarding
  Scenario Outline: Due Diligence with Onboarding Team - <AccountType> in <Region>
    When I create MRD test data at "Due Diligence" stage for region "<Region>" with type "<AccountType>" using Excel data
    And I assign the Onboarding team to the Opportunity
    Then the Opportunity should have stage "Due Diligence"
    And the Account should have status "Onboarding"
    And the Onboarding team should be assigned
    And I log the MRD process record summary

    Examples:
      | Region | AccountType    |
      | US     | Member         |
      | EU     | Non-Member MGA |

  # ═══════════════════════════════════════════════════════════════════════════
  # STAGE 6: FULL END-TO-END FLOW
  # ═══════════════════════════════════════════════════════════════════════════

  @mrd-full-flow @mrd-full-flow-us
  Scenario Outline: Full MRD Process Flow end-to-end (US) - <AccountType>
    # Step 1: Create Lead at New status
    When I create a persistent MRD Lead at status "New" for region "US" with type "<AccountType>" using Excel data
    Then the Lead should be created successfully with status "New"

    # Step 2: Move Lead through statuses
    When I transition the Lead to "Funnel" status
    Then the Lead should be created successfully with status "Funnel"

    When I transition the Lead to "Qualified" status
    Then the Lead should be created successfully with status "Qualified"

    # Step 3: Convert Lead -> Contact + Account + Opportunity
    When I convert the MRD Lead to create Account, Contact, and Opportunity with type "<AccountType>"
    Then the converted Account should have status "Prospect"
    And the converted Account should have type "<AccountType>"
    And the converted Contact should be "Active"
    And the converted Opportunity should have stage "Pipeline"

    # Step 4: Move to Pipeline (Opp) + Prospect (Account)
    When I move the Opportunity to "Pipeline" stage and Account to "Prospect" status
    Then the Opportunity should have stage "Pipeline"
    And the Account should have status "Prospect"

    # Step 5: Populate Summary fields (US - with MOU)
    When I populate the Opportunity summary fields for "US" region
    Then the Opportunity summary fields should be populated
    And the MOU fields should be populated for US region

    # Step 6: Move to Due Diligence (Opp) + Onboarding (Account)
    When I move the Opportunity to "Due Diligence" stage and Account to "Onboarding" status
    Then the Opportunity should have stage "Due Diligence"
    And the Account should have status "Onboarding"

    # Step 7: Assign Onboarding Team
    When I assign the Onboarding team to the Opportunity
    Then the Onboarding team should be assigned

    And I log the MRD process record summary

    Examples:
      | AccountType    |
      | Member         |
      | Non-Member MGA |

  @mrd-full-flow @mrd-full-flow-nonUS
  Scenario Outline: Full MRD Process Flow end-to-end (<Region>) - <AccountType>
    When I create a persistent MRD Lead at status "New" for region "<Region>" with type "<AccountType>" using Excel data
    Then the Lead should be created successfully with status "New"

    When I transition the Lead to "Funnel" status
    When I transition the Lead to "Qualified" status

    When I convert the MRD Lead to create Account, Contact, and Opportunity with type "<AccountType>"
    Then the converted Account should have status "Prospect"
    And the converted Account should have type "<AccountType>"
    And the converted Contact should be "Active"
    And the converted Opportunity should have stage "Pipeline"

    When I move the Opportunity to "Pipeline" stage and Account to "Prospect" status
    When I populate the Opportunity summary fields for "<Region>" region

    When I move the Opportunity to "Due Diligence" stage and Account to "Onboarding" status
    When I assign the Onboarding team to the Opportunity

    And I log the MRD process record summary

    Examples: Non-US regions x both types
      | Region | AccountType    |
      | UK     | Member         |
      | EU     | Member         |
      | CA     | Member         |
      | ROW    | Member         |
      | UK     | Non-Member MGA |
      | EU     | Non-Member MGA |
      | CA     | Non-Member MGA |
      | ROW    | Non-Member MGA |

  # ═══════════════════════════════════════════════════════════════════════════
  # MASTER BATCH: All Region x Type x Stage combos in one run
  # Creates 2 types x 5 regions x 7 statuses = 70 records
  # ═══════════════════════════════════════════════════════════════════════════

  @mrd-all-combos
  Scenario: Create test data for ALL region x type x stage combinations
    When I create MRD test data for all region and type combinations using Excel data
    Then I log the MRD process record summary

  @mrd-batch-all-stages @mrd-batch-member
  Scenario: Create test data at ALL stages for Member type
    When I create MRD test data batch for type "Member" at all process stages using Excel data
    Then I should have test data at the following stages:
      | Object      | Status/Stage  | Count |
      | Lead        | New           | 1     |
      | Lead        | Funnel        | 1     |
      | Lead        | Qualified     | 1     |
      | Lead        | Unqualified   | 1     |
      | Account     | Prospect      | 2     |
      | Account     | Onboarding    | 1     |
      | Opportunity | Pipeline      | 1     |
      | Opportunity | Pipeline      | 1     |
      | Opportunity | Due Diligence | 1     |
    And I log the MRD process record summary

  @mrd-batch-all-stages @mrd-batch-non-member-mga
  Scenario: Create test data at ALL stages for Non-Member MGA type
    When I create MRD test data batch for type "Non-Member MGA" at all process stages using Excel data
    Then I should have test data at the following stages:
      | Object      | Status/Stage  | Count |
      | Lead        | New           | 1     |
      | Lead        | Funnel        | 1     |
      | Lead        | Qualified     | 1     |
      | Lead        | Unqualified   | 1     |
      | Account     | Prospect      | 2     |
      | Account     | Onboarding    | 1     |
      | Opportunity | Pipeline      | 1     |
      | Opportunity | Pipeline      | 1     |
      | Opportunity | Due Diligence | 1     |
    And I log the MRD process record summary
