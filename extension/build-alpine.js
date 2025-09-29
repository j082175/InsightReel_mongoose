// Build script to bundle Alpine.js for Chrome Extension
const fs = require('fs');
const path = require('path');

// Read Alpine.js from node_modules
const alpineJsPath = path.join(__dirname, '..', 'node_modules', 'alpinejs', 'dist', 'cdn.min.js');
const alpineJs = fs.readFileSync(alpineJsPath, 'utf8');

// Create the bundled Alpine.js file for the extension
const bundledContent = `// Alpine.js bundled for Chrome Extension
// Auto-generated - do not edit manually

${alpineJs}

// Initialize Alpine
document.addEventListener('DOMContentLoaded', () => {
  Alpine.start();
});
`;

// Write to extension popup directory
const outputPath = path.join(__dirname, 'popup', 'alpine.bundle.js');
fs.writeFileSync(outputPath, bundledContent);

console.log('✅ Alpine.js bundled successfully for Chrome Extension');
console.log(`📦 Output: ${outputPath}`);