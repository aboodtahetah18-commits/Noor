import fs from 'node:fs';

const requiredFiles = [
  'src/app/(protected)/conversations/page.tsx',
  'src/components/conversations/conversation-workspace.tsx',
  'src/components/conversations/conversation-workspace.module.css',
  'src/app/(protected)/desktop-top-nav.tsx',
  'src/app/(protected)/mobile-bottom-nav.tsx',
];

const errors = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) errors.push(`Missing permanent conversation file: ${file}`);
}

if (!errors.length) {
  const workspace = fs.readFileSync('src/components/conversations/conversation-workspace.tsx', 'utf8');
  const css = fs.readFileSync('src/components/conversations/conversation-workspace.module.css', 'utf8');
  const desktopNav = fs.readFileSync('src/app/(protected)/desktop-top-nav.tsx', 'utf8');
  const mobileNav = fs.readFileSync('src/app/(protected)/mobile-bottom-nav.tsx', 'utf8');
  const combined = `${workspace}\n${css}\n${desktopNav}\n${mobileNav}`;

  const requiredText = [
    'شخصية خوارزمية',
    'نماء يوصي ويتابع؛ التنفيذ المالي الخارجي يتم بواسطة المستخدم.',
    'لا تُستدعى جميع الجهات تلقائيًا.',
    'تقييم مخاطر',
    'قرار / اعتماد',
    'توصية',
    'طلب إجراء',
    '/conversations',
  ];
  for (const marker of requiredText) {
    if (!combined.includes(marker)) errors.push(`Conversation contract marker missing: ${marker}`);
  }

  if (combined.includes('apps/namaa-final-ui')) errors.push('Root conversation workspace must not reference legacy generated UI.');
  if (!css.includes('@media(max-width:767px)')) errors.push('Mobile chat-first breakpoint is missing.');
  if (!workspace.includes('setRoomsOpen(true)') || !workspace.includes('setContextOpen(true)')) errors.push('Mobile chat must expose room and context drawers from the conversation surface.');
  if (!workspace.includes('desktopRoomsVisible') || !workspace.includes('desktopContextVisible')) errors.push('Desktop rooms/context panes must remain independently hideable.');
}

if (errors.length) {
  console.error('ROOT-CONVERSATION-WORKSPACE-FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('ROOT-CONVERSATION-WORKSPACE-PASS permanent chat-first governance surface is rooted in src/.');
