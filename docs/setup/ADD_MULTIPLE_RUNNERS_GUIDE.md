# Adding Multiple Runners to Existing VM

## Current VM Status
- ✅ **VM Size**: Standard_B8ms (8 vCPUs, 32 GB RAM)
- ✅ **Current Runners**: 1
- ✅ **Available Capacity**: Can support 4-5 runners easily
- ✅ **Recommended**: Add 2-3 more runners (total 3-4 runners)

## Progress Tracking

### Phase 1: Add Second Runner
- [x] Step 1: Switch to github-runner user
- [x] Step 2: Create second runner directory
- [x] Step 3: Download runner package
- [x] Step 4: Extract runner package
- [x] Step 5: Get registration token from GitHub
- [x] Step 6: Configure second runner
- [x] Step 7: Install as systemd service
- [x] Step 8: Start service
- [x] Step 9: Verify runner is online
- [x] Step 10: Test parallel execution (Ready to test)

---

## Step-by-Step: Add Second Runner

### Step 1: Switch to github-runner User

**Status:** [x] ✅ Complete

**Command:**
```bash
sudo su - github-runner
```

**Expected Output:**
- Prompt should change to: `github-runner@vm-p-qat-ukw-01:~$`
- You should be in the github-runner user's home directory

**Verification:**
```bash
whoami
```
Should output: `github-runner`

**✅ Confirm when done:** Type "done" or "step 1 complete"

---

### Step 2: Create Second Runner Directory

**Status:** [x] ✅ Complete

**Commands (run one at a time):**
```bash
cd ~
```

```bash
mkdir actions-runner-2
```

```bash
cd actions-runner-2
```

**Verification:**
```bash
pwd
```
Should output: `/home/github-runner/actions-runner-2`

**✅ Confirm when done:** Type "done" or "step 2 complete"

---

### Step 3: Download Runner Package

**Status:** [x] ✅ Complete

**Command:**
```bash
curl -o actions-runner-linux-x64-2.331.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.331.0/actions-runner-linux-x64-2.331.0.tar.gz
```

**Expected Output:**
- Progress bar showing download
- File should be ~50-60 MB
- No errors

**Verification:**
```bash
ls -lh actions-runner-linux-x64-2.331.0.tar.gz
```
Should show file size ~50-60 MB

**✅ Confirm when done:** Type "done" or "step 3 complete"

---

### Step 4: Extract Runner Package

**Status:** [x] ✅ Complete

**Command:**
```bash
tar xzf ./actions-runner-linux-x64-2.331.0.tar.gz
```

**Expected Output:**
- No output (silent extraction)
- Takes a few seconds

**Verification:**
```bash
ls -la
```
Should show many files including: `config.sh`, `run.sh`, `bin/`, etc.

**✅ Confirm when done:** Type "done" or "step 4 complete"

---

### Step 5: Get Registration Token from GitHub

**Status:** [x] ✅ Complete

**Manual Steps (in browser):**

1. Open: `https://github.com/accelins/bsg-e2e-tests/settings/actions/runners`
2. Click **"New self-hosted runner"** button
3. Select **Linux** and **x64**
4. Copy the **registration token** (looks like: `AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)
   - Token is shown in a code block
   - Copy the entire token

**⚠️ Important:** 
- Token expires in a few minutes
- Have it ready before Step 6
- Keep it secure (don't share)

**✅ Confirm when done:** Type "done" or "step 5 complete" (you have the token ready)

---

### Step 6: Configure Second Runner

**Status:** [x] ✅ Complete

**Command (replace `<TOKEN>` with token from Step 5):**
```bash
./config.sh --url https://github.com/accelins/bsg-e2e-tests --token <TOKEN> --name vm-p-qat-ukw-01-runner2 --labels self-hosted,Linux,X64 --work _work2
```

**Example (with actual token):**
```bash
./config.sh --url https://github.com/accelins/bsg-e2e-tests --token AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX --name vm-p-qat-ukw-01-runner2 --labels self-hosted,Linux,X64 --work _work2
```

**Expected Output:**
- Prompts for runner group (press Enter for default)
- Shows "Runner successfully added"
- Shows runner name and labels

**Important Notes:**
- Use unique name: `vm-p-qat-ukw-01-runner2`
- Use unique work directory: `_work2` (prevents conflicts)
- Same labels: `self-hosted,Linux,X64`

**Verification:**
```bash
cat .runner
```
Should show configuration file exists

**✅ Confirm when done:** Type "done" or "step 6 complete"

---

### Step 7: Install as Systemd Service

**Status:** [x] ✅ Complete

**Command:**
```bash
sudo ./svc.sh install github-runner
```

**Expected Output:**
- Shows service installation
- May ask for password (github-runner sudo password)
- Shows "Service installed successfully"

**Verification:**
```bash
sudo systemctl list-units | grep actions.runner | grep runner2
```
Should show the service listed

**✅ Confirm when done:** Type "done" or "step 7 complete"

---

### Step 8: Start Service

**Status:** [x] ✅ Complete

**Commands:**
```bash
sudo ./svc.sh start
```

**Check status:**
```bash
sudo ./svc.sh status
```

**Expected Output:**
- Service should show as "active (running)"
- Should show process ID
- Should show "Listening for Jobs"

**Verification:**
```bash
sudo systemctl status actions.runner.accelins-bsg-e2e-tests.vm-p-qat-ukw-01-runner2.service --no-pager
```
Should show service is active

**✅ Confirm when done:** Type "done" or "step 8 complete"

---

### Step 9: Verify Runner is Online

**Status:** [x] ✅ Complete

**Manual Steps (in browser):**

1. Go to: `https://github.com/accelins/bsg-e2e-tests/settings/actions/runners`
2. You should see **two runners**:
   - `vm-p-qat-ukw-01` (original) - Status: **Idle** (green)
   - `vm-p-qat-ukw-01-runner2` (new) - Status: **Idle** (green)

**Verification Commands (on VM):**
```bash
ps aux | grep Runner.Listener
```
Should show 2 processes (one per runner)

**✅ Confirm when done:** Type "done" or "step 9 complete" (both runners showing as Idle in GitHub)

---

### Step 10: Test Parallel Execution

**Status:** [ ] Not Started

**Manual Steps:**

1. **Trigger first test** from Jira:
   - Go to a Jira issue (e.g., SF-491)
   - Click "Run Tests" button
   - Note the workflow run number

2. **Immediately trigger second test** from different Jira issue:
   - Go to another Jira issue (e.g., SF-506)
   - Click "Run Tests" button
   - Note the workflow run number

3. **Check GitHub Actions:**
   - Go to: `https://github.com/accelins/bsg-e2e-tests/actions`
   - You should see **both jobs running simultaneously**
   - Both should show status: **"In progress"** at the same time
   - Both should use different runners (check the runner name in job details)

**Expected Result:**
- ✅ Both jobs run **in parallel** (not queued)
- ✅ Each job uses a different runner
- ✅ Both complete successfully

**✅ Confirm when done:** Type "done" or "step 10 complete" (both tests ran in parallel successfully)

---

## Add Third Runner (Optional)

Repeat Steps 2-7 with:
- Directory: `actions-runner-3`
- Name: `vm-p-qat-ukw-01-runner3`
- Work directory: `_work3`

---

## Add Fourth Runner (Optional)

Repeat Steps 2-7 with:
- Directory: `actions-runner-4`
- Name: `vm-p-qat-ukw-01-runner4`
- Work directory: `_work4`

---

## Verify All Runners

### Check Runner Services

```bash
# List all runner services
sudo systemctl list-units | grep actions.runner

# Check status of all
sudo systemctl status actions.runner.accelins-bsg-e2e-tests.vm-p-qat-ukw-01.service
sudo systemctl status actions.runner.accelins-bsg-e2e-tests.vm-p-qat-ukw-01-runner2.service
# ... etc
```

### Check Runner Processes

```bash
ps aux | grep Runner.Listener
```

You should see one process per runner.

### Check Runner Directories

```bash
ls -la ~/actions-runner*
```

Should show:
- `actions-runner` (original)
- `actions-runner-2` (new)
- `actions-runner-3` (if added)
- etc.

---

## Resource Monitoring

### Check Resource Usage After Adding Runners

```bash
# While tests are running
watch -n 2 'free -h && echo "---" && uptime && echo "---" && ps aux | grep Runner.Listener | wc -l'
```

### Expected Resource Usage

**Per Runner (idle):**
- CPU: < 1%
- RAM: ~150-200 MB

**Per Runner (running test):**
- CPU: 1-2 cores (depending on test)
- RAM: 2-4 GB (Playwright + Node.js + browser)

**With 4 Runners Running Tests:**
- CPU: 4-8 cores (50-100% utilization)
- RAM: 8-16 GB (well within 32 GB limit)

---

## Troubleshooting

### Issue: Runner Not Appearing in GitHub

**Check:**
1. Service is running: `sudo systemctl status actions.runner.*.service`
2. Check logs: `sudo journalctl -u actions.runner.*.service -n 50`
3. Verify token was correct
4. Check network connectivity: `curl -I https://api.github.com`

### Issue: Runner Fails to Start

**Check logs:**
```bash
sudo journalctl -u actions.runner.accelins-bsg-e2e-tests.vm-p-qat-ukw-01-runner2.service -n 100
```

**Common fixes:**
- Re-run config: `cd ~/actions-runner-2 && ./config.sh remove` then re-configure
- Check permissions: `ls -la ~/actions-runner-2`
- Check disk space: `df -h ~`

### Issue: Jobs Still Queuing

**Check:**
1. Are multiple runners online? (GitHub Settings → Actions → Runners)
2. Are all runners labeled `self-hosted`?
3. Is workflow using `runs-on: self-hosted`?
4. Check concurrency settings in workflow

---

## Maintenance

### Update All Runners

When GitHub Actions runner updates:
1. Stop all services: `sudo systemctl stop actions.runner.*.service`
2. Update each runner directory:
   ```bash
   cd ~/actions-runner
   ./run.sh stop
   # Download new version
   # Extract and replace files
   ./run.sh start
   ```
3. Repeat for each runner directory

### Remove a Runner

```bash
# Stop and remove service
cd ~/actions-runner-2
sudo ./svc.sh stop
sudo ./svc.sh uninstall

# Remove from GitHub (via web UI or config.sh remove)
./config.sh remove --token <TOKEN>

# Delete directory
cd ~
rm -rf actions-runner-2
```

---

## Summary

Your VM can easily support **4-5 runners** with current resources:
- ✅ 8 CPU cores → 4-5 parallel jobs
- ✅ 32 GB RAM → Plenty for multiple Playwright instances
- ✅ 19 GB disk → Enough for multiple workspaces

**Recommended Setup:**
- **3-4 runners** total (add 2-3 more)
- **3-4 parallel jobs** capacity
- **Cost**: No additional cost (same VM)
- **Benefit**: Multiple users can run tests simultaneously
