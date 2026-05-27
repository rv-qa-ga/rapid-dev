# GitHub Actions Runner Selection Logic

## How GitHub Actions Selects Runners

### Automatic Selection (No Manual Configuration Needed)

GitHub Actions **automatically** selects available runners based on label matching. You don't need to configure anything - it's built-in!

---

## Selection Process

### Step 1: Workflow Specifies Runner Label

In your workflow file (`.github/workflows/e2e-tests.yml`):

```yaml
jobs:
  test:
    runs-on: self-hosted  # ← This is the key!
```

**What this means:**
- The workflow requires a runner with the label `self-hosted`
- GitHub will look for ANY runner that has this label

### Step 2: Runner Labels Must Match

Both your runners have these labels:
- `vm-p-qat-ukw-01`: Labels = `self-hosted`, `Linux`, `X64`
- `vm-p-qat-ukw-01-runner2`: Labels = `self-hosted`, `Linux`, `X64`

**Result:** Both runners match the `runs-on: self-hosted` requirement ✅

### Step 3: GitHub Automatically Distributes Jobs

When a job is queued:
1. GitHub checks: "Which runners have the `self-hosted` label?"
2. GitHub checks: "Which of those runners are currently **idle**?"
3. GitHub selects: **Any available idle runner** (first-come-first-served)
4. If multiple jobs are queued simultaneously:
   - Job 1 → Assigned to first available runner
   - Job 2 → Assigned to second available runner
   - Job 3 → Queued (waits for a runner to become available)

---

## Current Configuration

### Workflow File Location
**File:** `.github/workflows/e2e-tests.yml`

**Key Line:**
```yaml
runs-on: self-hosted
```

### Runner Labels (Both Runners)
- ✅ `self-hosted` (required by workflow)
- ✅ `Linux` (informational)
- ✅ `X64` (informational)

**Where labels are set:**
- During runner configuration: `./config.sh --labels self-hosted,Linux,X64`
- Can be viewed in: GitHub Settings → Actions → Runners

---

## How It Works in Practice

### Scenario 1: One Job Triggered
```
User clicks "Run Tests" in Jira
  ↓
GitHub Actions queues job
  ↓
GitHub checks: "Which runner is idle?"
  ↓
Runner 1 (vm-p-qat-ukw-01) is idle → Selected ✅
  ↓
Job runs on Runner 1
```

### Scenario 2: Two Jobs Triggered Simultaneously
```
User A clicks "Run Tests" for SF-491
User B clicks "Run Tests" for SF-506 (immediately after)
  ↓
GitHub Actions queues both jobs
  ↓
GitHub checks: "Which runners are idle?"
  ↓
Both runners are idle:
  - Job 1 (SF-491) → Assigned to Runner 1 ✅
  - Job 2 (SF-506) → Assigned to Runner 2 ✅
  ↓
Both jobs run in PARALLEL 🎉
```

### Scenario 3: Three Jobs Triggered (Only 2 Runners)
```
User A clicks "Run Tests" for SF-491
User B clicks "Run Tests" for SF-506
User C clicks "Run Tests" for SF-507
  ↓
GitHub Actions queues all three jobs
  ↓
GitHub checks: "Which runners are idle?"
  ↓
Only 2 runners available:
  - Job 1 (SF-491) → Assigned to Runner 1 ✅ (runs immediately)
  - Job 2 (SF-506) → Assigned to Runner 2 ✅ (runs immediately)
  - Job 3 (SF-507) → Queued ⏳ (waits for runner to become available)
  ↓
When Runner 1 or Runner 2 finishes:
  - Job 3 (SF-507) → Assigned to available runner ✅
```

---

## Selection Algorithm

GitHub Actions uses a **simple round-robin / first-available** algorithm:

1. **Priority:** Idle runners (not busy)
2. **Selection:** First available runner that matches labels
3. **Distribution:** Automatic load balancing across all matching runners
4. **No preference:** No way to prefer one runner over another (they're equal)

**You cannot:**
- ❌ Assign a specific job to a specific runner
- ❌ Set runner priority/weight
- ❌ Reserve a runner for specific jobs

**You can:**
- ✅ Use different labels to route jobs to different runner groups
- ✅ Use `runs-on: [self-hosted, Linux]` to require multiple labels
- ✅ Use `runs-on: ubuntu-latest` to use GitHub-hosted runners instead

---

## Advanced: Using Multiple Labels

If you want to route jobs to specific runners, you can use different labels:

### Example: Separate Runners for Different Test Types

**Runner 1:**
```bash
./config.sh --labels self-hosted,Linux,X64,ui-tests
```

**Runner 2:**
```bash
./config.sh --labels self-hosted,Linux,X64,api-tests
```

**Workflow:**
```yaml
jobs:
  ui-tests:
    runs-on: [self-hosted, ui-tests]  # Only Runner 1
  
  api-tests:
    runs-on: [self-hosted, api-tests]  # Only Runner 2
```

**Current Setup:** Both runners have identical labels, so jobs are distributed randomly/round-robin.

---

## How to Verify Which Runner Was Used

### Method 1: GitHub Actions UI

1. Go to: `https://github.com/accelins/bsg-e2e-tests/actions`
2. Click on a workflow run
3. Click on the job (e.g., "test")
4. Look at the top of the job log - it shows:
   ```
   Current runner version: '2.331.0'
   Runner name: vm-p-qat-ukw-01-runner2  ← This shows which runner!
   ```

### Method 2: Add Step to Workflow

Add this step to see runner info:

```yaml
- name: Show Runner Info
  run: |
    echo "Runner name: ${{ runner.name }}"
    echo "Runner OS: ${{ runner.os }}"
    echo "Runner architecture: ${{ runner.arch }}"
```

### Method 3: Check Runner Status on VM

While a job is running:
```bash
ps aux | grep Runner.Listener
```

Shows which runner processes are active.

---

## Summary

### Current Setup
- ✅ **Workflow:** `runs-on: self-hosted`
- ✅ **Runner 1:** Labels = `self-hosted`, `Linux`, `X64`
- ✅ **Runner 2:** Labels = `self-hosted`, `Linux`, `X64`
- ✅ **Selection:** Automatic - GitHub picks any available runner
- ✅ **Distribution:** Round-robin / first-available

### How It Works
1. Job requires `self-hosted` label
2. GitHub finds all runners with `self-hosted` label
3. GitHub picks first available (idle) runner
4. If multiple jobs: Each gets assigned to different available runner
5. If all runners busy: Jobs queue and wait

### No Configuration Needed!
- ✅ No manual assignment
- ✅ No priority settings
- ✅ No special configuration
- ✅ Just works automatically! 🎉

---

## Troubleshooting

### Issue: Jobs Always Use Same Runner

**Check:**
1. Are both runners online? (GitHub Settings → Actions → Runners)
2. Are both runners idle? (Not running a job)
3. Do both have the `self-hosted` label?

**Solution:** If one runner is always busy, jobs will use the other. This is normal behavior.

### Issue: Jobs Not Running in Parallel

**Check:**
1. Are both runners online and idle?
2. Are jobs triggered at the same time? (Check timestamps)
3. Is concurrency control blocking? (Check workflow concurrency settings)

**Solution:** Make sure both runners are online and jobs are triggered simultaneously.

### Issue: Want to Route to Specific Runner

**Solution:** Use different labels for different runners, then use `runs-on: [self-hosted, specific-label]` in workflow.
