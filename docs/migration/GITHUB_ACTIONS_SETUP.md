# GitHub Actions Setup Guide

## Current Status

⚠️ **GitHub Actions workflow is currently disabled** - Self-hosted runner VM not yet configured.

**VM Details:**
- **Region**: UK South (Azure)
- **Status**: Pending setup
- **Setup Plan**: See [Self-Hosted Runner Setup Plan](../setup/SELF_HOSTED_RUNNER_SETUP_PLAN.md)

## Workflow File

The workflow file is located at: `.github/workflows/e2e-tests.yml`

It's currently configured for manual dispatch only. Automated triggers are commented out until the self-hosted runner is configured and tested.

## Self-Hosted Runner Setup

We're using a **self-hosted runner** on a Linux VM in UK South region instead of GitHub-hosted runners.

### Quick Setup Steps

1. **Follow the detailed setup plan**: [Self-Hosted Runner Setup Plan](../setup/SELF_HOSTED_RUNNER_SETUP_PLAN.md)
2. **Or use the automated script**: `scripts/setup/install-github-runner.sh`
3. **Verify runner appears online** in GitHub: Settings → Actions → Runners
4. **Test with a simple workflow** before enabling E2E tests
5. **Update workflow** to use `runs-on: self-hosted` (already configured)

### Installation Script

Once you have SSH access to the VM:

```bash
# Copy script to VM (or clone repo)
# Make executable
chmod +x install-github-runner.sh

# Run installation
./install-github-runner.sh
```

The script will:
- Install Node.js 20
- Install system dependencies for Playwright
- Download and configure GitHub Actions runner
- Install runner as a systemd service
- Enable auto-start on boot

## When Ready to Enable

### Step 1: Configure GitHub Secrets

Add the following secrets in GitHub repository settings:
- **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Required secrets:
- `SF_JWT_CLIENT_ID` - Salesforce JWT Client ID
- `SF_JWT_USERNAME` - Salesforce username
- `SF_PRIVATE_KEY` - Salesforce private key
- `SF_BASE_URL` - Salesforce base URL
- `SF_LOGIN_URL` - Salesforce login URL
- `ATLASSIAN_EMAIL` - Atlassian email
- `ATLASSIAN_API_TOKEN` - Atlassian API token
- `JIRA_BASE_URL` - JIRA base URL
- `ZEPHYR_BASE_URL` - Zephyr base URL
- `ZEPHYR_PROJECT_KEY` - Zephyr project key
- `CONFLUENCE_BASE_URL` - Confluence base URL
- `CONFLUENCE_SPACE_KEY` - Confluence space key
- `CONFLUENCE_PARENT_FOLDER_ID` - Confluence parent folder ID

### Step 2: Enable Workflow

Uncomment the workflow triggers in `.github/workflows/e2e-tests.yml`:

```yaml
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    # Run nightly at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:
```

### Step 3: Verify package-lock.json

Ensure `package-lock.json` is committed (it should NOT be in `.gitignore`):

```bash
# Check if it's tracked
git ls-files package-lock.json

# If not, remove from .gitignore and commit
# Remove line 3 from .gitignore: package-lock.json
git add package-lock.json
git commit -m "Add package-lock.json for CI/CD"
```

### Step 4: Test Workflow

1. Push changes to trigger workflow
2. Or manually trigger via: **Actions** → **E2E Automation Tests** → **Run workflow**

## Workflow Features

- ✅ Runs on push to `main` and `develop`
- ✅ Runs on pull requests to `main`
- ✅ Nightly scheduled runs at 2 AM UTC
- ✅ Manual trigger via workflow_dispatch
- ✅ Installs dependencies with `npm ci`
- ✅ Runs Playwright tests
- ✅ Uploads results to Zephyr
- ✅ Publishes test artifacts

## Current Workflow Status

- **Status**: ⚠️ Disabled (commented out)
- **Reason**: VM not configured yet
- **Action**: Enable when ready (see Step 2)

## Alternative: Use Azure DevOps

If you prefer Azure DevOps, the pipeline is configured in:
- `azure-pipelines.yml`

This requires:
- Azure DevOps project setup
- Variable group: `E2E-Automation-Secrets`

