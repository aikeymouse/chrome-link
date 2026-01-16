# ChromeLink Release Guide

This guide covers the complete release process for ChromeLink.

## Version Management

ChromeLink uses semantic versioning (MAJOR.MINOR.PATCH) synchronized across:
- `VERSION` file (source of truth)
- `extension/manifest.json`
- `native-host/package.json`

### Using version.sh

```bash
# Show current version and sync status
./install-scripts/dev/version.sh show

# Bump patch version (1.0.0 → 1.0.1)
./install-scripts/dev/version.sh bump patch

# Bump minor version (1.0.0 → 1.1.0)
./install-scripts/dev/version.sh bump minor

# Bump major version (1.0.0 → 2.0.0)
./install-scripts/dev/version.sh bump major

# Set specific version
./install-scripts/dev/version.sh set 1.2.3

# Sync all files to VERSION file
./install-scripts/dev/version.sh sync
```

## Release Process

### 1. Prepare Release

```bash
# Make sure you're on main branch with latest changes
git checkout main
git pull origin main

# Run tests
cd native-host
npm test

cd ../tests
npm test

# Check version consistency
cd ..
./install-scripts/dev/version.sh show
```

### 2. Bump Version

```bash
# Choose appropriate version bump
./install-scripts/dev/version.sh bump minor

# Or set specific version
./install-scripts/dev/version.sh set 2.0.0
```

### 3. Update Changelog (Optional)

Edit `CHANGELOG.md` or create release notes documenting:
- New features
- Bug fixes
- Breaking changes
- Migration notes

### 4. Commit and Tag

```bash
# Get the new version
VERSION=$(cat VERSION)

# Commit version changes
git add VERSION extension/manifest.json native-host/package.json
git commit -m "Bump version to $VERSION"

# Create annotated tag
git tag -a "v$VERSION" -m "Release v$VERSION"

# Push commits and tags
git push origin main
git push origin "v$VERSION"
```

### 5. Automated Release

Once you push a tag, GitHub Actions automatically:
1. Validates version consistency
2. Runs tests
3. Creates release artifacts:
   - `chromelink-extension-vX.Y.Z.zip`
   - `chromelink-native-host-vX.Y.Z.zip`
4. Generates changelog from git commits
5. Creates GitHub release with artifacts

### 6. Manual Release (if needed)

If GitHub Actions is not available:

```bash
VERSION=$(cat VERSION)

# Create extension zip
cd extension
zip -r "../chromelink-extension-v${VERSION}.zip" . \
  -x "*.DS_Store" -x "node_modules/*" -x ".git/*"
cd ..

# Create native-host zip
mkdir -p release-tmp
cp -r native-host release-tmp/
cp -r install-scripts release-tmp/
cp README.md QUICKSTART.md release-tmp/

cd release-tmp/native-host
npm ci --production
cd ..

zip -r "../chromelink-native-host-v${VERSION}.zip" . \
  -x "*.DS_Store" -x "*/.git/*"
cd ..
rm -rf release-tmp

# Create GitHub release manually
# Upload both zip files to the release
```

## Release Artifacts

### chromelink-extension-vX.Y.Z.zip

Contains:
- Extension code (`manifest.json`, popup, sidepanel, background, content scripts)
- No dependencies (pure browser extension)

### chromelink-native-host-vX.Y.Z.zip

Contains:
- `native-host/` - Server code with Node.js dependencies
  - `browser-pilot-server.js` - Main WebSocket server
  - `launch.sh` - Launch script for macOS/Linux
  - `launch.bat` - Launch script for Windows
  - `package.json` - Dependencies manifest
- `install-scripts/` - Installation and management scripts
  - `install.js` - Cross-platform Node.js installer (macOS/Linux/Windows)
  - `INSTALL.md` - Complete installation documentation
  - `dev/version.sh` - Version management (development)
- `README.md` - Documentation
- `QUICKSTART.md` - Quick start guide

## Install.js Commands

The unified Node.js installer provides several commands:

### install (default)
Install or upgrade ChromeLink native host:
```bash
node install.js
# or explicitly
node install.js install
```

### diagnose
Run comprehensive diagnostics:
```bash
node install.js diagnose
```

Checks:
- Node.js and npm versions
- Installation directory and files
- Native messaging manifest
- Windows Registry (Windows only)
- Extension ID configuration
- Launch script existence
- Server status (port 9000)
- Recent log files with location

Example output:
```
[INFO] ChromeLink - Diagnostics
==========================

System Information:
  OS: darwin
  Node.js: v22.16.0
  npm: 10.9.2

Installation Status:
  Install Dir: /Users/user/.chromelink [OK]
  Native Host: Found [OK]
  Dependencies: Installed [OK]

Native Messaging Manifest:
  Location: .../com.chromelink.extension.json [OK]
  Extension ID: abcdefghijklmnopqrstuvwxyzabcdef [OK]
  Launch Script: launch.sh
    Path: /Users/user/.chromelink/native-host/launch.sh
    Exists: [OK]

Windows Registry:  (Windows only)
  Registry Key: [OK]
    HKCU\Software\Google\Chrome\NativeMessagingHosts\com.chromelink.extension
    Path: C:\Users\user\AppData\Local\Google\Chrome\...\com.chromelink.extension.json

Server Status:
  Server Process: Running (PID: 12345) [OK]
  Port 9000: Listening [OK]

Recent Logs:
  Location: /Users/user/.chromelink/native-host/logs [OK]
  Files: 2 log file(s)
    - session-abc123-1768108888180.log (94905 bytes)
    - session-xyz789-1768109999999.log (12340 bytes)
```

### clear-logs
Clear session log files:
```bash
node install.js clear-logs
```

### update-id
Update extension ID in manifest:
```bash
node install.js update-id <32-char-extension-id>
```

### uninstall
Remove ChromeLink installation:
```bash
node install.js uninstall
```

### help
Show all available commands:
```bash
node install.js help
```

### version
Show installed version:
```bash
node install.js version
```

## Post-Release

### Verify Release

1. Check GitHub releases page
2. Download artifacts
3. Test installation on clean system:

```bash
# macOS/Linux/Windows - All platforms use the same installer
unzip chromelink-native-host-v1.0.0.zip -d chromelink
cd chromelink/install-scripts
node install.js

# Verify installation
node install.js diagnose
```

### Announce Release

Update:
- GitHub release notes
- Project README if needed
- Documentation site
- Social media/blog (if applicable)

## Troubleshooting Releases

### Version Mismatch Error

If GitHub Actions fails with version mismatch:

```bash
# Sync all versions
./install-scripts/dev/version.sh sync

# Commit and push
git add VERSION extension/manifest.json native-host/package.json
git commit -m "Sync versions"
git push
```

### Failed Workflow

1. Check Actions tab in GitHub
2. Review error logs
3. Fix issues locally
4. Delete tag: `git tag -d vX.Y.Z && git push origin :vX.Y.Z`
5. Recreate tag after fixes

### Missing Dependencies

If npm install fails during release:

```bash
cd native-host
npm ci
npm audit fix
git add package-lock.json
git commit -m "Update dependencies"
```

## Release Checklist

- [ ] All tests passing
- [ ] Version bumped appropriately
- [ ] Versions synced across files
- [ ] Changelog updated (optional)
- [ ] Changes committed
- [ ] Tag created and pushed
- [ ] GitHub Actions completed successfully
- [ ] Release artifacts available
- [ ] Installation tested with `node install.js`
- [ ] Diagnostics verified with `node install.js diagnose`
- [ ] Windows Registry support tested (Windows only)
- [ ] Launch scripts verified (launch.sh/launch.bat)
- [ ] Documentation updated

## Emergency Rollback

If a release has critical issues:

```bash
# Tag the rollback version
git tag -a "vX.Y.Z-rollback" HEAD^

# Create hotfix
./install-scripts/dev/version.sh set X.Y.Z+1
# Fix issue
git commit -am "Hotfix: description"
git tag -a "vX.Y.Z+1" -m "Hotfix release"
git push --tags
```

## Version Strategy

- **Patch (X.Y.Z)**: Bug fixes, minor improvements
- **Minor (X.Y.0)**: New features, backward compatible
- **Major (X.0.0)**: Breaking changes, major refactoring

## CI/CD Pipeline

### Trigger Methods

1. **Tag Push** (recommended):
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

2. **Manual Workflow**:
   - Go to Actions → Release ChromeLink → Run workflow
   - Enter version (without 'v' prefix)

### Pipeline Steps

1. **Checkout** - Get source code
2. **Setup** - Install Node.js 18
3. **Validate** - Check version consistency
4. **Test** - Run test suite
5. **Package Extension** - Create extension zip
6. **Package Native Host** - Create native-host zip with installer
7. **Changelog** - Generate from git history
8. **Release** - Create GitHub release with artifacts

### Workflow Files

- `.github/workflows/release.yml` - Release automation
- `install-scripts/dev/version.sh` - Version management
- `VERSION` - Source of truth for version

## Best Practices

1. **Always use install-scripts/dev/version.sh** - Don't manually edit version numbers
2. **Test before release** - Run full test suite
3. **Test on all platforms** - Verify macOS, Linux, and Windows
4. **Windows testing** - Ensure registry support works (`install.js diagnose`)
5. **Meaningful commits** - Write clear commit messages (used in changelog)
6. **Annotated tags** - Use `git tag -a` with messages
7. **Follow semver** - Stick to semantic versioning
8. **Document changes** - Keep CHANGELOG.md updated
9. **Test installation** - Verify install.js works on clean system
10. **Check diagnostics** - Run `node install.js diagnose` on each platform
11. **Backup releases** - Keep previous release artifacts

## Platform-Specific Testing

### macOS
```bash
node install.js
node install.js diagnose
# Verify:
# - Launch script: launch.sh exists and is executable
# - Manifest location: ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/
# - Install dir: ~/.chromelink/
```

### Linux
```bash
node install.js
node install.js diagnose
# Verify:
# - Launch script: launch.sh exists and is executable
# - Manifest location: ~/.config/google-chrome/NativeMessagingHosts/
# - Install dir: ~/.chromelink/
```

### Windows
```bash
node install.js
node install.js diagnose
# Verify:
# - Launch script: launch.bat exists
# - Manifest location: %LOCALAPPDATA%\Google\Chrome\User Data\NativeMessagingHosts\
# - Registry: HKCU\Software\Google\Chrome\NativeMessagingHosts\com.chromelink.extension
# - Install dir: %USERPROFILE%\.chromelink\
```

**Critical Windows Requirements:**
- Windows 11 requires BOTH manifest file AND registry entry
- Uses launch.bat (not direct node.exe command)
- Uninstall waits for processes to terminate

## Support

For release issues:
1. Check GitHub Actions logs
2. Review this guide
3. Test locally before pushing tags
4. Run `node install.js diagnose` to verify installation
5. Open issue if automated release fails
