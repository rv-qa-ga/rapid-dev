# Quick Start: Process New QA Work Items

## Overview
Automated workflow to process new Jira work items in the QA queue by generating feature files and step definitions.

## Quick Commands

### Process All New QA Work Items
```bash
npm run process:new-qa-items
```

### Process Specific Work Item(s)
```bash
npm run process:new-qa-items -- SF-600
npm run process:new-qa-items -- SF-600 SF-601 SF-602
```

### Dry Run (See What Would Be Done)
```bash
npm run process:new-qa-items -- --dry-run
```

### Only Generate Step Definitions (Skip Feature Generation)
```bash
npm run process:new-qa-items -- --steps-only
```

### Overwrite Existing Feature Files
```bash
npm run process:new-qa-items -- --overwrite
```

## What the Script Does

1. **Queries Jira** for work items in "Ready for QA" or "In QA" status
2. **Analyzes** which work items need feature files
3. **Generates** feature files (UI + API) for new work items
4. **Generates** step definition stubs for missing steps
5. **Reports** summary of all actions taken

## Workflow

```
┌─────────────────────────────────────────────────────────┐
│  1. Query Jira for QA Queue Items                       │
│     (Ready for QA, In QA status)                        │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  2. Analyze Work Items                                  │
│     • Check if feature files exist                      │
│     • Check if step definitions exist                    │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  3. Generate Feature Files (if needed)                  │
│     • UI feature: src/features/ui/SF/{KEY}.feature      │
│     • API feature: src/features/api/SF/{KEY}.feature   │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  4. Generate Step Definitions (if needed)              │
│     • UI steps: src/step-definitions/ui/salesforce/     │
│     • API steps: src/step-definitions/api/salesforce/  │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  5. Generate Summary Report                             │
│     • Features generated                                │
│     • Step definitions generated                        │
│     • Items skipped/failed                             │
└─────────────────────────────────────────────────────────┘
```

## After Running the Script

### 1. Review Generated Feature Files
- Check that scenarios match acceptance criteria
- Verify test data requirements
- Ensure proper tagging

### 2. Implement Step Definitions
Generated step definitions are stubs with TODO comments. Implement actual logic:

**For UI Steps:**
- Use Page Object Model (`AccountPage`, `HomePage`, etc.)
- Use Field Registry for field locators
- Example: `src/step-definitions/common/ui-common.steps.ts`

**For API Steps:**
- Use API clients (`SalesforceAPIClient`, etc.)
- Example: `src/step-definitions/common/api-common.steps.ts`

**For Data Setup:**
- Use `TestDataFactory` or `RoleBasedDataFactory`
- Example: `src/step-definitions/common/data-factory.steps.ts`

### 3. Test Execution
```bash
# Run specific work item tests
npm run test:tag @SF-600

# Run only UI tests
npm run test:tag @SF-600 @ui

# Run only API tests
npm run test:tag @SF-600 @api
```

### 4. Update Tracking
Add processed work items to `inputs/jira-work-items.txt`:
```
SF-600
SF-601
```

## Troubleshooting

### No Work Items Found
- Check Jira credentials in `.env.qa`
- Verify project key in config
- Check work item status in Jira

### Feature Generation Fails
- Check Jira API access
- Verify work item exists and is accessible
- Check for network/authentication issues

### Step Definitions Not Generated
- Ensure feature files exist first
- Run manually: `npm run generate:steps -- --work-item SF-600`
- Check for syntax errors in feature files

## Related Commands

```bash
# Find missing work items (compare Jira vs file)
npm run jira:find-missing

# Generate features manually
npm run jira:generate -- SF-600

# Generate step definitions manually
npm run generate:steps -- --work-item SF-600

# Validate step definitions
npm run validate:steps
```

## Files Created

### Feature Files
- `src/features/ui/SF/{WORK_ITEM_KEY}.feature`
- `src/features/api/SF/{WORK_ITEM_KEY}.feature`

### Step Definition Files
- `src/step-definitions/ui/salesforce/{WORK_ITEM_KEY}.steps.ts`
- `src/step-definitions/api/salesforce/{WORK_ITEM_KEY}.steps.ts`

## Example Output

```
╔═══════════════════════════════════════════════════════════════╗
║     🚀 PROCESS NEW QA WORK ITEMS                              ║
╚═══════════════════════════════════════════════════════════════╝

📋 Project Key: SF

🔍 Querying Jira with JQL: project = SF AND issuetype = Story AND status IN ("Ready for QA", "In QA") ORDER BY key ASC
✅ Found 3 work items in QA queue

📊 Analyzing 3 work item(s)...

📋 Analysis Results:
   • New work items (need feature files): 2
   • Existing work items: 1

   New work items:
      - SF-600: Add new field to Account
        Status: Ready for QA
        UI Feature: ❌
        API Feature: ❌
      - SF-601: Update validation rules
        Status: In QA
        UI Feature: ❌
        API Feature: ❌

────────────────────────────────────────────────────────────────
Processing: SF-600 - Add new field to Account
────────────────────────────────────────────────────────────────
   📝 Generating feature files for SF-600...
   ✅ Feature files generated
   📝 Generating step definitions for SF-600...
   ✅ Step definition files generated

═══════════════════════════════════════════════════════════════
📊 PROCESSING SUMMARY REPORT
═══════════════════════════════════════════════════════════════

Total work items found in QA queue: 3
  • New work items (need feature files): 2
  • Existing work items: 1

Processing Results:
  ✅ Features generated: 2
  ✅ Step definitions generated: 2
  ⏭️  Skipped: 0
  ❌ Failed: 0
```

## Next Steps

See the full plan document: `docs/PLAN_PROCESS_NEW_QA_WORK_ITEMS.md`

