const fs = require('fs');
const content = fs.readFileSync('z:\\financas-app\\frontend\\src\\pages\\Dashboard.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, i) => {
  const index = line.indexOf('/');
  if (index !== -1) {
    // Check if it's a closing tag </
    if (line[index - 1] === '<') return;
    // Check if it's a self-closing tag />
    if (line[index + 1] === '>') return;
    // Check if it's a comment //
    if (line[index + 1] === '/') return;
    // Check if it's a comment /*
    if (line[index + 1] === '*') return;
    // Check if it's a division or something else
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
