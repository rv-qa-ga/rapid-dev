# Self-Hosted Runner Setup Summary

## Overview

Complete setup plan and documentation for configuring a self-hosted GitHub Actions runner on a Linux VM in the UK South region.

## Documentation Created

### 1. **Main Setup Plan**
📄 `docs/setup/SELF_HOSTED_RUNNER_SETUP_PLAN.md`

Comprehensive step-by-step guide covering:
- VM prerequisites and requirements
- Complete installation process (7 phases)
- Security configuration
- Monitoring and maintenance
- Troubleshooting guide
- Cost considerations

### 2. **Quick Reference Guide**
📄 `docs/setup/RUNNER_QUICK_REFERENCE.md`

Quick command reference for:
- Managing runner service
- Updating runner
- Troubleshooting common issues
- Monitoring runner activity

### 3. **Installation Script**
📄 `scripts/setup/install-github-runner.sh`

Automated installation script that:
- Installs Node.js 20
- Installs system dependencies
- Downloads and configures GitHub Actions runner
- Sets up systemd service
- Enables auto-start on boot

### 4. **Updated Documentation**
📄 `docs/migration/GITHUB_ACTIONS_SETUP.md`

Updated with self-hosted runner information and links to setup plan.

## Workflow Configuration

### Current Status
✅ **Workflow file updated**: `.github/workflows/e2e-tests.yml`
- Configured to use `runs-on: self-hosted`
- System dependencies installation step added
- Automated triggers commented out (ready to enable after testing)

### When VM is Ready

1. **Follow Setup Plan**: Use `docs/setup/SELF_HOSTED_RUNNER_SETUP_PLAN.md`
2. **Or Run Script**: Execute `scripts/setup/install-github-runner.sh` on the VM
3. **Test Runner**: Verify runner appears online in GitHub
4. **Test Workflow**: Run manual workflow dispatch to verify
5. **Enable Triggers**: Uncomment automated triggers in workflow file

## Quick Start (Once VM is Ready)

```bash
# 1. SSH to VM
ssh username@vm-ip-address

# 2. Clone repository or copy script
git clone <repo-url>
cd E2EAutomation

# 3. Run installation script
chmod +x scripts/setup/install-github-runner.sh
./scripts/setup/install-github-runner.sh

# 4. Verify in GitHub
# Go to: Repository → Settings → Actions → Runners
# Runner should appear as "Online"
```

## VM Requirements

- **Region**: UK South (Azure)
- **OS**: Ubuntu 20.04 LTS or 22.04 LTS
- **Size**: Minimum Standard_B2s (2 vCPUs, 4 GB RAM)
- **Disk**: 30 GB SSD minimum
- **Network**: Outbound HTTPS (443) to GitHub

## Next Steps

1. ✅ **Documentation Created** - Complete setup plan ready
2. ✅ **Scripts Created** - Installation script ready
3. ✅ **Workflow Updated** - Configured for self-hosted runner
4. ⏳ **Wait for VM** - VM provisioning in UK South
5. ⏳ **Install Runner** - Follow setup plan when VM is ready
6. ⏳ **Test & Enable** - Test runner, then enable automated triggers

## Support

- **Setup Plan**: `docs/setup/SELF_HOSTED_RUNNER_SETUP_PLAN.md`
- **Quick Reference**: `docs/setup/RUNNER_QUICK_REFERENCE.md`
- **GitHub Docs**: [Self-Hosted Runners](https://docs.github.com/en/actions/hosting-your-own-runners)

