# Self-Hosted Runner Quick Reference

## Quick Commands

### Check Runner Status

```bash
# Service status
sudo systemctl status actions.runner.*.service

# Check if running
sudo systemctl is-active actions.runner.*.service

# View logs
sudo journalctl -u actions.runner.*.service -f

# View last 50 log lines
sudo journalctl -u actions.runner.*.service -n 50
```

### Manage Runner Service

```bash
cd ~/actions-runner

# Start
sudo ./svc.sh start

# Stop
sudo ./svc.sh stop

# Restart
sudo ./svc.sh restart

# Status
sudo ./svc.sh status

# Uninstall service (keeps runner files)
sudo ./svc.sh uninstall
```

### Update Runner

```bash
cd ~/actions-runner

# Stop service
sudo ./svc.sh stop

# Download latest version (check https://github.com/actions/runner/releases)
RUNNER_VERSION="2.311.0"  # Update to latest
curl -o actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz -L \
  https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz

# Extract (overwrites existing files)
tar xzf actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz

# Restart
sudo ./svc.sh start
```

### Remove Runner

```bash
cd ~/actions-runner

# Stop and uninstall service
sudo ./svc.sh stop
sudo ./svc.sh uninstall

# Remove from GitHub (do this first in GitHub UI, or use config.sh)
./config.sh remove --token YOUR_TOKEN

# Delete files
cd ~
rm -rf ~/actions-runner
```

## Troubleshooting

### Runner Not Online

1. Check service status: `sudo systemctl status actions.runner.*.service`
2. Check logs: `sudo journalctl -u actions.runner.*.service -n 50`
3. Restart service: `sudo ./svc.sh restart`
4. Verify network: `curl -I https://github.com`

### Runner Offline After Reboot

```bash
# Check if service is enabled
sudo systemctl is-enabled actions.runner.*.service

# Enable if not
sudo systemctl enable actions.runner.*.service
```

### Permission Issues

```bash
# Check runner user
whoami

# Check directory ownership
ls -la ~/actions-runner

# Fix ownership if needed
sudo chown -R $USER:$USER ~/actions-runner
```

### Network Issues

```bash
# Test GitHub connectivity
curl -I https://github.com
curl -I https://api.github.com

# Test DNS
nslookup github.com

# Check firewall
sudo ufw status
```

## File Locations

- **Runner Directory**: `~/actions-runner`
- **Work Directory**: `~/actions-runner/_work`
- **Service Files**: `/etc/systemd/system/actions.runner.*.service`
- **Logs**: `journalctl -u actions.runner.*.service`

## GitHub UI

- **View Runners**: Repository → Settings → Actions → Runners
- **View Runner Logs**: Click on runner name → View logs
- **Remove Runner**: Click on runner → Remove

## Environment Variables

Runner inherits environment from the user running the service. To set custom environment:

1. Edit service file: `sudo systemctl edit actions.runner.*.service`
2. Add environment variables in `[Service]` section
3. Reload and restart: `sudo systemctl daemon-reload && sudo ./svc.sh restart`

## Monitoring

### Check Runner Activity

```bash
# View recent jobs
ls -lt ~/actions-runner/_work/*/ 2>/dev/null | head -10

# Check disk usage
df -h ~/actions-runner/_work

# Check process
ps aux | grep Runner.Listener
```

### Cleanup Old Work

```bash
# Remove work directories older than 7 days
find ~/actions-runner/_work -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
```

## Useful Links

- [GitHub Actions Runner Docs](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Runner Releases](https://github.com/actions/runner/releases)
- [Troubleshooting Guide](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/troubleshooting-self-hosted-runners)

