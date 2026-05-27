#!/bin/bash
# GitHub Actions Runner Installation Script
# Run this script on your Linux VM to set up the self-hosted runner

set -e  # Exit on error

echo "=========================================="
echo "GitHub Actions Runner Installation Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
RUNNER_VERSION="2.311.0"  # Update to latest version from https://github.com/actions/runner/releases
RUNNER_DIR="$HOME/actions-runner"
RUNNER_USER="${SUDO_USER:-$USER}"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please do not run as root. Run as a regular user with sudo privileges."
    exit 1
fi

# Step 1: Update system packages
print_info "Step 1: Updating system packages..."
sudo DEBIAN_FRONTEND=noninteractive apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
print_success "System packages updated"

# Step 2: Install essential tools
print_info "Step 2: Installing essential tools..."
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release
print_success "Essential tools installed"

# Step 3: Install Node.js 20
print_info "Step 3: Installing Node.js 20..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_info "Node.js already installed: $NODE_VERSION"
    if [[ ! "$NODE_VERSION" =~ ^v20\. ]]; then
        print_info "Node.js version is not 20.x, installing Node.js 20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_success "Node.js installed: $NODE_VERSION"
print_success "npm installed: $NPM_VERSION"

# Step 4: Install Playwright system dependencies
print_info "Step 4: Installing Playwright system dependencies..."
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
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
print_success "Playwright dependencies installed"

# Step 5: Create runner directory
print_info "Step 5: Creating runner directory..."
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"
print_success "Runner directory created: $RUNNER_DIR"

# Step 6: Download GitHub Actions runner
print_info "Step 6: Downloading GitHub Actions runner v${RUNNER_VERSION}..."
RUNNER_URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"

if [ -f "actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" ]; then
    print_info "Runner package already downloaded, skipping..."
else
    curl -o "actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" -L "$RUNNER_URL"
    print_success "Runner downloaded"
fi

# Step 7: Extract runner
print_info "Step 7: Extracting runner package..."
if [ -d "bin" ] && [ -f "config.sh" ]; then
    print_info "Runner already extracted, skipping..."
else
    tar xzf "actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
    print_success "Runner extracted"
fi

# Step 8: Configure runner
print_info "Step 8: Runner configuration"
echo ""
echo "=========================================="
echo "Runner Configuration Required"
echo "=========================================="
echo ""
echo "To configure the runner, you need:"
echo "1. Repository URL (e.g., https://github.com/YOUR-ORG/YOUR-REPO)"
echo "2. Registration token from GitHub"
echo ""
echo "To get the registration token:"
echo "1. Go to your GitHub repository"
echo "2. Navigate to: Settings → Actions → Runners"
echo "3. Click 'New self-hosted runner'"
echo "4. Copy the registration token"
echo ""
read -p "Repository URL: " REPO_URL
read -p "Registration Token: " REGISTRATION_TOKEN

if [ -z "$REPO_URL" ] || [ -z "$REGISTRATION_TOKEN" ]; then
    print_error "Repository URL and token are required"
    exit 1
fi

print_info "Configuring runner..."
./config.sh --url "$REPO_URL" --token "$REGISTRATION_TOKEN"
print_success "Runner configured"

# Step 9: Install runner as service
print_info "Step 9: Installing runner as systemd service..."
sudo ./svc.sh install
print_success "Runner service installed"

# Step 10: Start runner service
print_info "Step 10: Starting runner service..."
sudo ./svc.sh start
print_success "Runner service started"

# Step 11: Enable auto-start on boot
print_info "Step 11: Enabling auto-start on boot..."
sudo systemctl enable actions.runner.*.service
print_success "Auto-start enabled"

# Step 12: Verify installation
print_info "Step 12: Verifying installation..."
sleep 2

if sudo systemctl is-active --quiet actions.runner.*.service; then
    print_success "Runner service is running"
else
    print_error "Runner service is not running. Check logs with: sudo journalctl -u actions.runner.*.service"
    exit 1
fi

# Final summary
echo ""
echo "=========================================="
echo "Installation Complete!"
echo "=========================================="
echo ""
echo "Runner Details:"
echo "  - Directory: $RUNNER_DIR"
echo "  - User: $RUNNER_USER"
echo "  - Service: actions.runner.*.service"
echo ""
echo "Useful Commands:"
echo "  - Check status: sudo systemctl status actions.runner.*.service"
echo "  - View logs: sudo journalctl -u actions.runner.*.service -f"
echo "  - Restart: sudo ./svc.sh restart"
echo "  - Stop: sudo ./svc.sh stop"
echo ""
echo "Next Steps:"
echo "1. Verify runner appears online in GitHub: Settings → Actions → Runners"
echo "2. Test with a simple workflow"
echo "3. Update .github/workflows/e2e-tests.yml to use 'runs-on: self-hosted'"
echo ""
print_success "Setup complete! Runner should appear online in GitHub within a few seconds."

