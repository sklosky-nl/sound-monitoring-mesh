# Security and Configuration Guide

## Sensitive Files Excluded from Git

The following files contain sensitive information and are **excluded from version control**:

### Firmware Configuration
- `firmware/sound-level-sensor/sdkconfig` - Contains WiFi credentials and server URL
  - **Template provided**: `sdkconfig.example`
  - **Action required**: Copy `sdkconfig.example` to `sdkconfig` and configure with your values

### Backend Data
- `backend/data/devices/*.json` - Device registration data (may contain MAC addresses)
- `backend/data/measurements/*.json` - Measurement data
- `backend/data/alerts/*.json` - Alert history
- `backend/data/logs/*.log` - Server logs

### Other Sensitive Files
- `.env` files - Environment variables
- `screenlog.*` - Terminal session logs

## Setup Instructions

### 1. Firmware Configuration

```bash
cd firmware/sound-level-sensor
cp sdkconfig.example sdkconfig
idf.py menuconfig
```

Navigate to "Sound Level Sensor Configuration" and set:
- WiFi SSID (your network name)
- WiFi Password
- Backend Server URL (e.g., `http://192.168.1.100:3000`)
- API Key (optional, for authentication)

### 2. Backend Configuration

The backend uses file-based storage in `backend/data/`. These directories are created automatically but excluded from git:
- `data/devices/` - Device registrations
- `data/measurements/` - Sound level measurements
- `data/alerts/` - Alert configurations and history
- `data/logs/` - Server logs

No additional configuration needed - data directories are created on first run.

### 3. Frontend Configuration

The frontend is a static site with no sensitive configuration. By default it connects to:
- API: `http://localhost:3000`

To change the API URL, use the Settings tab in the web interface.

## What's Safe to Share

✅ **Safe to commit:**
- Source code (`*.c`, `*.js`, `*.html`, `*.css`)
- Configuration templates (`sdkconfig.example`, `sdkconfig.defaults`)
- Documentation files
- Build scripts and package.json
- README and setup instructions

❌ **Never commit:**
- WiFi SSIDs and passwords
- API keys or tokens
- Server IP addresses (if internal/private)
- Device MAC addresses
- Measurement data
- Log files
- Any file listed in `.gitignore`

## Before Committing

Always run these checks:

```bash
# Check what files will be committed
git status

# Review changes
git diff

# Verify no sensitive files are staged
git diff --cached

# Check for sensitive strings
git grep -i "password\|ssid\|api.key" -- ':!.git' ':!*.md'
```

## If You Accidentally Commit Sensitive Data

If you accidentally commit sensitive information:

1. **Immediately change the credentials** (WiFi password, API keys, etc.)
2. Remove the sensitive data from git history:
   ```bash
   # For recent commits
   git reset HEAD~1
   git add .
   git commit -m "Remove sensitive data"
   
   # For older commits, use git-filter-repo or BFG Repo-Cleaner
   ```
3. Force push (if already pushed): `git push --force`
4. Rotate all exposed credentials

## Network Security Recommendations

- Use WPA3 for WiFi if possible (WPA2 minimum)
- Keep backend server on private network
- Use HTTPS/TLS for production deployments
- Implement API authentication (token-based)
- Regular security updates for ESP-IDF and Node.js dependencies
- Monitor for unusual network activity

## Questions?

See [README.md](README.md) for general setup or create an issue.
