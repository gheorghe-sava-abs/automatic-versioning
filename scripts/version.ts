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

  // Generate changelog entry
  generateChangelogEntry(version: string, type: string): void {
    const date = new Date().toISOString().split('T')[0];
    
    // Get commits since last tag
    let commits: string[];
    try {
      const lastTag = execSync('git describe --tags --abbrev=0 HEAD~1', { encoding: 'utf8' }).trim();
      const commitOutput = execSync(`git log --oneline --no-merges ${lastTag}..HEAD`, { encoding: 'utf8' });
      commits = commitOutput.split('\n').filter(line => line.trim());
    } catch (error) {
      // No previous tag found, get all commits
      const commitOutput = execSync('git log --oneline --no-merges', { encoding: 'utf8' });
      commits = commitOutput.split('\n').filter(line => line.trim());
    }
    
    // Categorize commits
    const features = commits.filter(commit => 
      commit.match(/(feat|feature):/i)
    ).map(commit => `- ${commit}`);
    
    const bugFixes = commits.filter(commit => 
      commit.match(/(fix|bugfix):/i)
    ).map(commit => `- ${commit}`);
    
    const otherChanges = commits.filter(commit => 
      !commit.match(/(feat|feature|fix|bugfix):/i)
    ).map(commit => `- ${commit}`);
    
    // Build changelog entry
    let entry = `\n## [v${version}] - ${date}\n\n`;
    entry += "### What's Changed\n\n";
    
    // Features section
    entry += "#### Features\n";
    if (features.length > 0) {
      entry += features.join('\n') + '\n';
    } else {
      entry += "- No new features\n";
    }
    
    // Bug fixes section
    entry += "\n#### Bug Fixes\n";
    if (bugFixes.length > 0) {
      entry += bugFixes.join('\n') + '\n';
    } else {
      entry += "- No bug fixes\n";
    }
    
    // Other changes section
    entry += "\n#### Other Changes\n";
    if (otherChanges.length > 0) {
      entry += otherChanges.join('\n') + '\n';
    } else {
      entry += "- No other changes\n";
    }
    
    entry += '\n';
    
    // Read existing changelog or create new one
    let changelog: string;
    if (fs.existsSync(this.changelogPath)) {
      changelog = fs.readFileSync(this.changelogPath, 'utf8');
    } else {
      changelog = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
    }
    
    // Insert new entry after the header
    const lines = changelog.split('\n');
    const headerEndIndex = lines.findIndex(line => line.startsWith('## '));
    const insertIndex = headerEndIndex > 0 ? headerEndIndex : lines.length;
    
    lines.splice(insertIndex, 0, entry);
    fs.writeFileSync(this.changelogPath, lines.join('\n'));
    console.log(`✅ Updated CHANGELOG.md with version ${version}`);
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
    this.generateChangelogEntry(newVersion, type);
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


  // Print notes for the latest release
  printLatestReleaseNotes(): void {
    if (!fs.existsSync(this.changelogPath)) {
      console.log('❌ No CHANGELOG.md file found');
      return;
    }

    var version = this.getCurrentVersion();

    const changelog = fs.readFileSync(this.changelogPath, 'utf8');
    const lines = changelog.split('\n');
    
    // Find the version entry for the current version
    let startIndex = -1;
    const versionPattern = new RegExp(`^## \\[v${version.replace(/\./g, '\\.')}\\]`);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(versionPattern)) {
        startIndex = i + 2;
        break;
      }
    }
    
    if (startIndex === -1) {
      console.log(`❌ No release notes found for version ${version}`);
      return;
    }
    
    // Find the end of this release entry (next version or end of file)
    let endIndex = lines.length;
    for (let i = startIndex + 1; i < lines.length; i++) {
      if (lines[i].match(/^## \[v[\d.]+\]/)) {
        endIndex = i;
        break;
      }
    }
    
    // Extract and print the release notes
    const releaseNotes = lines.slice(startIndex, endIndex).join('\n');
    console.log(releaseNotes);
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
  console.log('  notes                     Show latest release notes');
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
      
    case 'notes':
      versionManager.printLatestReleaseNotes();
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
} catch (error) {
  console.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
} 