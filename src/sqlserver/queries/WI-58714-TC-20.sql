-- ============================================================================
-- Test Script: WI-58714-TC-20
-- Title: Validate permissions on dbo.D365
-- Purpose: Verify only authorized roles can access dbo.D365
-- Category: Security & Permissions
-- Priority: Medium | Type: Security | Complexity: Moderate
-- ============================================================================
-- Generated for comprehensive test case analysis
-- Work Item: 58714
-- ============================================================================

-- PRECONDITIONS
-- Object dbo.D365 exists. Test user with limited permissions available.

-- SETUP
-- Setup: Configure test environment as needed

-- TEST EXECUTION
-- Test with different user roles

EXECUTE AS USER = 'TestUser'

-- Attempt to SELECT/INSERT/UPDATE/DELETE

REVERT

-- EXPECTED RESULT
-- Only authorized roles can perform allowed operations

-- VERIFICATION
-- Add assertions here based on expected result
-- Example:
-- IF NOT EXISTS (SELECT 1 FROM ... WHERE ...)
--     THROW 50000, 'Test failed: Expected condition not met', 1

-- CLEANUP
-- No cleanup required for this test

-- ============================================================================
-- Automation Notes: Can be automated with EXECUTE AS and permission checks
-- ============================================================================
