import fs from 'node:fs';

const fail=[];
const read=(path)=>fs.readFileSync(path,'utf8');

const tokens=JSON.parse(read('src/design-system/ndos-v1.2.tokens.json'));
const workspace=read('src/components/conversations/persistent-conversation-workspace.tsx');
const chatCss=read('src/components/conversations/conversation-workspace.module.css');
const brandRegistry=JSON.parse(read('public/brand/ndos/approved-brand-assets.json'));
const compatibilityTokens=read('src/design-system/tokens.css');
const themes=read('src/design-system/themes.css');

function assert(condition,message){if(!condition)fail.push(message)}

assert(tokens.meta?.identity_status==='FROZEN','NDOS identity must remain FROZEN.');
assert(tokens.typography?.family==='Noto Sans Arabic','Noto Sans Arabic is the only operational UI font.');
assert(workspace.includes('/brand/ndos/namaa-logo-white-transparent.png'),'Mobile dark-surface header must use the approved white Namaa logo asset.');
assert(!workspace.includes('mobileBrandLockup'),'Do not redraw Namaa with text + symbol composition.');
assert(!/filter\s*:\s*(?:brightness|invert|hue-rotate|sepia|saturate)/i.test(chatCss),'Brand assets must not be recolored with CSS filters.');
assert(chatCss.includes('.mobileBrandLogo'),'Governed mobile logo class is missing.');
assert(chatCss.includes('left:50%')&&chatCss.includes('top:50%')&&chatCss.includes('transform:translate(-50%,-50%)'),'Mobile logo must remain centered in the top app bar.');
assert(chatCss.includes('min-width:88px'),'Mobile full logo must never render below 88px.');
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
console.log('VISUAL-IDENTITY-AUTHORITY-PASS logo=official placement=centered font=NotoSansArabic colors=tokens-only');
