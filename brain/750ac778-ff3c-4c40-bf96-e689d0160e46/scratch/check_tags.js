const fs = require('fs');
const content = fs.readFileSync('z:\\financas-app\\frontend\\src\\pages\\Dashboard.jsx', 'utf8');

function checkJSXBalance(text) {
  const stack = [];
  const tagRegex = /<(\/?[a-zA-Z0-9\.]+)([^>]*?)>/g;
  let match;
  
  while ((match = tagRegex.exec(text)) !== null) {
    const fullTag = match[0];
    const tagName = match[1];
    const isClosing = tagName.startsWith('/');
    const isSelfClosing = fullTag.endsWith('/>');
    
    if (isSelfClosing) continue;
    
    if (isClosing) {
      const closingName = tagName.slice(1);
      if (stack.length === 0) {
        console.log(`Unmatched closing tag </${closingName}> at index ${match.index}`);
        return;
      }
      const last = stack.pop();
      if (last.name !== closingName) {
        console.log(`Mismatch: <${last.name}> opened at index ${last.index} closed by </${closingName}> at index ${match.index}`);
        return;
      }
    } else {
      stack.push({ name: tagName, index: match.index });
    }
  }
  
  if (stack.length > 0) {
    console.log('Unclosed tags:');
    stack.forEach(s => console.log(`<${s.name}> at index ${s.index}`));
  } else {
    console.log('All tags balanced!');
  }
}

checkJSXBalance(content);
