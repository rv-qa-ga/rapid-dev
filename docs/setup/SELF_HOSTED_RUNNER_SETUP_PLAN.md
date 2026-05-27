# Self-Hosted GitHub Runner Setup Plan

## Overview

This document outlines the complete plan for setting up a self-hosted GitHub Actions runner on a Linux VM in the UK South region.

## Progress Tracking

### ✅ Completed Steps
- [x] VM provisioned in UK South region
- [x] SSH access configured
- [x] System packages updated (`apt-get update && upgrade`)
- [x] github-runner user created
- [x] Passwordless sudo configured for github-runner user
- [x] Switched to github-runner user

### ✅ Phase 1 & 2 Complete
- [x] NodeSource repository added
- [x] Node.js 20.20.0 installed
- [x] npm 10.8.2 installed
- [x] System dependencies installed (Playwright browser dependencies)
- [x] GitHub Actions runner downloaded (v2.311.0, auto-updated to v2.331.0)
- [x] Runner extracted to ~/actions-runner
- [x] Runner configured with repository (accelins/bsg-e2e-tests)
- [x] Runner name: vm-p-qat-ukw-01
- [x] Runner labels: self-hosted, Linux, X64
- [x] Runner installed as systemd service
- [x] Runner service started and running
- [x] Runner connected to GitHub
- [x] Runner listening for jobs
- [x] Runner verified online in GitHub UI (Status: Idle)

### 🔄 Next Steps - Testing
- [x] Simple test workflow created (`.github/workflows/test-runner.yml`)
- [ ] Test runner with simple workflow
- [ ] Test E2E workflow with manual dispatch
- [ ] Verify test execution and artifacts
- [ ] Enable automated triggers (push, PR, schedule)
- [ ] GitHub Actions runner download and installation
- [ ] Runner configuration and registration
- [ ] Runner service setup
- [ ] Testing and verification

### ⏳ Pending Steps
- [ ] Test runner with simple workflow
- [ ] Update E2E workflow to use self-hosted runner
- [ ] Enable automated triggers (push, PR, schedule)
- [ ] Final verification and monitoring setup

### 📝 Notes & Issues
- **VM Details**: `vm-p-qat-ukw-01` in UK South region
- **User**: `github-runner` with passwordless sudo configured
- **Original User**: `ravi` (used for initial setup)
- **Repository**: `accelins/bsg-e2e-tests`
- **Node.js**: v20.20.0 installed successfully
- **npm**: v10.8.2 installed successfully
- **Runner Version**: v2.331.0 (auto-updated from v2.311.0 during first run)
- **Service Status**: Running and listening for jobs
- **Service Name**: `actions.runner.accelins-bsg-e2e-tests.vm-p-qat-ukw-01.service`
- **Issue Resolved**: Used `DEBIAN_FRONTEND=noninteractive` to avoid service restart prompts during apt-get upgrade
- **Issue Resolved**: Configured passwordless sudo for github-runner using `/etc/sudoers.d/github-runner`

## Prerequisites

### VM Requirements

- **Region**: UK South (Azure)
- **OS**: Ubuntu 20.04 LTS or 22.04 LTS (recommended)
- **VM Size**: Minimum Standard_B2s (2 vCPUs, 4 GB RAM)
  - Recommended: Standard_B4ms (4 vCPUs, 16 GB RAM) for better performance
- **Disk**: Minimum 30 GB SSD
- **Network**: 
  - Outbound internet access required
  - Port 443 (HTTPS) must be open for GitHub communication
  - Consider NSG rules if using Azure

### Access Requirements

- SSH access to the VM
- Sudo/root privileges for installation
- GitHub repository admin access (for runner registration)

## Setup Steps

### Phase 1: VM Initial Setup ✅

#### 1.1 Create and Configure VM ✅

```bash
# Connect to VM via SSH
ssh username@vm-ip-address

# Update system packages (non-interactive to avoid service restart prompts)
sudo DEBIAN_FRONTEND=noninteractive apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

# Install essential tools
sudo apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release
```

#### 1.2 Create Runner User (Recommended) ✅

```bash
# Create dedicated user for GitHub runner (no password needed - service account)
sudo useradd -m -s /bin/bash github-runner
sudo usermod -aG sudo github-runner

# Lock the account (no password login, but sudo su still works)
sudo passwd -l github-runner

# Switch to runner user (uses your current user's sudo privileges)
sudo su - github-runner
```

**Note**: The account is locked (no password), but you can still switch to it using `sudo su - github-runner` with your current user's sudo privileges. This is the recommended approach for service accounts.

#### 1.3 Install Node.js 20

```bash
# Using NodeSource repository (recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

#### 1.4 Install System Dependencies for Playwright

```bash
# Install Playwright browser dependencies
sudo apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libxshmfence1 \
    libxss1 \
    libgconf-2-4 \
    fonts-liberation \
    libappindicator3-1 \
    xdg-utils
```

### Phase 2: GitHub Actions Runner Installation ✅

**Status**: Complete - Runner online and ready

#### 2.1 Download and Install Runner

```bash
# Create directory for runner
mkdir ~/actions-runner && cd ~/actions-runner

# Download latest runner package (Linux x64)
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extract
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Note: Replace with latest version from https://github.com/actions/runner/releases
```

#### 2.2 Configure Runner

```bash
# Get runner registration token from GitHub:
# Repository → Settings → Actions → Runners → New self-hosted runner
# Copy the registration token

# Configure runner (replace TOKEN with actual token)
./config.sh --url https://github.com/YOUR-ORG/YOUR-REPO --token YOUR_TOKEN

# During configuration:
# - Runner name: e2e-automation-linux-uksouth (or your preferred name)
# - Labels: self-hosted, linux, ubuntu (or custom labels)
# - Work folder: default (~/actions-runner/_work)
```

#### 2.3 Install Runner as Service

```bash
# Install as systemd service (runs as current user)
sudo ./svc.sh install

# Start the service
sudo ./svc.sh start

# Check status
sudo ./svc.sh status

# Enable auto-start on boot
sudo systemctl enable actions.runner.*.service
```

#### 2.4 Verify Runner Registration

1. Go to GitHub repository
2. Navigate to: **Settings** → **Actions** → **Runners**
3. Verify runner appears in the list with status "Idle" or "Online"

### Phase 3: Test Runner Setup 🔄

**Status**: Ready to test

#### 3.1 Create Test Workflow

Create a simple test workflow to verify runner works:

```yaml
# .github/workflows/test-runner.yml
name: Test Runner

on:
  workflow_dispatch:

jobs:
  test:
    runs-on: self-hosted
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Test Node.js
        run: |
          node --version
          npm --version
      
      - name: Test System
        run: |
          uname -a
          df -h
          free -h
```

#### 3.2 Run Test Workflow

1. Go to **Actions** tab in GitHub
2. Select "Test Runner" workflow
3. Click "Run workflow"
4. Verify it completes successfully

### Phase 4: Configure E2E Automation Workflow ⏳

**Status**: Pending

#### 4.1 Update Workflow File

Update `.github/workflows/e2e-tests.yml`:

```yaml
jobs:
  test:
    runs-on: self-hosted  # Changed from ubuntu-latest
    timeout-minutes: 90
```

#### 4.2 Add System Dependencies Step

The workflow should include system dependency installation (in case they're missing):

```yaml
- name: Install system dependencies
  run: |
    sudo apt-get update
    sudo apt-get install -y \
      libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
      libcups2 libdrm2 libdbus-1-3 libxkbcommon0 \
      libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
      libgbm1 libasound2 libpango-1.0-0 libcairo2
```

### Phase 5: Security Configuration ⏳

**Status**: Pending

#### 5.1 Firewall Configuration

```bash
# Allow SSH (if not already configured)
sudo ufw allow 22/tcp

# GitHub Actions uses HTTPS (port 443) - should be open by default
# Verify outbound connectivity
curl -I https://github.com
```

#### 5.2 Runner Security Best Practices

- **Isolated User**: Runner runs as dedicated user (not root)
- **Limited Permissions**: Only necessary permissions for test execution
- **Network Isolation**: Consider if VM needs access to internal resources
- **Secrets Management**: Secrets are passed via GitHub Actions, not stored on VM

#### 5.3 Azure NSG Rules (if applicable)

If using Azure Network Security Groups:

```
Inbound:
- SSH (22) from your IP only

Outbound:
- HTTPS (443) to github.com
- HTTPS (443) to api.github.com
- DNS (53) to Azure DNS or public DNS
```

### Phase 6: Monitoring and Maintenance ⏳

**Status**: Pending

#### 6.1 Monitor Runner Status

```bash
# Check runner service status
sudo systemctl status actions.runner.*.service

# View runner logs
sudo journalctl -u actions.runner.*.service -f

# Check runner process
ps aux | grep Runner.Listener
```

#### 6.2 Update Runner

```bash
cd ~/actions-runner

# Stop service
sudo ./svc.sh stop

# Download latest version
# (Check https://github.com/actions/runner/releases for latest)
curl -o actions-runner-linux-x64-X.X.X.tar.gz -L https://github.com/actions/runner/releases/download/vX.X.X/actions-runner-linux-x64-X.X.X.tar.gz

# Extract
tar xzf ./actions-runner-linux-x64-X.X.X.tar.gz

# Restart service
sudo ./svc.sh start
```

#### 6.3 Cleanup Old Work Directories

```bash
# Runner stores work in ~/actions-runner/_work
# Periodically clean old runs (or configure in workflow)
cd ~/actions-runner/_work
# Remove old directories manually or via cron job
```

### Phase 7: Enable Workflow Triggers ⏳

**Status**: Pending

Once runner is tested and working:

1. Update `.github/workflows/e2e-tests.yml`
2. Uncomment workflow triggers:
   ```yaml
   on:
     push:
       branches: [ main, develop ]
     pull_request:
       branches: [ main ]
     schedule:
       - cron: '0 2 * * *'  # Nightly at 2 AM UTC
     workflow_dispatch:
   ```

## Verification Checklist

- [ ] VM created in UK South region
- [ ] SSH access configured
- [ ] Node.js 20 installed and verified
- [ ] System dependencies installed
- [ ] GitHub Actions runner downloaded and installed
- [ ] Runner registered with repository
- [ ] Runner service running and enabled
- [ ] Runner appears online in GitHub UI
- [ ] Test workflow executes successfully
- [ ] E2E workflow updated to use `self-hosted`
- [ ] Manual workflow dispatch test passes
- [ ] Secrets configured in GitHub repository
- [ ] Network connectivity verified
- [ ] Monitoring setup complete

## Troubleshooting

### Runner Not Appearing Online

```bash
# Check service status
sudo systemctl status actions.runner.*.service

# Check logs
sudo journalctl -u actions.runner.*.service -n 50

# Restart service
sudo ./svc.sh restart
```

### Runner Offline After Reboot

```bash
# Verify service is enabled
sudo systemctl is-enabled actions.runner.*.service

# If not enabled:
sudo systemctl enable actions.runner.*.service
```

### Network Connectivity Issues

```bash
# Test GitHub connectivity
curl -I https://github.com
curl -I https://api.github.com

# Check DNS resolution
nslookup github.com
```

### Permission Issues

```bash
# Ensure runner user has necessary permissions
sudo usermod -aG sudo github-runner

# Check directory permissions
ls -la ~/actions-runner
```

## Cost Considerations (Azure)

- **VM Size**: Standard_B2s (~$30/month) or Standard_B4ms (~$120/month)
- **Storage**: Standard SSD 30GB (~$3/month)
- **Network**: Egress charges apply (minimal for GitHub communication)
- **Total Estimated**: ~$35-125/month depending on VM size

## Next Steps After VM is Ready

1. **Day 1**: Complete Phase 1 (VM Setup)
2. **Day 1**: Complete Phase 2 (Runner Installation)
3. **Day 1**: Complete Phase 3 (Test Runner)
4. **Day 2**: Complete Phase 4 (Configure E2E Workflow)
5. **Day 2**: Run first E2E test via workflow_dispatch
6. **Day 3**: Enable automated triggers (push, PR, schedule)

## Support Resources

- [GitHub Actions Runner Documentation](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Runner Releases](https://github.com/actions/runner/releases)
- [Troubleshooting Guide](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/troubleshooting-self-hosted-runners)

