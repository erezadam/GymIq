#!/usr/bin/env node
/**
 * Auto-increment version before build
 * Updates public/version.json with new version and build time
 */

const fs = require('fs');
const path = require('path');

const versionFile = path.join(__dirname, '../public/version.json');

// Read current version
let versionData = { version: '1.0.0', buildTime: new Date().toISOString() };

try {
  if (fs.existsSync(versionFile)) {
    versionData = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
  }
} catch (e) {
  console.log('[Version] Creating new version file');
}

// Increment patch version
const parts = versionData.version.split('.');
parts[2] = String(parseInt(parts[2], 10) + 1);
const newVersion = parts.join('.');

// Update version data
versionData.version = newVersion;
versionData.buildTime = new Date().toISOString();

// Write back
fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2) + '\n');

console.log(`[Version] Updated to ${newVersion}`);

// Also update CACHE_VERSION in sw.js
const swFile = path.join(__dirname, '../public/sw.js');
try {
  if (fs.existsSync(swFile)) {
    let swContent = fs.readFileSync(swFile, 'utf8');
    // Replace CACHE_VERSION value
    swContent = swContent.replace(
      /const CACHE_VERSION = ['"]v[^'"]+['"]/,
      `const CACHE_VERSION = 'v${newVersion}'`
    );
    fs.writeFileSync(swFile, swContent);
    console.log(`[Version] Updated sw.js CACHE_VERSION to v${newVersion}`);
  }
} catch (e) {
  console.error('[Version] Failed to update sw.js:', e.message);
}
