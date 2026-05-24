import fs from 'fs';
const stats = fs.statSync('./public/logo.png');
console.log('Size of logo.png:', stats.size);
