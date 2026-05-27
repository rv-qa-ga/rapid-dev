# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-872 — Access and Governance Model (roles, audit metadata)
#
# Automated checks use representative object Sub_Product__c; the same rules apply to
# the other SF-872 product reference objects once profiles are aligned.
#
# Not automated here (process / setup — track in test plan or runbooks):
#   • Data Governance must not create new custom objects (metadata / setup).
#   • Record deletion is not normal lifecycle; admin deletions must be documented
#     and synchronized with RDM.
#   • Org-wide “restricted framework” posture (OWD, sharing) — validate in security
#     review; optional future API checks if the org exposes stable signals.
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-872 @rbt @medium @product-reference-data @governance
Feature: API - SF-872 - Access and governance model

  @SF-872 @SF-872-API-011 @p2
  Scenario: API - Data Governance user can create and update reference records including Valid To (describe)
    Given I have a valid Salesforce API token as Data Governance user
    When I verify SF-872 Data Governance record permissions via describe for object "Sub_Product__c"
    Then I write the SF-872 governance verification report
    And the SF-872 governance permission checks should pass

  @SF-872 @SF-872-API-012 @p2
  Scenario: API - Read-only user cannot create update or delete SF-872 reference records (describe)
    Given I have a valid Salesforce API token as read-only user
    When I verify SF-872 read-only record permissions via describe for object "Sub_Product__c"
    Then I write the SF-872 governance verification report
    And the SF-872 governance permission checks should pass

  @SF-872 @SF-872-API-013 @p2
  Scenario: API - Field history tracking for Name Valid From Valid To and governance fields (Tooling)
    Given I have a valid Salesforce API token
    When I verify SF-872 field history tracking via Tooling for object "Sub_Product__c"
    Then I write the SF-872 governance verification report
    And the SF-872 governance permission checks should pass
