#!/usr/bin/env node
/**
 * Auto-derive version before build (runs as `prebuild` from package.json).
 *
 * Updates public/version.json with version + buildDate + buildTime,
 * and public/sw.js CACHE_VERSION.
 *
 * Version format: v{YYYY}.{MM}.{DD}-{shortSha}
 *   - In CI: shortSha = $GITHUB_SHA[:7]
 *   - Locally: shortSha = `git rev-parse --short HEAD`, fallback "local"
 *
 * Why deterministic-from-source rather than read-and-bump:
 * the previous bump-counter approach was ephemeral in CI — every deploy from
 * the same commit produced the same v2026.04.151, because the bumped file
 * never made it back to git. Now every build produces a unique, traceable
 * version derived from the commit it was built from.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const versionFile = path.join(__dirname, '../public/version.json');
const swFile = path.join(__dirname, '../public/sw.js');

const now = new Date();
const yyyy = now.getUTCFullYear();
const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
const dd = String(now.getUTCDate()).padStart(2, '0');

let shortSha = 'local';
if (process.env.GITHUB_SHA) {
  shortSha = process.env.GITHUB_SHA.substring(0, 7);
} else {
  try {
    shortSha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    // not a git repo — keep "local"
  }
}

const newVersion = `v${yyyy}.${mm}.${dd}-${shortSha}`;
const buildDate = `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
const buildTime = now.toISOString();

const versionData = {
  version: newVersion,
  buildDate,
  environment: 'production',
  buildTime,
};

fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2) + '\n');
console.log(`[Version] ${newVersion} (buildDate: ${buildDate})`);

// Update CACHE_VERSION in sw.js. The replacement uses the full new value,
// so newVersion already begins with "v" and we don't prepend another one.
try {
  if (fs.existsSync(swFile)) {
    let swContent = fs.readFileSync(swFile, 'utf8');
    swContent = swContent.replace(
      /const CACHE_VERSION = ['"][^'"]+['"]/,
      `const CACHE_VERSION = '${newVersion}'`
    );
    fs.writeFileSync(swFile, swContent);
    console.log(`[Version] sw.js CACHE_VERSION = ${newVersion}`);
  }
} catch (e) {
  console.error('[Version] sw.js update failed:', e.message);
}
