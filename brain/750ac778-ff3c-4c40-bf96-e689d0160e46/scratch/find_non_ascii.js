const fs = require('fs');
const content = fs.readFileSync('z:\\financas-app\\frontend\\src\\pages\\Dashboard.jsx', 'utf8');

for (let i = 0; i < content.length; i++) {
  if (content.charCodeAt(i) > 127) {
    console.log(`Non-ASCII character at index ${i}: ${content[i]} (code: ${content.charCodeAt(i)})`);
  }
}
