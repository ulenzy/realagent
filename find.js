const fs = require('fs');
const path = require('path');

function findPngs(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules') continue;
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findPngs(fullPath);
    } else if (file.endsWith('.png')) {
      console.log(fullPath);
    }
  }
}

findPngs('.');
