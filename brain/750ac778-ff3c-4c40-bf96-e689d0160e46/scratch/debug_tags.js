const fs = require('fs');
const content = fs.readFileSync('z:\\financas-app\\frontend\\src\\pages\\Dashboard.jsx', 'utf8');

function debugTags(text) {
  const stack = [];
  const tagRegex = /<(\/?(?:div|Card|CardBody|KPI|KPI\.[a-zA-Z0-9\.]+))([^>]*?)>/g;
  let match;
  
  while ((match = tagRegex.exec(text)) !== null) {
    const fullTag = match[0];
    const tagName = match[1];
    const isClosing = tagName.startsWith('/');
    const isSelfClosing = fullTag.endsWith('/>');
    
    if (isSelfClosing) continue;
    
    if (isClosing) {
      const closingName = tagName.slice(1);
      const last = stack.pop();
      if (!last || last.name !== closingName) {
        const line = text.substring(0, match.index).split('\n').length;
        console.log(`ERROR at line ${line}: Unmatched closing tag ${fullTag}. Stack was: ${stack.map(s => s.name).join(', ')} (Expected closing for ${last ? last.name : 'nothing'})`);
      }
    } else {
      stack.push({ name: tagName, index: match.index });
    }
  }
}

debugTags(content);
