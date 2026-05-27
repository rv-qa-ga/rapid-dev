# Plan: Process New QA Work Items

## Overview
This plan outlines the process to automatically read new work items from Jira's QA queue, generate feature files, and implement step definitions based on the existing framework.

## Workflow

### Phase 1: Discovery
1. **Query Jira for QA Queue Items**
   - Query: `project = {PROJECT_KEY} AND issuetype = Story AND status IN ("Ready for QA", "In QA") ORDER BY key ASC`
   - Use `JiraClient.searchIssues()` method
   - Filter by project key from config

2. **Identify New Work Items**
   - Check existing feature files in:
     - `src/features/ui/SF/` (UI features)
     - `src/features/api/SF/` (API features)
   - Compare Jira work item keys (e.g., SF-XXX) with existing feature file names
   - Mark work items as "new" if no feature files exist

3. **Check Existing Work Items**
   - For work items that already have feature files:
     - Verify if step definitions exist
     - Identify missing step definitions using `generate-step-definitions.ts`

### Phase 2: Feature File Generation
1. **Generate Feature Files**
   - Use `FeatureGenerator` class from `src/integrations/jira/FeatureGenerator.ts`
   - For each new work item:
     - Call `generator.generateWithSuffix(workItemKey, '')`
     - This generates both UI and API feature files automatically
   - Feature files will be created in:
     - `src/features/ui/SF/{WORK_ITEM_KEY}.feature`
     - `src/features/api/SF/{WORK_ITEM_KEY}.feature`

2. **Handle Existing Feature Files**
   - If feature files exist but are outdated:
     - Option to skip, overwrite, or create versioned copies
     - Use `--overwrite-all`, `--skip-all`, or `--version-all` flags

### Phase 3: Step Definition Implementation
1. **Analyze Missing Steps**
   - Use `scripts/generate-step-definitions.ts` to:
     - Parse all feature files
     - Compare with existing step definitions
     - Identify missing step definitions

2. **Generate Step Definitions**
   - Run: `npm run generate:steps -- --work-item {WORK_ITEM_KEY}`
   - This generates stub step definitions for missing steps
   - Step definitions are created in:
     - `src/step-definitions/ui/salesforce/{WORK_ITEM_KEY}.steps.ts` (for UI)
     - `src/step-definitions/api/salesforce/{WORK_ITEM_KEY}.steps.ts` (for API)

3. **Implement Step Definitions**
   - Review generated stubs
   - Implement actual logic using:
     - Common step definitions from `src/step-definitions/common/`
     - Page Object Model for UI tests
     - API clients for API tests
     - Test data factories for data setup

### Phase 4: Validation & Reporting
1. **Validate Step Definitions**
   - Run step definition validator to ensure all steps are covered
   - Check for syntax errors and missing imports

2. **Generate Summary Report**
   - Report includes:
     - New work items found
     - Feature files generated
     - Step definitions generated
     - Missing step definitions that need manual implementation
     - Work items that failed to process

## Automation Script

### Script: `scripts/process-new-qa-work-items.ts`

**Purpose**: Automate the entire workflow from discovery to step definition generation.

**Features**:
- Queries Jira for new QA work items
- Identifies which work items need feature files
- Generates feature files automatically
- Generates step definition stubs
- Provides comprehensive summary report

**Usage**:
```bash
# Process all new QA work items
npm run process:new-qa-items

# Process specific work items
npm run process:new-qa-items -- SF-600 SF-601

# Dry run (show what would be done without making changes)
npm run process:new-qa-items -- --dry-run

# Skip feature generation, only generate step definitions
npm run process:new-qa-items -- --steps-only

# Overwrite existing feature files
npm run process:new-qa-items -- --overwrite
```

## Manual Steps (Post-Automation)

After the automation script runs, manual review and implementation is needed:

1. **Review Generated Feature Files**
   - Check that scenarios match acceptance criteria
   - Verify test data requirements
   - Ensure proper tagging (@work-item-key, @ui, @api, etc.)

2. **Implement Step Definitions**
   - Generated stubs have TODO comments
   - Implement actual logic:
     - For UI: Use Page Object Model and Field Registry
     - For API: Use API clients (SalesforceAPIClient, etc.)
     - For Data: Use TestDataFactory or RoleBasedDataFactory

3. **Test Execution**
   - Run feature files to verify step definitions work
   - Fix any issues found
   - Update step definitions as needed

4. **Update Work Item Tracking**
   - Add processed work items to `inputs/jira-work-items.txt`
   - Update status in Jira if needed

## File Structure

```
src/
├── features/
│   ├── ui/SF/          # UI feature files (SF-XXX.feature)
│   └── api/SF/         # API feature files (SF-XXX.feature)
├── step-definitions/
│   ├── common/         # Shared step definitions (highest priority)
│   ├── ui/salesforce/  # UI-specific step definitions
│   └── api/salesforce/ # API-specific step definitions
└── integrations/jira/
    ├── client.ts       # Jira API client
    └── FeatureGenerator.ts  # Feature file generator
```

## Dependencies

- `JiraClient` - For querying Jira
- `FeatureGenerator` - For generating feature files
- `generate-step-definitions.ts` - For generating step definition stubs
- Environment config - For Jira credentials and project key

## Error Handling

- **Jira Connection Errors**: Log error and continue with next work item
- **Feature Generation Failures**: Log error, add to failed list, continue
- **Step Definition Generation Failures**: Log error, continue
- **Missing Dependencies**: Validate before starting, fail fast with clear error message

## Success Criteria

✅ All new QA work items have feature files generated
✅ All feature files have corresponding step definition stubs
✅ Step definitions are properly categorized (common, ui, api)
✅ Summary report shows clear status of all work items
✅ No duplicate feature files created
✅ All generated code follows framework patterns

## Next Steps

1. Create automation script (`scripts/process-new-qa-work-items.ts`)
2. Add npm script to `package.json`
3. Test script with a few work items
4. Document any manual steps required
5. Set up regular execution (manual or scheduled)

