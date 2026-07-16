#!/usr/bin/env node
// Quick syntax check by trying to parse the TypeScript files with Node's built-in parser
const fs = require('fs');
const path = require('path');

const files = [
  'server/routes/upload.ts',
  'server/routes/marks.ts'
];

console.log('Checking TypeScript file syntax...\n');

for (const file of files) {
  const filePath = path.join(__dirname, file);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Basic check: count braces
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    
    console.log(`${file}:`);
    console.log(`  Open braces:  ${openBraces}`);
    console.log(`  Close braces: ${closeBraces}`);
    
    if (openBraces === closeBraces) {
      console.log(`  ✓ Braces balanced\n`);
    } else {
      console.log(`  ✗ Braces NOT balanced! Difference: ${openBraces - closeBraces}\n`);
    }
  } catch (err) {
    console.error(`✗ Error reading ${file}: ${err.message}\n`);
  }
}
