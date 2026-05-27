# GitHub Runner Concurrency and Scaling Guide

## Current Situation

### Single Runner Limitation

**Current Setup:**
- ✅ One self-hosted runner on VM: `vm-p-qat-ukw-01`
- ✅ Jira automation triggers GitHub Actions workflows
- ✅ Multiple users can click the "Run Tests" button simultaneously

**What Happens When Multiple Users Trigger Tests:**

1. **Sequential Execution (Current Behavior)**
   - GitHub Actions queues jobs when a runner is busy
   - Only ONE job runs at a time on a single runner
   - Subsequent jobs wait in queue until the current job completes
   - **Example Timeline:**
     ```
     User A clicks at 10:00 AM → Job starts immediately
     User B clicks at 10:01 AM → Job waits in queue
     User C clicks at 10:02 AM → Job waits in queue
     
     If User A's test takes 15 minutes:
     - User A: Runs 10:00-10:15 ✅
     - User B: Waits until 10:15, then runs 10:15-10:30 ⏳
     - User C: Waits until 10:30, then runs 10:30-10:45 ⏳
     ```

2. **Potential Issues:**
   - ⚠️ **Long Wait Times**: Users may wait 15-30+ minutes for their turn
   - ⚠️ **No Priority System**: First-come-first-served only
   - ⚠️ **Resource Waste**: VM sits idle between jobs (setup/teardown time)
   - ⚠️ **User Frustration**: No visibility into queue position

---

## Solutions and Recommendations

### Option 1: Multiple Runners on Same VM (Quick Fix) ⚡

**Best for:** Small teams (2-5 concurrent users), quick implementation

**How it Works:**
- Install multiple runner instances on the same VM
- Each runner can run one job simultaneously
- GitHub automatically distributes jobs across available runners

**Implementation Steps:**

1. **Install Additional Runners:**
   ```bash
   # As github-runner user
   cd ~
   mkdir actions-runner-2
   cd actions-runner-2
   
   # Download runner (same version as first)
   curl -o actions-runner-linux-x64-2.331.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.331.0/actions-runner-linux-x64-2.331.0.tar.gz
   tar xzf ./actions-runner-linux-x64-2.331.0.tar.gz
   
   # Configure with unique name
   ./config.sh --url https://github.com/accelins/bsg-e2e-tests --token <NEW_TOKEN> --name vm-p-qat-ukw-01-runner2 --labels self-hosted,Linux,X64
   
   # Install as service
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```

2. **VM Resource Requirements:**
   - **Current VM Size**: Standard_B2s (2 vCPUs, 4 GB RAM)
   - **For 2 Runners**: Minimum Standard_B4ms (4 vCPUs, 16 GB RAM)
   - **For 3-4 Runners**: Standard_B8ms (8 vCPUs, 32 GB RAM)

3. **Pros:**
   - ✅ Quick to implement (30 minutes)
   - ✅ No workflow changes needed
   - ✅ Automatic job distribution
   - ✅ Cost-effective (one VM)

4. **Cons:**
   - ⚠️ Limited by VM resources
   - ⚠️ All runners share same VM (single point of failure)
   - ⚠️ Resource contention if too many runners

**Recommendation:** Start with 2-3 runners on a larger VM (Standard_B4ms or B8ms)

---

### Option 2: Multiple VMs with Runners (Scalable) 🚀

**Best for:** Medium to large teams (5+ concurrent users), production environments

**How it Works:**
- Provision multiple VMs (e.g., 2-4 VMs)
- Install one runner per VM
- GitHub distributes jobs across all available runners

**Implementation Steps:**

1. **Provision Additional VMs:**
   - Use same VM configuration as current (Standard_B2s or larger)
   - Same region (UK South) for consistency
   - Same network configuration

2. **Install Runner on Each VM:**
   ```bash
   # Repeat runner installation on each VM
   # Use unique runner names: vm-p-qat-ukw-02, vm-p-qat-ukw-03, etc.
   ```

3. **VM Naming Convention:**
   - `vm-p-qat-ukw-01` (existing)
   - `vm-p-qat-ukw-02` (new)
   - `vm-p-qat-ukw-03` (new)
   - etc.

4. **Pros:**
   - ✅ True parallel execution
   - ✅ Fault tolerance (one VM down doesn't stop all tests)
   - ✅ Better resource isolation
   - ✅ Scales horizontally

5. **Cons:**
   - ⚠️ Higher cost (multiple VMs)
   - ⚠️ More maintenance overhead
   - ⚠️ Requires VM provisioning process

**Recommendation:** Use this for production with 3-5 concurrent users regularly

---

### Option 3: Concurrency Limits in Workflow (Control) 🎛️

**Best for:** Preventing resource exhaustion, controlling costs

**How it Works:**
- Add `concurrency` group to workflow
- Limit how many jobs can run simultaneously
- Queue excess jobs automatically

**Implementation:**

Add to `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Automation Tests

on:
  workflow_dispatch:
    # ... existing inputs ...

# Add concurrency control
concurrency:
  group: e2e-tests-${{ github.event.inputs.work_item || 'default' }}
  cancel-in-progress: false  # Don't cancel, just queue

jobs:
  test:
    runs-on: self-hosted
    # ... rest of workflow
```

**Options:**

1. **Per Work Item Concurrency:**
   ```yaml
   concurrency:
     group: e2e-tests-${{ github.event.inputs.work_item }}
   ```
   - Same work item: Only one job runs (prevents duplicates)
   - Different work items: Can run in parallel

2. **Global Concurrency Limit:**
   ```yaml
   concurrency:
     group: e2e-tests
     limit: 3  # Max 3 jobs at once
   ```
   - Limits total concurrent jobs to 3
   - Excess jobs queue automatically

3. **Cancel In-Progress:**
   ```yaml
   concurrency:
     group: e2e-tests-${{ github.event.inputs.work_item }}
     cancel-in-progress: true  # Cancel old job if new one starts
   ```
   - If user clicks button twice, cancels first run
   - Useful for preventing duplicate runs

**Pros:**
- ✅ Prevents resource exhaustion
- ✅ Controls costs
- ✅ Prevents duplicate runs
- ✅ Works with any number of runners

**Cons:**
- ⚠️ Jobs still queue if limit reached
- ⚠️ Requires workflow changes

**Recommendation:** Always use this, even with multiple runners

---

### Option 4: Job Prioritization (Advanced) ⭐

**Best for:** Critical tests need to run first

**How it Works:**
- Use workflow labels or inputs to set priority
- Custom runner logic to prioritize jobs
- Requires custom runner implementation

**Implementation Complexity:** High (not recommended for initial setup)

---

## Recommended Approach (Combined Solution)

### Phase 1: Immediate (This Week)
1. ✅ **Add Concurrency Control** to workflow
   - Prevent duplicate runs for same work item
   - Set reasonable global limit (e.g., 2-3)

2. ✅ **Monitor Current Usage**
   - Track how many simultaneous triggers occur
   - Measure average wait times
   - Identify peak usage times

### Phase 2: Short Term (Next 2 Weeks)
1. ✅ **Upgrade VM** to Standard_B4ms (4 vCPUs, 16 GB RAM)
2. ✅ **Add 2nd Runner** on same VM
   - Total: 2 parallel jobs
   - Cost: ~$50-70/month additional

3. ✅ **Add Queue Visibility**
   - Update Jira automation to show queue status
   - Or: Add GitHub Actions status badge to Jira

### Phase 3: Long Term (Next Month)
1. ✅ **Add 2nd VM** if usage exceeds 2 concurrent jobs regularly
2. ✅ **Implement Auto-Scaling** (if using Azure VM Scale Sets)
3. ✅ **Add Monitoring Dashboard**
   - Track runner utilization
   - Track queue lengths
   - Track average wait times

---

## Implementation: Concurrency Control (Quick Win)

### Step 1: Update Workflow

Add concurrency section to `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Automation Tests

on:
  workflow_dispatch:
    inputs:
      # ... existing inputs ...

# Add this section before 'jobs:'
concurrency:
  # Group by work_item to prevent duplicate runs
  # If same work_item triggered twice, second waits for first
  group: e2e-tests-${{ github.event.inputs.work_item || github.run_id }}
  # Don't cancel in-progress jobs (queue instead)
  cancel-in-progress: false

jobs:
  test:
    runs-on: self-hosted
    # ... rest of workflow
```

### Step 2: Test Concurrency

1. Trigger test for `SF-491` from Jira
2. Immediately trigger same test again
3. Verify: Second job waits in queue
4. Verify: Both complete successfully

---

## Implementation: Multiple Runners on Same VM

### Step 1: Upgrade VM (if needed)

Check current VM size:
```bash
# On VM
free -h  # Check RAM
nproc    # Check CPU cores
```

If Standard_B2s (2 vCPUs, 4 GB):
- **Upgrade to**: Standard_B4ms (4 vCPUs, 16 GB RAM)
- **Cost increase**: ~$30-50/month

### Step 2: Install Second Runner

```bash
# SSH to VM as github-runner user
ssh github-runner@vm-p-qat-ukw-01

# Create second runner directory
cd ~
mkdir actions-runner-2
cd actions-runner-2

# Download runner
curl -o actions-runner-linux-x64-2.331.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.331.0/actions-runner-linux-x64-2.331.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.331.0.tar.gz

# Get registration token from GitHub:
# Settings → Actions → Runners → New self-hosted runner
# Copy the token

# Configure runner
./config.sh \
  --url https://github.com/accelins/bsg-e2e-tests \
  --token <REGISTRATION_TOKEN> \
  --name vm-p-qat-ukw-01-runner2 \
  --labels self-hosted,Linux,X64 \
  --work _work2

# Install as service
sudo ./svc.sh install github-runner
sudo ./svc.sh start

# Verify
sudo ./svc.sh status
```

### Step 3: Verify Both Runners Online

1. Go to: `https://github.com/accelins/bsg-e2e-tests/settings/actions/runners`
2. Verify both runners show as "Idle"
3. Trigger two tests simultaneously
4. Verify both run in parallel

---

## Monitoring and Metrics

### Key Metrics to Track

1. **Queue Length**: How many jobs waiting
2. **Average Wait Time**: Time from trigger to start
3. **Runner Utilization**: % time runners are busy
4. **Concurrent Jobs**: Peak simultaneous jobs
5. **Job Duration**: Average test execution time

### GitHub Actions Insights

View metrics at:
- `https://github.com/accelins/bsg-e2e-tests/actions`
- Click "Insights" tab
- View "Workflow runs" and "Run duration"

### Custom Monitoring (Optional)

Add workflow step to log metrics:
```yaml
- name: Log Queue Metrics
  if: always()
  run: |
    echo "Job started at: $(date)"
    echo "Work item: ${{ github.event.inputs.work_item }}"
    echo "Runner: ${{ runner.name }}"
```

---

## Cost Analysis

### Current Setup (1 Runner, 1 VM)
- **VM**: Standard_B2s (2 vCPUs, 4 GB RAM)
- **Cost**: ~$30-40/month
- **Capacity**: 1 concurrent job

### Option 1: 2 Runners, 1 VM (Upgraded)
- **VM**: Standard_B4ms (4 vCPUs, 16 GB RAM)
- **Cost**: ~$70-90/month
- **Capacity**: 2 concurrent jobs
- **Cost per job**: ~$35-45/month

### Option 2: 2 Runners, 2 VMs
- **VMs**: 2x Standard_B2s
- **Cost**: ~$60-80/month
- **Capacity**: 2 concurrent jobs
- **Cost per job**: ~$30-40/month
- **Benefit**: Better fault tolerance

### Option 3: 3 Runners, 3 VMs
- **VMs**: 3x Standard_B2s
- **Cost**: ~$90-120/month
- **Capacity**: 3 concurrent jobs
- **Cost per job**: ~$30-40/month

---

## Best Practices

### 1. Always Use Concurrency Control
- Prevents duplicate runs
- Prevents resource exhaustion
- Provides predictable behavior

### 2. Monitor Before Scaling
- Track usage for 1-2 weeks
- Identify peak times
- Measure wait times
- Scale based on data, not assumptions

### 3. Start Small, Scale Up
- Begin with 2 runners
- Monitor for 2-4 weeks
- Add more if needed
- Don't over-provision initially

### 4. Use Unique Test Data
- Each test run should use isolated data
- Avoid conflicts between parallel runs
- Use work_item in test data identifiers

### 5. Isolate Test Artifacts
- Each job uses separate workspace
- Reports stored with run number
- No file conflicts between parallel jobs

---

## Troubleshooting

### Issue: Jobs Not Running in Parallel

**Check:**
1. Are multiple runners online? (GitHub Settings → Actions → Runners)
2. Are runners labeled correctly? (`self-hosted`)
3. Is workflow using `runs-on: self-hosted`?
4. Check runner logs: `sudo journalctl -u actions.runner.*.service -f`

### Issue: Jobs Failing with Resource Errors

**Solutions:**
1. Upgrade VM size (more RAM/CPU)
2. Reduce number of runners on VM
3. Add resource limits to workflow
4. Optimize test execution (reduce parallel test threads)

### Issue: Long Queue Times

**Solutions:**
1. Add more runners (same VM or new VMs)
2. Optimize test execution time
3. Split large test suites
4. Use test filtering (run only changed tests)

---

## Summary

### Immediate Actions (Do Today)
1. ✅ Add concurrency control to workflow
2. ✅ Monitor current usage patterns
3. ✅ Document wait times and queue lengths

### Short Term (Next 2 Weeks)
1. ✅ Upgrade VM to Standard_B4ms
2. ✅ Install 2nd runner on same VM
3. ✅ Test parallel execution

### Long Term (Next Month)
1. ✅ Evaluate if 3rd runner needed
2. ✅ Consider 2nd VM for fault tolerance
3. ✅ Implement monitoring dashboard

### Expected Results
- ✅ 2-3 users can trigger tests simultaneously
- ✅ Jobs run in parallel (no waiting)
- ✅ Average wait time: < 1 minute
- ✅ Cost: ~$70-90/month (reasonable)

---

## Questions?

If you need help implementing any of these solutions, refer to:
- `docs/setup/SELF_HOSTED_RUNNER_SETUP_PLAN.md` - Runner installation
- `docs/setup/JIRA_TO_GITHUB_ACTIONS_SETUP.md` - Jira automation
- `.github/workflows/e2e-tests.yml` - Workflow configuration
