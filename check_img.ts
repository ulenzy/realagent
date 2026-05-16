import fs from 'fs';
const bytes = fs.readFileSync('src/assets/images/regenerated_image_1778928319302.png');
console.log(bytes.slice(0, 20).toString('hex'));
