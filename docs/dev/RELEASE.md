# ChromePilot Release Guide

This guide covers the complete release process for ChromePilot.

## Version Management

ChromePilot uses semantic versioning (MAJOR.MINOR.PATCH) synchronized across:
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
   - `chromepilot-extension-vX.Y.Z.zip`
   - `chromepilot-native-host-vX.Y.Z.zip`
4. Generates changelog from git commits
5. Creates GitHub release with artifacts

### 6. Manual Release (if needed)

If GitHub Actions is not available:

```bash
VERSION=$(cat VERSION)

# Create extension zip
cd extension
zip -r "../chromepilot-extension-v${VERSION}.zip" . \
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

zip -r "../chromepilot-native-host-v${VERSION}.zip" . \
  -x "*.DS_Store" -x "*/.git/*"
cd ..
rm -rf release-tmp

# Create GitHub release manually
# Upload both zip files to the release
```

## Release Artifacts

### chromepilot-extension-vX.Y.Z.zip

Contains:
- Extension code (`manifest.json`, popup, sidepanel, background, content scripts)
- No dependencies (pure browser extension)

### chromepilot-native-host-vX.Y.Z.zip

Contains:
- `native-host/` - Server code with dependencies
- `install-scripts/` - Installation and management scripts
  - `install.sh` - macOS/Linux installer
  - `install.bat` - Windows installer
  - `version.sh` - Version management
- `README.md` - Documentation
- `QUICKSTART.md` - Quick start guide

## Post-Release

### Verify Release

1. Check GitHub releases page
2. Download artifacts
3. Test installation on clean system:

```bash
# macOS/Linux
unzip chromepilot-native-host-v1.0.0.zip -d chromepilot
cd chromepilot
chmod +x install-scripts/install.sh
./install-scripts/install.sh

# Windows
REM Extract zip
install-scripts\install.bat
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
- [ ] Installation tested
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
   - Go to Actions → Release ChromePilot → Run workflow
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
3. **Meaningful commits** - Write clear commit messages (used in changelog)
4. **Annotated tags** - Use `git tag -a` with messages
5. **Follow semver** - Stick to semantic versioning
6. **Document changes** - Keep CHANGELOG.md updated
7. **Test installation** - Verify install scripts work
8. **Backup releases** - Keep previous release artifacts

## Support

For release issues:
1. Check GitHub Actions logs
2. Review this guide
3. Test locally before pushing tags
4. Open issue if automated release fails
