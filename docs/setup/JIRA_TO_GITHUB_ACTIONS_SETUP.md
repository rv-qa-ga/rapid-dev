# Jira to GitHub Actions Integration Setup

## Overview

This guide provides step-by-step instructions to set up Jira automation rules that trigger GitHub Actions test workflows. When a user adds a comment in Jira, it automatically triggers tests on your self-hosted runner, and results are uploaded to Zephyr Scale.

## Progress Tracking

### ✅ Prerequisites Completed
- [x] GitHub Personal Access Token (PAT) created
- [x] PAT has `repo` and `workflow` scopes
- [x] Self-hosted runner configured and online (vm-p-qat-ukw-01)
- [x] GitHub Actions workflow configured (.github/workflows/e2e-tests.yml)
- [x] Zephyr Scale integration working
- [x] Tests can run successfully on VM

### 🔄 Setup Steps
- [x] Step 1: Verify GitHub PAT permissions ✅
- [x] Step 2: Access Jira Automation ✅
- [x] Step 3: Create automation rule ✅
- [ ] Step 4: Configure trigger (In Progress)
- [ ] Step 4: Configure trigger
- [ ] Step 5: Configure action (GitHub API call)
- [ ] Step 6: Test the automation
- [ ] Step 7: Verify workflow execution
- [ ] Step 8: Verify results in Zephyr Scale

### ⏳ Next Steps
- [ ] Document automation rule details
- [ ] Create additional automation rules (optional)
- [ ] Set up error notifications

### 📝 Notes & Configuration
- **GitHub Repository**: `accelins/bsg-e2e-tests`
- **Workflow File**: `.github/workflows/e2e-tests.yml`
- **Runner**: Self-hosted on `vm-p-qat-ukw-01`
- **Default Branch**: `main`
- **Zephyr Scale**: Results uploaded automatically after test execution

---

## Step-by-Step Setup Instructions

### Step 1: Verify GitHub PAT Permissions ✅

**Action:** Verify your GitHub Personal Access Token has the correct permissions.

1. Go to: `https://github.com/settings/tokens`
2. Find your token (the one you created for Jira)
3. Verify it has these scopes checked:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)

**If missing permissions:**
- Click "Edit" on the token
- Select the missing scopes
- Click "Update token"

**Note:** If your organization uses SSO, you may need to authorize the token for SSO:
- Click "Configure SSO" next to your token
- Authorize for `accelins` organization

**Status:** ✅ Completed

---

### Step 2: Access Jira Automation

**Action:** Navigate to Jira automation settings.

#### Method 1: From Project Settings (Recommended)

1. Go to your Jira project (e.g., "Salesforce CLM" from your dashboard)
2. Click on the **project name** (top left, next to Jira logo)
3. Select **Project settings** from dropdown
4. In the left sidebar, look for **Automation**
5. Click on **Automation**

#### Method 2: Direct URL

1. Go directly to automation page:
   ```
   https://accelins.atlassian.net/jira/software/projects/[PROJECT_KEY]/settings/automation
   ```
   Replace `[PROJECT_KEY]` with your project key (e.g., `SF` for Salesforce CLM)

#### Method 3: From Jira Settings (Site-wide)

1. Click your profile icon (bottom left)
2. Select **Jira settings**
3. Look for **Automation** in the settings menu
4. This shows site-wide automation rules

**If you don't see Automation:**
- **Check permissions:** You need **Project Admin** or **Jira Admin** role
- **Ask your Jira admin** to:
  - Grant you project admin access, OR
  - Create the automation rule for you, OR
  - Set up the automation at site level
- **Alternative:** Use Jira's built-in webhook feature (if available)

**Status:** [ ] Completed - Need to verify access or request permissions

---

### Step 3: Create New Automation Rule

**Action:** Create a new automation rule for triggering tests.

1. On the Automation page, click **Create rule** (top right)
2. You'll see rule creation options:
   - **From a template** - Skip this, we'll create custom
   - **Create rule manually** - Click this option
3. Rule will be named "Untitled rule" - we'll name it later

**Status:** [ ] Completed

---

### Step 4: Configure Trigger

**Action:** Set up when the automation should trigger.

#### Option A: Manual Trigger (Recommended for Control)

**Best for:** Avoiding accidental triggers, explicit user action required

1. Click on **"Manual trigger from work item"**
2. This adds a button/action in Jira issues
3. Users click the button to explicitly trigger tests
4. No accidental triggers from comments

**Restricting Access to Manual Trigger Button:**

After adding the manual trigger, you can restrict who sees/uses it:

**Method 1: Add Condition (Restrict by User/Role)**
1. After adding the trigger, click **+ Add condition** (if available)
2. Select condition type:
   - **User is in group** - Restrict to specific Jira groups (e.g., "QA Team", "Developers")
   - **User is in project role** - Restrict to project roles (e.g., "Developers", "QA")
   - **User is** - Restrict to specific users
3. Configure the condition to allow only authorized users

**Method 2: Configure Trigger Settings**
1. Click on the manual trigger you just added
2. Look for **"Who can trigger"** or **"Permissions"** settings
3. Select:
   - **Project admins only**
   - **Specific groups** (e.g., "QA Team")
   - **Specific users**
   - **Project role** (e.g., "Developers")

**Method 3: Add Condition After Trigger**
1. After adding the manual trigger, add a condition step
2. Select: **User is in group** or **User is in project role**
3. Specify the allowed group/role (e.g., "QA Team", "Developers")

**Recommended Groups/Roles:**
- Create a Jira group: "E2E Test Runners" or "QA Automation"
- Add authorized users to this group
- Restrict trigger to this group only

**Pros:**
- ✅ Explicit action required (no accidental triggers)
- ✅ Works even with multiple comments
- ✅ Clear intent - user wants to run tests
- ✅ Can add button to issue view
- ✅ Can restrict access to authorized users only

**Cons:**
- Requires clicking a button (one extra click)

#### Option B: Trigger on Comment (Simple but can trigger multiple times)

**Best for:** Quick triggering via comment

1. Search for "comment" in the trigger search
2. Select **"Issue commented"** or **"Work item commented"**
3. Configure trigger:
   - **Comment text contains**: `run tests`
   - (Optional) **Comment author is**: Leave empty or restrict to specific users
4. Click **Save**

**Pros:**
- ✅ Very simple - just add comment
- ✅ No need to find a button

**Cons:**
- ⚠️ Can trigger multiple times if multiple comments contain "run tests"
- ⚠️ Might trigger accidentally

**To prevent multiple triggers with comments:**
- Add condition: "Only trigger once per issue" (if available)
- Or use a more specific comment format: `@run-tests` or `#run-tests`

#### Option C: Trigger on Label (Alternative)

1. Click on **"Field value changed"**
2. Configure:
   - **Field**: `Labels`
   - **Condition**: `is added`
   - **Value**: `run-tests`
3. Click **Save**

**Pros:**
- ✅ Only triggers when label is added (once)
- ✅ Clear visual indicator (label on issue)

**Cons:**
- Requires adding/removing labels

**Recommended:** Use **Option A (Manual Trigger)** for better control and to avoid accidental multiple triggers.

**Status:** [ ] Completed

---

### Step 4b: Add Condition to Restrict Access (Optional but Recommended)

**Action:** Restrict who can see and use the manual trigger button.

**If you added a manual trigger and want to restrict access:**

1. After adding the manual trigger, click **+ Add condition** (or look for condition options)
2. Select one of these conditions:

   **Option 1: Restrict by Group (Recommended)**
   - Select: **User is in group**
   - Choose group: Create or select a group like "QA Team" or "E2E Test Runners"
   - Only users in this group will see the trigger button

   **Option 2: Restrict by Project Role**
   - Select: **User is in project role**
   - Choose role: "Developers", "QA", or "Project Administrators"
   - Only users with this role will see the trigger button

   **Option 3: Restrict by Specific Users**
   - Select: **User is**
   - Add specific usernames who should have access
   - Only these users will see the trigger button

3. Click **Save** or **Add**

**Note:** If you don't see condition options immediately, you may be able to configure this in the trigger settings or add it as a separate condition step.

**Status:** [ ] Completed (Optional - skip if you want everyone to see the button)

---

### Step 5: Configure Action - Send Web Request to GitHub

**Action:** Configure the automation to call GitHub Actions API.

1. After setting the trigger, click **+ Add action**
2. Select: **Send web request**
3. Configure the web request:

   **Request settings:**
   - **Webhook URL**: 
     ```
     https://api.github.com/repos/accelins/bsg-e2e-tests/actions/workflows/e2e-tests.yml/dispatches
     ```
   - **HTTP method**: `POST`
   - **Authentication**: `Basic authentication`
     - **Username**: `rv-qa-ga` (your GitHub username)
     - **Password**: `YOUR_GITHUB_PAT` (paste your Personal Access Token here)

   **Headers:**
   Click **+ Add header** and add:
   - **Header 1:**
     - Name: `Accept`
     - Value: `application/vnd.github.v3+json`
   - **Header 2:**
     - Name: `Content-Type`
     - Value: `application/json`

   **Request body:**
   - **Body content type**: `JSON` (or "Custom data")
   - **Body content**:
     ```json
     {
       "ref": "main",
       "inputs": {
         "work_item": "{{issue.key}}",
         "environment": "qa",
         "test_type": "all",
         "cycle_name": "Sprint-93-QA"
       }
     }
     ```
     
   **Available inputs on `main` branch:**
   - `work_item` (optional) - Work item tag (e.g., SF-506) - runs tests tagged with @SF-506
   - `environment` (optional, defaults to "qa") - Environment: dev, qa, or uat
   - `test_type` (optional, defaults to "all") - Test type: all, ui, api, salesforce, dynamics, sqlserver, smoke, regression
   - `tags` (optional) - Cucumber tags (e.g., @smoke or @smoke,@regression)
   - `feature_file` (optional) - Specific feature file path (e.g., src/features/ui/SF/SF-523.feature)
   - `cycle_name` (optional) - Zephyr test cycle name (e.g., Sprint-93-QA). If not provided, will auto-generate:
     - If `work_item` is provided: `{work_item}-{ENV}-{DATE}` (e.g., SF-491-QA-2026-01-15)
     - Otherwise: `{ENV}-{DATE}-Run{RUN_NUMBER}` (e.g., QA-2026-01-15-Run123)

4. Click **Save**

**Important Notes:**
- `{{issue.key}}` is a Jira variable that automatically inserts the work item key (e.g., SF-523)
- The `ref: "main"` specifies the branch to run the workflow from
- `inputs` match the workflow_dispatch inputs in your GitHub Actions workflow

**✅ Note:** The workflow is now on `main` branch. Use `"ref": "main"` for production.

**Status:** ✅ Completed - Validation successful! (Got 204 No Content response)

---

### Step 6: Add Rule Name and Description

**Action:** Name your automation rule for easy identification.

1. At the top of the rule editor, click on "Untitled rule"
2. Enter name: `Trigger E2E Tests from Jira`
3. (Optional) Add description:
   ```
   Triggers GitHub Actions E2E test workflow when user comments "run tests" on a Jira issue.
   Automatically passes the work item key (e.g., SF-523) to the workflow.
   ```

**Status:** [ ] Completed

---

### Step 7: Save and Enable Rule

**Action:** Activate the automation rule.

1. Review your rule configuration:
   - ✅ Trigger: Issue commented with "run tests"
   - ✅ Action: Send web request to GitHub API
   - ✅ Headers and body configured correctly
2. Click **Turn it on** (top right)
3. Rule is now active

**Status:** [ ] Completed

---

### Step 8: Test the Automation

**Action:** Test that the automation works correctly.

1. **Create a test Jira issue** (or use an existing one)
   - Issue key: e.g., `SF-523` or `TEST-1`
2. **Add a comment** to the issue:
   - Comment text: `run tests`
3. **Check GitHub Actions:**
   - Go to: `https://github.com/accelins/bsg-e2e-tests/actions`
   - You should see a new workflow run appear within a few seconds
   - Status should show "Queued" then "In progress"
4. **Check workflow run details:**
   - Click on the workflow run
   - Verify:
     - Work item input shows your Jira issue key
     - Environment is set to "qa"
     - Runner is "self-hosted"
     - Tests are executing

**Expected Result:**
- Workflow appears in GitHub Actions within 10-30 seconds
- Workflow runs on self-hosted runner
- Tests execute for the specified work item

**Troubleshooting:**
- If workflow doesn't appear: Check Jira automation execution logs
- If authentication fails: Verify GitHub PAT is correct and has workflow scope
- If workflow fails: Check GitHub Actions logs for errors

**Status:** [ ] Completed

---

### Step 9: Verify Test Execution

**Action:** Confirm tests run successfully.

1. **Monitor workflow execution:**
   - In GitHub Actions, watch the workflow run
   - Check each step completes successfully
   - Verify tests execute on self-hosted runner

2. **Check test results:**
   - View test output in GitHub Actions logs
   - Check for any failures or errors
   - Verify test count matches expected

**Status:** [ ] Completed

---

### Step 10: Verify Results in Zephyr Scale

**Action:** Confirm test results are uploaded to Zephyr Scale.

1. **Wait for workflow to complete** (usually 5-15 minutes depending on test count)
2. **Check Zephyr Scale:**
   - Go to your Zephyr Scale project
   - Navigate to **Test Executions** or **Test Cycles**
   - Look for test executions with your work item key (e.g., SF-523)
   - Verify pass/fail status matches test results

3. **Check Jira issue:**
   - Go back to your Jira issue
   - Check if test results are linked (if Zephyr linking is configured)
   - Verify execution status

**Expected Result:**
- Test results appear in Zephyr Scale
- Results are linked to Jira work item
- Pass/fail counts are accurate

**Status:** [ ] Completed

---

## Advanced Configuration

### Option 1: Parse Comment for Options

Enhance the automation to parse comment text for additional options:

**Comment format:**
```
run tests environment=qa tags=@smoke
```

**Update automation rule:**
1. Add a **Branch** step before the web request
2. Use **Smart values** to extract:
   - `environment` from comment
   - `tags` from comment
3. Use these in the web request body

**Body example:**
```json
{
  "ref": "main",
  "inputs": {
    "work_item": "{{issue.key}}",
    "environment": "{{smartvalue.comment.body.match(environment=(\\w+))}}",
    "tags": "{{smartvalue.comment.body.match(tags=(.+))}}"
  }
}
```

### Option 2: Multiple Trigger Options

Create additional automation rules for different scenarios:

**Rule 2: Trigger on Label**
- Trigger: Label "run-smoke-tests" added
- Action: Same web request with `test_type: "smoke"`

**Rule 3: Trigger on Status Change**
- Trigger: Status changed to "In Testing"
- Action: Run all tests for the work item

### Option 3: Add Notifications

Add a step after the web request to notify users:

1. **Add action**: **Send email** or **Comment on issue**
2. **Message**: 
   ```
   Tests triggered successfully! 
   View progress: https://github.com/accelins/bsg-e2e-tests/actions
   Work item: {{issue.key}}
   ```

---

## Troubleshooting

### Issue: Workflow Not Triggering

**Symptoms:**
- Comment added but no workflow appears in GitHub Actions

**Solutions:**
1. Check Jira automation execution logs:
   - Go to: Automation → **Rule executions** (left sidebar)
   - Find your rule execution
   - Check for errors

2. Verify GitHub PAT:
   - Token is valid and not expired
   - Has `workflow` scope
   - Authorized for SSO (if applicable)

3. Check web request configuration:
   - URL is correct
   - HTTP method is POST
   - Headers are set correctly
   - Body JSON is valid

### Issue: Authentication Failed

**Symptoms:**
- Workflow appears but fails with "403 Forbidden"

**Solutions:**
1. Verify PAT has `workflow` scope
2. Check if SSO authorization is needed
3. Verify username matches GitHub username exactly

### Issue: Workflow Runs but Tests Fail

**Symptoms:**
- Workflow triggers but tests don't execute

**Solutions:**
1. Check runner is online:
   - GitHub → Settings → Actions → Runners
   - Verify runner shows "Idle" or "Online"

2. Check workflow logs:
   - View detailed logs in GitHub Actions
   - Look for specific error messages

3. Verify environment variables:
   - Check GitHub Secrets are configured
   - Verify `.env.qa` file exists on runner

### Issue: Results Not Uploading to Zephyr

**Symptoms:**
- Tests run but don't appear in Zephyr Scale

**Solutions:**
1. Check Zephyr upload step in workflow logs
2. Verify Zephyr credentials in GitHub Secrets
3. Check Zephyr API token is valid
4. Verify test case keys match Zephyr test cases

---

## Verification Checklist

After setup, verify everything works:

- [ ] GitHub PAT created with `repo` and `workflow` scopes
- [ ] Jira automation rule created
- [ ] Trigger configured (comment or label)
- [ ] Web request action configured with correct URL
- [ ] Authentication set up (Basic Auth with PAT)
- [ ] Headers configured (Accept and Content-Type)
- [ ] Request body includes work item variable
- [ ] Rule is enabled and active
- [ ] Test execution successful (commented on Jira issue)
- [ ] Workflow appears in GitHub Actions
- [ ] Tests execute on self-hosted runner
- [ ] Results uploaded to Zephyr Scale
- [ ] Results linked to Jira work item

---

## Usage Examples

### Example 1: Run Tests for Specific Work Item

1. Open Jira issue: `SF-523`
2. Add comment: `run tests`
3. Automation triggers
4. Tests run for `@SF-523` tagged scenarios
5. Results appear in Zephyr Scale

### Example 2: Run Smoke Tests

1. Open Jira issue: `SF-523`
2. Add comment: `run tests test_type=smoke`
3. (If advanced parsing is configured)
4. Only smoke tests execute

### Example 3: Run Tests for Different Environment

1. Open Jira issue: `SF-523`
2. Add comment: `run tests environment=uat`
3. Tests run against UAT environment
4. Results uploaded to Zephyr Scale

---

## Security Best Practices

1. **Store PAT Securely:**
   - Use Jira's credential storage (not hardcoded)
   - Rotate tokens regularly
   - Use least privilege (only `repo` and `workflow` scopes)

2. **Limit Access:**
   - Restrict automation rule to specific users/groups
   - Add conditions to prevent abuse

3. **Monitor Usage:**
   - Review automation execution logs regularly
   - Check GitHub Actions usage
   - Monitor for unauthorized triggers

---

## Next Steps

After completing setup:

1. **Test with real work items**
2. **Document the process** for your team
3. **Create additional rules** for different scenarios (optional)
4. **Set up notifications** for test completion (optional)
5. **Monitor and optimize** based on usage

---

## Support Resources

- **Jira Automation Docs**: https://support.atlassian.com/jira-service-management-cloud/docs/use-automation-rules-in-jira-service-management/
- **GitHub Actions API**: https://docs.github.com/en/rest/actions/workflows
- **GitHub PAT Guide**: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token

---

## Summary

✅ **Setup Complete When:**
- Automation rule is created and enabled
- Test execution from Jira comment works
- Workflow runs on self-hosted runner
- Results upload to Zephyr Scale automatically

🎯 **End Result:**
Users can trigger E2E tests directly from Jira by simply adding a comment "run tests", and results automatically appear in Zephyr Scale.
