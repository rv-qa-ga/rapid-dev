@api @dynamics @d365 @smoke
Feature: Dynamics 365 WhoAmI API
  As an API user
  I want to verify my Dynamics 365 authentication
  So that I can confirm I have valid API access

  Background:
    Given I have a valid Dynamics 365 API token

  @positive @smoke
  Scenario: Verify WhoAmI endpoint returns valid user information
    When I call the Dynamics WhoAmI endpoint
    Then the response status should be 200
    And the response should contain a valid UserId (GUID)
    And the response should contain a valid OrganizationId (GUID)
    And the response should contain a valid BusinessUnitId (GUID)

