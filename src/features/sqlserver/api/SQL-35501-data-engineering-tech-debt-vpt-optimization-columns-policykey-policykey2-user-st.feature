@sqlserver @ado @ado-35501
Feature: Data Engineering Tech Debt VPT Optimization Columns PolicyKey PolicyKey2 - User Story
  As a QA engineer
  I want to validate SQL Server changes for Azure DevOps work item 35501
  So that I can ensure database changes are working correctly

  # SQL Validation Scripts
  # The following SQL scripts are available in src/features/sqlserver/sql-scripts/
  # These scripts are generated from comprehensive test case analysis:

  # - WI-35501-TC-01.sql

  Background:
    Given I have a valid SQL Server connection

  # Rollback & Upgrade safety Tests

  @sqlserver @ado-35501 @priority-high @type-rollback @category-rollback-upgrade-safety
  Scenario: Validate rollback script exists and is tested
    # Test Case ID: WI-35501-TC-01
    # Purpose: Verify that changes can be safely rolled back if needed
    # Priority: High | Type: Rollback | Complexity: Complex
    # SQL Script: src/features/sqlserver/sql-scripts/WI-35501-TC-01.sql
    Given Rollback script available
    Then Rollback script successfully reverts all changes
