const fs = require('fs');
const content = fs.readFileSync('z:\\financas-app\\frontend\\src\\pages\\Dashboard.jsx', 'utf8');

const index = 2010;
console.log('--- Context around index 2010 ---');
console.log(content.substring(index - 50, index + 200));

const index2 = 2179;
console.log('--- Context around index 2179 ---');
console.log(content.substring(index2 - 50, index2 + 200));
