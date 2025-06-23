#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Types and interfaces
interface PackageJson {
  version: string;
  [key: string]: any;
}

type VersionType = 'major' | 'minor' | 'patch';
type VersionBumpType = 'major' | 'minor' | 'patch';

interface VersionInfo {
  major: number;
  minor: number;
  patch: number;
}

// Version management class
class VersionManager {
  private packagePath: string;
  private changelogPath: string;

  constructor() {
    this.packagePath = path.join(process.cwd(), 'package.json');
    this.changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  }

  // Get current version from package.json
  getCurrentVersion(): string {
    const packageJson: PackageJson = JSON.parse(fs.readFileSync(this.packagePath, 'utf8'));
    return packageJson.version;
  }

  // Update version in package.json
  updateVersion(newVersion: string): void {
    const packageJson: PackageJson = JSON.parse(fs.readFileSync(this.packagePath, 'utf8'));
    packageJson.version = newVersion;
    fs.writeFileSync(this.packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ Updated version to ${newVersion}`);
  }

  // Parse version string into components
  parseVersion(version: string): VersionInfo {
    const [major, minor, patch] = version.split('.').map(Number);
    
    if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
      throw new Error(`Invalid version format: ${version}`);
    }
    
    return { major, minor, patch };
  }

  // Get git commit messages since last tag
  getCommitMessages(): string[] {
    try {
      const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
      const commits = execSync(`git log ${lastTag}..HEAD --oneline`, { encoding: 'utf8' });
      return commits.split('\n').filter(line => line.trim());
    } catch (error) {
      // No tags found, get all commits
      const commits = execSync('git log --oneline', { encoding: 'utf8' });
      return commits.split('\n').filter(line => line.trim());
    }
  }

  // Determine version bump type based on commit messages
  determineBumpType(): VersionBumpType {
    const commits = this.getCommitMessages();
    let hasBreaking = false;
    let hasFeature = false;
    let hasFix = false;

    for (const commit of commits) {
      if (commit.includes('BREAKING CHANGE') || commit.includes('!:')) {
        hasBreaking = true;
      } else if (commit.includes('feat:') || commit.includes('feature:')) {
        hasFeature = true;
      } else if (commit.includes('fix:') || commit.includes('bugfix:')) {
        hasFix = true;
      }
    }

    if (hasBreaking) return 'major';
    if (hasFeature) return 'minor';
    if (hasFix) return 'patch';
    return 'patch'; // Default to patch
  }

  // Bump version based on type
  bumpVersion(type: VersionType): string {
    const currentVersion = this.getCurrentVersion();
    const { major, minor, patch } = this.parseVersion(currentVersion);
    
    let newVersion: string;
    switch (type) {
      case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
      case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
      case 'patch':
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
      default:
        throw new Error(`Invalid version type: ${type}`);
    }

    this.updateVersion(newVersion);
    return newVersion;
  }

  // Create git tag
  createTag(version: string): void {
    try {
      execSync(`git tag -a v${version} -m "Release version ${version}"`, { stdio: 'inherit' });
      console.log(`✅ Created git tag v${version}`);
    } catch (error) {
      console.error(`❌ Failed to create git tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate version format
  validateVersion(version: string): void {
    const semverRegex = /^\d+\.\d+\.\d+$/;
    if (!semverRegex.test(version)) {
      throw new Error(`Invalid version format: ${version}. Expected format: x.y.z`);
    }
  }

  // Get version info for display
  getVersionInfo(version: string): VersionInfo {
    this.validateVersion(version);
    return this.parseVersion(version);
  }

  // Compare two versions
  compareVersions(version1: string, version2: string): number {
    const v1 = this.parseVersion(version1);
    const v2 = this.parseVersion(version2);

    if (v1.major !== v2.major) return v1.major - v2.major;
    if (v1.minor !== v2.minor) return v1.minor - v2.minor;
    return v1.patch - v2.patch;
  }

  // Check if version is newer than current
  isNewerVersion(version: string): boolean {
    const currentVersion = this.getCurrentVersion();
    return this.compareVersions(version, currentVersion) > 0;
  }
}

// CLI interface
const args = process.argv.slice(2);
const versionManager = new VersionManager();

if (args.length === 0) {
  console.log('Usage: npx tsx scripts/version.ts [command] [options]');
  console.log('');
  console.log('Commands:');
  console.log('  current                    Show current version');
  console.log('  bump [type]               Bump version (major|minor|patch)');
  console.log('  auto-bump                 Automatically determine and bump version');
  console.log('  tag [version]             Create git tag for version');
  console.log('  validate [version]        Validate version format');
  console.log('  info [version]            Show version information');
  console.log('  compare [v1] [v2]         Compare two versions');
  process.exit(1);
}

const command = args[0];

try {
  switch (command) {
    case 'current':
      console.log(versionManager.getCurrentVersion());
      break;
      
    case 'bump':
      const type = (args[1] || 'patch') as VersionType;
      if (!['major', 'minor', 'patch'].includes(type)) {
        throw new Error(`Invalid version type: ${type}. Must be major, minor, or patch`);
      }
      const newVersion = versionManager.bumpVersion(type);
      console.log(`✅ Bumped version to ${newVersion}`);
      break;
      
    case 'auto-bump':
      const bumpType = versionManager.determineBumpType();
      const autoVersion = versionManager.bumpVersion(bumpType);
      console.log(`✅ Auto-bumped version to ${autoVersion} (${bumpType})`);
      break;
      
    case 'tag':
      const version = args[1] || versionManager.getCurrentVersion();
      versionManager.validateVersion(version);
      versionManager.createTag(version);
      break;
      
    case 'validate':
      const versionToValidate = args[1];
      if (!versionToValidate) {
        throw new Error('Version to validate is required');
      }
      versionManager.validateVersion(versionToValidate);
      console.log(`✅ Version ${versionToValidate} is valid`);
      break;

    case 'info':
      const versionForInfo = args[1] || versionManager.getCurrentVersion();
      const info = versionManager.getVersionInfo(versionForInfo);
      console.log(`Version: ${versionForInfo}`);
      console.log(`Major: ${info.major}`);
      console.log(`Minor: ${info.minor}`);
      console.log(`Patch: ${info.patch}`);
      break;

    case 'compare':
      const v1 = args[1];
      const v2 = args[2];
      if (!v1 || !v2) {
        throw new Error('Two versions are required for comparison');
      }
      const comparison = versionManager.compareVersions(v1, v2);
      if (comparison > 0) {
        console.log(`${v1} is newer than ${v2}`);
      } else if (comparison < 0) {
        console.log(`${v1} is older than ${v2}`);
      } else {
        console.log(`${v1} and ${v2} are the same`);
      }
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
} catch (error) {
  console.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
} 