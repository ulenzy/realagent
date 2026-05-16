const fs = require('fs');
console.log('--- /tmp ---');
try { console.log(fs.readdirSync('/tmp').join('\n')); } catch(e){}
console.log('--- / ---');
try { console.log(fs.readdirSync('/').join('\n')); } catch(e){}
