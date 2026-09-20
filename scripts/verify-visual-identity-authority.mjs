import fs from 'node:fs';

const fail=[];
const read=(path)=>fs.readFileSync(path,'utf8');

const tokens=JSON.parse(read('src/design-system/ndos-v1.2.tokens.json'));
const workspace=read('src/components/conversations/persistent-conversation-workspace.tsx');
const chatCss=read('src/components/conversations/conversation-workspace.module.css');
const brandRegistry=JSON.parse(read('public/brand/ndos/approved-brand-assets.json'));
const compatibilityTokens=read('src/design-system/tokens.css');
const themes=read('src/design-system/themes.css');
const authShell=read('src/components/auth/public-auth-shell.tsx');
const authCss=read('src/components/auth/public-auth-shell.module.css');
const brandLogo=read('src/components/brand/brand-logo.tsx');

function assert(condition,message){if(!condition)fail.push(message)}

assert(tokens.meta?.identity_status==='FROZEN','NDOS identity must remain FROZEN.');
assert(tokens.typography?.family==='Noto Sans Arabic','Noto Sans Arabic is the only operational UI font.');
assert(workspace.includes('/brand/ndos/namaa-logo-white-transparent.png'),'Mobile dark-surface header must use the approved white Namaa logo asset.');
assert(!workspace.includes('mobileBrandLockup'),'Do not redraw Namaa with text + symbol composition.');
assert(!/filter\s*:\s*(?:brightness|invert|hue-rotate|sepia|saturate)/i.test(chatCss),'Brand assets must not be recolored with CSS filters.');
assert(chatCss.includes('.mobileBrandLogo'),'Governed mobile logo class is missing.');
assert(chatCss.includes('position:static')&&chatCss.includes('transform:none')&&chatCss.includes('.mobileAppBarPrimary{\n    direction:rtl;\n    flex-direction:row')&&chatCss.includes('.mobileAppBarActions{\n    direction:ltr'),'Mobile header must keep menu and logo together on the right, with utility actions on the far left.');
assert(chatCss.includes('min-width:88px'),'Mobile full logo must never render below 88px.');
assert(authShell.includes('styles.mobileHeroLogoLight')&&authShell.includes('styles.mobileHeroLogoDark'),'Public auth mobile hero must render explicit official light and dark logo variants.');
assert((authCss.match(/@media\(max-width:1023px\)\{/g)||[]).length===1,'Mobile auth must use exactly one unified max-width:1023px responsive source.');
assert(!authCss.includes('@media(max-width:767px){'),'Legacy max-width:767px auth source must remain removed.');
assert(!authCss.includes('@media(min-width:768px) and (max-width:1023px){'),'Legacy 768-1023px auth source must remain removed.');
assert(authCss.includes('.page,\n  :global(html[data-theme="dark"]) .shell')===false,'Dark auth selectors must stay explicit and readable.');
assert(authCss.includes(':global(html[data-theme="dark"]) .page,\n  :global(html[data-theme="dark"]) .shell,\n  :global(html[data-theme="dark"]) .mobileHero,\n  :global(html[data-theme="dark"]) .panel{\n    background:var(--ux-page-bg);'),'Dark mobile auth must use one coordinated page-wide dark surface.');
assert(authCss.includes('.mobileHeroLogoDark{display:none}')&&authCss.includes(':global(html[data-theme="dark"]) .mobileHeroLogoLight{display:none}')&&authCss.includes(':global(html[data-theme="dark"]) .mobileHeroLogoDark{display:block}'),'Public auth mobile logo must switch by CSS theme state.');
assert(authCss.includes('.mobileHero::before,\n  .mobileHero::after{')&&authCss.includes('border-radius:100% 0 100% 0')&&authCss.includes('border-radius:0 100% 0 100%'),'Mobile auth hero must retain the two-leaf identity composition.');
assert(authCss.includes('.mobileHero{\n    position:relative;')&&authCss.includes('background:var(--ux-surface-canvas);'),'Light mobile auth hero must use the governed light surface.');
assert(brandLogo.includes("const current=window.localStorage.getItem('mustaqbali-theme')")&&brandLogo.includes("if(current==='light'||current==='dark') return current"),'Brand logo must prefer the active theme key over the legacy fallback.');
assert(Array.isArray(brandRegistry.assets)||Array.isArray(brandRegistry.approved)||Object.keys(brandRegistry).length>0,'Approved brand registry must remain present.');

const legacyIdentityLiterals=['#023C6E','#0CB6E5','#021737','#07305A','#EAF7FC','#F3F8FC','"Tajawal"'];
for(const literal of legacyIdentityLiterals){
  assert(!compatibilityTokens.includes(literal),'Compatibility tokens must not contain legacy identity literal '+literal);
  assert(!themes.includes(literal),'Theme mappings must not contain legacy identity literal '+literal);
}
assert(!fs.existsSync('src/design-system/ndos-v1.1.css'),'NDOS v1.1 must not exist in runtime source.');
for(const path of [
  'public/brand/mustaqbali-logo-white.png',
  'public/brand/mustaqbali-logo-white-compact.png',
  'public/brand/mustaqbali-logo.png',
  'public/brand/namaa-logo.webp',
]){
  assert(!fs.existsSync(path),'Legacy runtime brand asset must not exist: '+path);
}

const rawHex=[...chatCss.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map(match=>match[0]);
assert(rawHex.length===0,'Conversation UI must use governed design tokens, not raw hex colors: '+rawHex.join(', '));

if(fail.length){
  console.error('VISUAL-IDENTITY-AUTHORITY-FAIL '+fail.length+' issue(s)');
  for(const item of fail) console.error('- '+item);
  process.exit(1);
}
console.log('VISUAL-IDENTITY-AUTHORITY-PASS logo=official placement=menu-adjacent-right font=NotoSansArabic colors=tokens-only');
