const fs = require('fs');
const content = fs.readFileSync('z:\\financas-app\\frontend\\src\\pages\\Dashboard.jsx', 'utf8');

function checkBalance(text) {
  const stack = [];
  const pairs = { '{': '}', '[': ']', '(': ')' };
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (pairs[char]) {
        stack.push({ char, line: i + 1, col: j + 1 });
      } else if (Object.values(pairs).includes(char)) {
        if (stack.length === 0) {
          console.log(`Unmatched closing ${char} at line ${i + 1}, col ${j + 1}`);
          return;
        }
        const last = stack.pop();
        if (pairs[last.char] !== char) {
          console.log(`Mismatch: ${last.char} at ${last.line}:${last.col} closed by ${char} at ${i + 1}:${j + 1}`);
          return;
        }
      }
    }
  }
  
  if (stack.length > 0) {
    console.log('Unclosed openers:');
    stack.forEach(s => console.log(`${s.char} at ${s.line}:${s.col}`));
  } else {
    console.log('All balanced!');
  }
}

checkBalance(content);
