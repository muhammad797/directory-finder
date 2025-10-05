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

module.exports = { findTargetDirs };