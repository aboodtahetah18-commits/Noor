import fs from 'node:fs';

const cssFile='src/design-system/auth-mobile-viewport.css';
const layoutFile='src/app/layout.tsx';
const logoFile='src/components/brand/brand-logo.tsx';

const css=fs.readFileSync(cssFile,'utf8');
const layout=fs.readFileSync(layoutFile,'utf8');
const logo=fs.readFileSync(logoFile,'utf8');
const failures=[];
const requireText=(file,text,expected)=>{if(!text.includes(expected)) failures.push(`${file}: missing ${expected}`)};

requireText(layout,layout,"../design-system/auth-mobile-viewport.css");
requireText(css,css,'height:100dvh');
requireText(css,css,'max-height:100dvh');
requireText(css,css,'overflow:hidden');
requireText(css,css,'overscroll-behavior:none');
requireText(css,css,'.auth-visual.auth-visual-nature');
requireText(css,css,'display:none !important');
requireText(css,css,'background:transparent !important');
requireText(css,css,'aspect-ratio:2 / 1');
requireText(css,css,'env(safe-area-inset-top)');
requireText(css,css,'env(safe-area-inset-bottom)');

if(!/@media\s*\(max-width:767px\)/.test(css)) failures.push(`${cssFile}: mobile viewport rule must target approved 767px breakpoint`);
if(/(?:linear|radial|conic)-gradient\s*\(/i.test(css)) failures.push(`${cssFile}: auth viewport layer must not introduce gradients`);
if(/Tajawal/i.test(css)) failures.push(`${cssFile}: legacy font is forbidden`);

const physicalProperty=/(^|[;{}\n]\s*)(margin-left|margin-right|padding-left|padding-right|border-left|border-right|border-left-color|border-right-color|left|right)\s*:/gim;
if(physicalProperty.test(css)) failures.push(`${cssFile}: physical RTL property declaration is forbidden`);

requireText(logoFile,logo,"/brand/ndos/namaa-logo-color-transparent.png");
requireText(logoFile,logo,"/brand/ndos/namaa-logo-white-transparent.png");
requireText(logoFile,logo,'width={128}');
requireText(logoFile,logo,'height={64}');

if(failures.length){
  console.error(`AUTH-MOBILE-VIEWPORT-CONTRACT-FAIL ${failures.length} issue(s)`);
  for(const item of failures) console.error(`- ${item}`);
  process.exit(1);
}
console.log('AUTH-MOBILE-VIEWPORT-CONTRACT-PASS fixed 100dvh login viewport and transparent 2:1 Namaa logo are locked');
