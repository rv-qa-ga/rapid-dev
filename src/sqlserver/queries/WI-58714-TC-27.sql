-- ============================================================================
-- Test Script: WI-58714-TC-27
-- Title: Validate index exists and is used: spcreatetfxamount
-- Purpose: Verify index spcreatetfxamount exists and improves query performance
-- Category: Index & Performance
-- Priority: Medium | Type: Performance | Complexity: Moderate
-- ============================================================================
-- Generated for comprehensive test case analysis
-- Work Item: 58714
-- ============================================================================

-- PRECONDITIONS
-- Table exists. Index should be created.

-- SETUP
-- Setup: Configure test environment as needed

-- TEST EXECUTION
SELECT i.name AS IndexName, i.type_desc AS IndexType

FROM sys.indexes i

INNER JOIN sys.tables t ON i.object_id = t.object_id

WHERE t.name = 'd365' AND i.name = 'spcreatetfxamount'

IF @@ROWCOUNT = 0 THROW 50000, 'Index spcreatetfxamount does not exist', 1

-- Check index usage in execution plan for related queries

-- EXPECTED RESULT
-- Index exists and is used in query execution plans

-- VERIFICATION
-- Add assertions here based on expected result
-- Example:
-- IF NOT EXISTS (SELECT 1 FROM ... WHERE ...)
--     THROW 50000, 'Test failed: Expected condition not met', 1

-- CLEANUP
-- No cleanup required for this test

-- ============================================================================
-- Automation Notes: Can check index existence with sys.indexes. Performance validation requires execution plan analysis
-- ============================================================================
