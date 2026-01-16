# ChromeLink Quick Reference

## For Users

### Installation (First Time)

```bash
# Download chromelink-native-host-vX.Y.Z.zip from GitHub releases
# Extract and run:

# All platforms (macOS/Linux/Windows)
cd chromelink/install-scripts
node install.js
```

### Commands

```bash
# Install or upgrade
node install.js

# Run diagnostics (recommended if issues)
node install.js diagnose

# Clear session logs
node install.js clear-logs

# Update extension ID after loading in Chrome
node install.js update-id <32-character-extension-id>

# Uninstall
node install.js uninstall

# Show help
node install.js help

# Show version
node install.js version
```

### Troubleshooting

1. **Extension not connecting?**
   ```bash
   ./install-scripts/install.sh diagnose
   # Choose 'y' for auto-fix
   ```

2. **Wrong extension ID?**
   ```bash
   # Get ID from chrome://extensions/
   ./install-scripts/install.sh update-id <your-actual-id>
   ```

3. **Server not starting?**
   ```bash
   ./install-scripts/install.sh diagnose
   # Checks: Node.js, port 9000, dependencies
   ```

## For Developers

### Version Management

```bash
# Show current version
./install-scripts/dev/version.sh show

# Bump version (auto-updates all files)
./install-scripts/dev/version.sh bump patch  # 1.0.0 → 1.0.1
./install-scripts/dev/version.sh bump minor  # 1.0.0 → 1.1.0
./install-scripts/dev/version.sh bump major  # 1.0.0 → 2.0.0

# Set specific version
./install-scripts/dev/version.sh set 2.0.0
```

### Release Process

```bash
# 1. Bump version
./install-scripts/dev/version.sh bump minor

# 2. Commit and tag
VERSION=$(cat VERSION)
git add VERSION extension/manifest.json native-host/package.json
git commit -m "Bump version to $VERSION"
git tag -a "v$VERSION" -m "Release v$VERSION"

# 3. Push (triggers automated release)
git push origin main
git push origin "v$VERSION"

# GitHub Actions will:
# - Validate versions
# - Run tests
# - Create zip files
# - Generate changelog
# - Create release
```

### Testing

```bash
# Run unit tests
cd native-host && npm test

# Run integration tests
cd tests && npm test

# Run UI tests
cd tests && npm run test:ui

# Run all tests
npm run test:all
```

## Key Files

```
ChromeLink/
├── VERSION                      # Source of truth for version
├── docs/
│   └── dev/
│       ├── RELEASE.md                   # Release guide
│       ├── IMPLEMENTATION_SUMMARY.md    # Implementation details
│       └── QUICK_REFERENCE.md           # Quick reference
├── extension/
│   ├── manifest.json           # Extension config (version synced)
│   ├── background/             # Service worker
│   ├── sidepanel/              # Side panel UI
│   └── content/                # Content scripts
├── native-host/
│   ├── package.json            # Server config (version synced)
│   └── browser-link-server.js # WebSocket server
└── install-scripts/
    ├── install.sh              # macOS/Linux installer
    ├── install.bat             # Windows installer
    └── dev/
        └── version.sh          # Version management
```

## Installation Locations

**macOS/Linux:**
- Installation: `~/.chromelink/`
- Manifest: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`

**Windows:**
- Installation: `%LOCALAPPDATA%\ChromeLink\`
- Manifest: `%LOCALAPPDATA%\Google\Chrome\User Data\NativeMessagingHosts\`

## Common Issues

| Issue | Solution |
|-------|----------|
| "Node.js not found" | Install from https://nodejs.org/ |
| "Port 9000 in use" | Run `install.sh diagnose` and choose auto-fix |
| "Extension not connecting" | Check extension ID: `install.sh update-id <id>` |
| "Installation failed" | Check logs: `tail ~/.chromelink/native-host/logs/*.log` |
| "Version mismatch" | Run `./install-scripts/dev/version.sh sync` |

## Quick Commands Reference

| Action | macOS/Linux | Windows |
|--------|-------------|---------|
| Install | `./install-scripts/install.sh` | `install-scripts\install.bat` |
| Upgrade | `./install-scripts/install.sh upgrade` | `install-scripts\install.bat upgrade` |
| Diagnose | `./install-scripts/install.sh diagnose` | `install-scripts\install.bat diagnose` |
| Update ID | `./install-scripts/install.sh update-id <id>` | `install-scripts\install.bat update-id <id>` |
| Uninstall | `./install-scripts/install.sh uninstall` | `install-scripts\install.bat uninstall` |
| Bump version | `./install-scripts/dev/version.sh bump patch` | N/A |
| Show version | `./install-scripts/dev/version.sh show` | N/A |

## Extension Setup Steps

1. Install native host (see Installation above)
2. Download `chromelink-extension-vX.Y.Z.zip`
3. Extract zip file
4. Open `chrome://extensions/`
5. Enable "Developer mode"
6. Click "Load unpacked"
7. Select extracted extension folder
8. Copy extension ID
9. Run: `./install-scripts/install.sh update-id <extension-id>`
10. Restart Chrome

## Automated Release (GitHub Actions)

**Triggers:**
- Push tag: `git push origin v1.0.0`
- Manual: Actions → Release ChromeLink → Run workflow

**Artifacts:**
- `chromelink-extension-vX.Y.Z.zip` - Extension only
- `chromelink-native-host-vX.Y.Z.zip` - Server + installers

## Support

- **Issues**: GitHub Issues
- **Logs**: `~/.chromelink/native-host/logs/`
- **Diagnostics**: `./install-scripts/install.sh diagnose`
