# VM Configuration Check Commands

Run these commands on your VM to check current configuration and capacity.

## 1. Check VM Size and Resources

```bash
# Check CPU cores
nproc

# Check total RAM
free -h

# Check disk space
df -h

# Check VM size (Azure-specific)
curl -s -H Metadata:true "http://169.254.169.254/metadata/instance/compute?api-version=2021-02-01" | grep -i "vmSize\|vmSizeName"

# Or check via Azure CLI (if installed)
az vm show --name vm-p-qat-ukw-01 --resource-group <your-rg> --query hardwareProfile.vmSize -o tsv
```

## 2. Check Current Resource Usage

```bash
# Current CPU and memory usage
top -bn1 | head -20

# Or use htop if available
htop

# System load average
uptime

# Memory usage details
free -h
cat /proc/meminfo | grep -E "MemTotal|MemAvailable|MemFree"

# CPU usage
mpstat 1 5  # Shows CPU usage over 5 seconds
```

## 3. Check Current Runner Status

```bash
# Check if runner service is running
sudo systemctl status actions.runner.accelins-bsg-e2e-tests.vm-p-qat-ukw-01.service

# Check runner process
ps aux | grep runner

# Check runner logs (last 50 lines)
sudo journalctl -u actions.runner.accelins-bsg-e2e-tests.vm-p-qat-ukw-01.service -n 50 --no-pager

# Check how many runner instances exist
ls -la ~/ | grep actions-runner
```

## 4. Check Disk Space for Additional Runners

```bash
# Check available disk space
df -h ~

# Check size of current runner directory
du -sh ~/actions-runner

# Estimate space needed for 2-3 more runners (each ~500MB-1GB)
echo "Current runner size:"
du -sh ~/actions-runner
echo "Estimated for 3 runners total: ~3-4GB"
```

## 5. Check System Load Capacity

```bash
# Check if system can handle more load
# Run this while a test is running to see peak usage
watch -n 1 'free -h && echo "---" && uptime && echo "---" && ps aux | grep -E "node|playwright|chrome" | head -10'
```

## 6. Check Network and Connectivity

```bash
# Check internet connectivity
ping -c 3 github.com

# Check GitHub Actions API connectivity
curl -I https://api.github.com

# Check if port 443 (HTTPS) is accessible
curl -I https://github.com
```

## 7. Summary Command (All in One)

```bash
echo "=== VM CONFIGURATION SUMMARY ==="
echo ""
echo "CPU Cores: $(nproc)"
echo ""
echo "Memory:"
free -h
echo ""
echo "Disk Space:"
df -h ~
echo ""
echo "System Load:"
uptime
echo ""
echo "Runner Status:"
sudo systemctl is-active actions.runner.accelins-bsg-e2e-tests.vm-p-qat-ukw-01.service
echo ""
echo "Runner Directory Size:"
du -sh ~/actions-runner 2>/dev/null || echo "Runner directory not found in home"
echo ""
echo "Current Processes (top 10 by CPU):"
ps aux --sort=-%cpu | head -11
```

## Expected Output Interpretation

### Good Configuration for 2 Runners:
- **CPU**: 4+ cores (nproc shows 4+)
- **RAM**: 8GB+ available (free -h shows 8G+ total)
- **Disk**: 20GB+ free space
- **Load**: < 2.0 average load (uptime)

### Current VM Size Recommendations:
- **Standard_B2s**: 2 vCPUs, 4GB RAM → **Can support 1 runner only**
- **Standard_B4ms**: 4 vCPUs, 16GB RAM → **Can support 2-3 runners**
- **Standard_B8ms**: 8 vCPUs, 32GB RAM → **Can support 4-5 runners**
