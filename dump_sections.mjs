import fs from 'fs';

let content = fs.readFileSync('src/components/Profile.tsx', 'utf8');

const prefStartStr = "{/* SECTION 1: PREFERENCES */}";
const endOfAcc = content.indexOf("{/* Account Deletion Overlay Modal */}");
const prefStart = content.indexOf(prefStartStr);

const sectionsContent = content.substring(prefStart, endOfAcc);
fs.writeFileSync('sectionsContent.txt', sectionsContent);
console.log('Saved to sectionsContent.txt');
