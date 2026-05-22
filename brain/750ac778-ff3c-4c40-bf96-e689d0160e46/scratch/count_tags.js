const fs = require('fs');
const content = fs.readFileSync('z:\\financas-app\\frontend\\src\\pages\\Dashboard.jsx', 'utf8');

function countTags(text) {
  const opening = (text.match(/<div/g) || []).length;
  const closing = (text.match(/<\/div>/g) || []).length;
  console.log(`DIV: Opening: ${opening}, Closing: ${closing}`);
  
  const openingCard = (text.match(/<Card/g) || []).length;
  const closingCard = (text.match(/<\/Card>/g) || []).length;
  console.log(`Card: Opening: ${openingCard}, Closing: ${closingCard}`);
  
  const openingKPI = (text.match(/<KPI/g) || []).length;
  const closingKPI = (text.match(/<\/KPI>/g) || []).length;
  console.log(`KPI: Opening: ${openingKPI}, Closing: ${closingKPI}`);
}

countTags(content);
