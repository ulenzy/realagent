import fs from 'fs';

const content = fs.readFileSync('sectionsContent.txt', 'utf8');

const m1 = content.split('className="divide-y-2 divide-zinc-200 dark:divide-zinc-800 p-4 flex flex-col gap-6"')[1]?.split('</motion.div>')[0];

const m2 = content.split('className="divide-y-2 divide-zinc-200 dark:divide-zinc-800 p-4 flex flex-col gap-6"')[2]?.split('</motion.div>')[0];

console.log("m1 found:", m1 ? "YES" : "NO");
console.log("m2 found:", m2 ? "YES" : "NO");

fs.writeFileSync('m1.txt', m1 ? m1.trim() : 'NO');
fs.writeFileSync('m2.txt', m2 ? m2.trim() : 'NO');
