import fs from 'fs';

let content = fs.readFileSync('src/components/Profile.tsx', 'utf8');

const prefStartStr = "{/* SECTION 1: PREFERENCES */}";
const endOfAcc = content.indexOf("{/* Account Deletion Overlay Modal */}");
const prefStart = content.indexOf(prefStartStr);

const sectionsContent = content.substring(prefStart, endOfAcc);
const m1 = sectionsContent.split('className="divide-y-2 divide-zinc-200 dark:divide-zinc-800 p-4 flex flex-col gap-6"')[1]?.split('</motion.div>')[0].replace(/^>\s*/, '');
const m2 = sectionsContent.split('className="divide-y-2 divide-zinc-200 dark:divide-zinc-800 p-4 flex flex-col gap-6"')[2]?.split('</motion.div>')[0].replace(/^>\s*/, '');

if (m1 && m2) {
  content = content.replace(sectionsContent, '');

  const systemSectionFrom = `<section className="flex flex-col gap-2">
        <h3 className="text-xs font-display font-black uppercase text-zinc-400 tracking-widest pl-2">
          System
        </h3>
        <div className="brutalist-card p-2 flex flex-col divide-y-2 divide-zinc-100">
          <ListOption
            icon={<Settings size={18} />}
            label="Account Settings"
            onClick={() => handleAction("Account Settings")}
          />
          <ListOption
            icon={<HelpCircle size={18} />}
            label="Support Center"
            onClick={() => handleAction("Support Center")}
          />
          <ListOption
            icon={<LogOut size={18} className="text-red-500" />}
            label="Sign Out"
            onClick={() => handleAction("Sign Out")}
          />
        </div>
      </section>`;

  const systemSectionTo = `<section className="flex flex-col gap-2">
        <h3 className="text-xs font-display font-black uppercase text-zinc-400 tracking-widest pl-2">
          System
        </h3>
        <div className="brutalist-card p-2 flex flex-col divide-y-2 divide-zinc-100 dark:divide-zinc-800">
          <ListOption
            icon={<Sliders size={18} />}
            label="Preferences"
            onClick={() => handleAction("Preferences")}
          />
          <ListOption
            icon={<Settings size={18} />}
            label="Account Settings"
            onClick={() => handleAction("Account Settings")}
          />
          <ListOption
            icon={<HelpCircle size={18} />}
            label="Support Center"
            onClick={() => handleAction("Support Center")}
          />
          <ListOption
            icon={<LogOut size={18} className="text-red-500" />}
            label="Sign Out"
            onClick={() => handleAction("Sign Out")}
          />
        </div>
      </section>`;

  content = content.replaceAll(systemSectionFrom, systemSectionTo);

  let splitted = content.split(systemSectionTo);
  if (splitted.length > 2) {
      content = splitted.slice(0, 2).join(systemSectionTo) + splitted.slice(2).join('');
  }

  const newViews = `
          {activeView === "Preferences" && (
            <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 shadow-brutal-sm flex flex-col gap-6 p-4">
              <div className="divide-y-2 divide-zinc-200 dark:divide-zinc-800 flex flex-col gap-6">
                ${m1}
              </div>
            </div>
          )}
          {activeView === "Account Settings" && (
            <div className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 shadow-brutal-sm flex flex-col gap-6 p-4">
              <div className="divide-y-2 divide-zinc-200 dark:divide-zinc-800 flex flex-col gap-6">
                ${m2}
              </div>
            </div>
          )}
`;

  const endViewsPoint = `          {activeView === "Admin Panel" && (`;
  if (content.includes(endViewsPoint)) {
    content = content.replace(endViewsPoint, newViews + endViewsPoint);
    fs.writeFileSync('src/components/Profile.tsx', content);
    console.log('Successfully updated Profile.tsx');
  } else {
    console.log('Error: Could not find Admin Panel view point');
  }
} else {
  console.log('Error: m1 or m2 empty');
}
