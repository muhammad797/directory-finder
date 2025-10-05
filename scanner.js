// scanner.js
const fs = require('fs');
const path = require('path');

/**
 * Recursively scans for target directories inside a given root directory,
 * without entering those target directories.
 * @param {string} rootDir
 * @param {string[]} targetDirs
 * @returns {string[]} absolute paths of matches
 */
function findTargetDirs(rootDir, targetDirs = ['node_modules', 'Pods', '.git', 'dist', 'build']) {
  const foundPaths = [];

  function scan(dir) {
    let items;
    try {
      items = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      // Skip unreadable directories
      return;
    }

    for (const item of items) {
      if (!item.isDirectory()) continue;

      const fullPath = path.join(dir, item.name);

      if (targetDirs.includes(item.name)) {
        foundPaths.push(fullPath);
        // Do NOT descend into matched directory
        continue;
      }

      // Recurse into non-matching directories
      scan(fullPath);
    }
  }

  scan(rootDir);
  return foundPaths;
}

/**
 * Recursively scans for files with specific extensions inside a given root directory.
 * Skips descending into any directory whose name is listed in excludeDirs.
 *
 * @param {string} rootDir
 * @param {string[]} extensions - e.g., ['.zip', '.rar'] or ['zip', 'rar']
 * @param {string[]} excludeDirs - directory names to skip entirely
 * @returns {string[]} absolute file paths of matches
 */
function findFilesByExtensions(
  rootDir,
  extensions = [],
  excludeDirs = ['node_modules', 'Pods', '.git', 'dist', 'build']
) {
  const normalizedExts = Array.from(new Set(
    (extensions || [])
      .map(e => String(e).trim().toLowerCase())
      .filter(Boolean)
      .map(e => (e.startsWith('.') ? e : `.${e}`))
  ));

  const results = [];

  function scan(dir) {
    let items;
    try {
      items = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (excludeDirs.includes(item.name)) {
          // skip descending into excluded directories
          continue;
        }
        scan(fullPath);
      } else if (item.isFile()) {
        if (!normalizedExts.length) continue;
        const lower = item.name.toLowerCase();
        for (const ext of normalizedExts) {
          if (lower.endsWith(ext)) {
            results.push(fullPath);
            break;
          }
        }
      }
    }
  }

  scan(rootDir);
  return results;
}

module.exports = { findTargetDirs, findFilesByExtensions };