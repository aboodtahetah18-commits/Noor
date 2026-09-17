import fs from 'node:fs';

const root='apps/namaa-final-ui';
const required=[
  `${root}/src/components/AppShell.tsx`,
  `${root}/src/components/AuthShell.tsx`,
  `${root}/src/app/globals.css`,
];
for(const file of required){
  if(!fs.existsSync(file)) throw new Error(`Missing materialized mobile target: ${file}`);
}

const appShell=fs.readFileSync(required[0],'utf8');
const authShell=fs.readFileSync(required[1],'utf8');
const css=fs.readFileSync(required[2],'utf8');

const checks=[
  [appShell.includes('mobile-bottom-nav'),'mobile bottom navigation is missing'],
  [appShell.includes('mobile-nav-sheet'),'mobile navigation sheet is missing'],
  [appShell.includes('desktop-sidebar'),'desktop sidebar separation is missing'],
  [authShell.includes('auth-mobile-brand'),'mobile auth brand header is missing'],
  [css.includes('/* Namaa mobile-native experience contract */'),'mobile-native CSS contract is missing'],
  [css.includes('height: 100dvh'),'100dvh mobile viewport contract is missing'],
  [css.includes('overflow-x: clip'),'horizontal overflow guard is missing'],
  [css.includes('.desktop-sidebar'),'desktop sidebar mobile isolation rule is missing'],
  [css.includes('.mobile-bottom-nav'),'mobile bottom navigation CSS is missing'],
];
for(const [ok,message] of checks){
  if(!ok) throw new Error(message);
}

console.log('Namaa mobile-native experience contract: OK');
