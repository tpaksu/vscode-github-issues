const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '..', 'package.json');
const package = require(packagePath);

// Increment patch version
const version = package.version.split('.');
version[2] = parseInt(version[2]) + 1;
package.version = version.join('.');

// Write back to package.json
fs.writeFileSync(packagePath, JSON.stringify(package, null, 2) + '\n');
console.log(`Version bumped to ${package.version}`);
