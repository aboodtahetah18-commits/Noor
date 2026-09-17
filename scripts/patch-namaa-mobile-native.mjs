import fs from 'node:fs';

const root='apps/namaa-final-ui';
function patch(path, from, to){
  const full=`${root}/${path}`;
  const before=fs.readFileSync(full,'utf8');
  if(!before.includes(from)) throw new Error(`Expected mobile target not found: ${path}`);
  fs.writeFileSync(full,before.replace(from,to),'utf8');
}

// Mobile auth is a separate composition: logo + form only. Desktop keeps the full hero.
patch(
  'src/components/AuthShell.tsx',
  '<section className="auth-hero" aria-label="نماء">',
  '<section className="auth-hero desktop-auth-hero" aria-label="نماء">',
);
patch(
  'src/components/AuthShell.tsx',
  '<section className="auth-panel">\n      <div className="auth-theme">',
  '<section className="auth-panel">\n      <div className="auth-mobile-brand mobile-native-only" aria-label="نماء">\n        <BrandLogo className="auth-mobile-logo" />\n      </div>\n      <div className="auth-theme">',
);

// Keep the existing desktop shell, but give mobile its own top identity and bottom navigation.
patch(
  'src/components/AppShell.tsx',
  '<header className="topbar">\n        <div className="topbar-start">',
  '<header className="topbar">\n        <a href="/" className="mobile-brand-link mobile-native-only" aria-label="الرئيسية">\n          <BrandLogo className="mobile-brand-logo"/>\n        </a>\n        <div className="topbar-start">',
);
patch(
  'src/components/AppShell.tsx',
  '      <div className="workspace-content">\n        {children}\n      </div>\n    </div>\n  </div>;',
  '      <div className="workspace-content">\n        {children}\n      </div>\n\n      <nav className="mobile-bottom-nav mobile-native-only" aria-label="التنقل الأساسي للجوال">\n        <a href="/" className={isActivePath(pathname,\'/\')?\'active\':\'\'} aria-current={isActivePath(pathname,\'/\')?\'page\':undefined}><Icon name="home" size={21}/><span>الرئيسية</span></a>\n        <a href="/budget" className={isActivePath(pathname,\'/budget\')?\'active\':\'\'} aria-current={isActivePath(pathname,\'/budget\')?\'page\':undefined}><Icon name="budget" size={21}/><span>الميزانية</span></a>\n        <a href="/decisions" className={isActivePath(pathname,\'/decisions\')?\'active\':\'\'} aria-current={isActivePath(pathname,\'/decisions\')?\'page\':undefined}><Icon name="decisions" size={21}/><span>القرارات</span></a>\n        <a href="/alerts" className={isActivePath(pathname,\'/alerts\')?\'active\':\'\'} aria-current={isActivePath(pathname,\'/alerts\')?\'page\':undefined}><Icon name="alerts" size={21}/><span>التنبيهات</span></a>\n        <button type="button" className={mobileMenu?\'active\':\'\'} aria-label="المزيد" aria-expanded={mobileMenu} onClick={()=>setMobileMenu(true)}><Icon name="settings" size={21}/><span>المزيد</span></button>\n      </nav>\n    </div>\n  </div>;'
);

const globalsPath=`${root}/src/app/globals.css`;
const css=fs.readFileSync(globalsPath,'utf8');
const marker='/* Namaa mobile-native experience contract */';
if(css.includes(marker)) throw new Error('Mobile-native contract unexpectedly already exists');
fs.appendFileSync(globalsPath,`\n\n${marker}\n
.mobile-native-only{display:none!important}
html,body{max-width:100%;overflow-x:clip}

@media(max-width:767px){
  .mobile-native-only{display:flex!important}

  /* Login: mobile is not a stacked desktop hero. */
  html:has(.auth-page-v2),body:has(.auth-page-v2){height:100%;min-height:100%;overflow:hidden;overscroll-behavior:none}
  .auth-page-v2{height:100dvh!important;min-height:100dvh!important;max-height:100dvh!important;display:block!important;overflow:hidden!important;background:var(--namaa-auth-panel)!important}
  .auth-page-v2 .desktop-auth-hero{display:none!important}
  .auth-page-v2 .auth-panel{width:100%!important;height:100dvh!important;min-height:100dvh!important;margin:0!important;border:0!important;border-radius:0!important;padding:max(18px,env(safe-area-inset-top)) 20px max(16px,env(safe-area-inset-bottom))!important;display:flex!important;flex-direction:column;justify-content:center;overflow:hidden!important;background:var(--namaa-auth-panel)!important}
  .auth-page-v2 .auth-mobile-brand{width:100%;align-items:center;justify-content:center;margin:0 auto clamp(14px,3.2vh,24px)}
  .auth-page-v2 .auth-mobile-logo,.auth-page-v2 .auth-mobile-logo .brand-logo{width:132px!important;max-width:132px!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important}
  .auth-page-v2 .auth-mobile-logo img{width:100%!important;height:auto!important;aspect-ratio:2/1;object-fit:contain;background:transparent!important;border:0!important;box-shadow:none!important}
  .auth-page-v2 .auth-theme{top:max(14px,env(safe-area-inset-top));inset-inline-start:16px;left:auto}
  .auth-page-v2 .auth-heading{margin-bottom:14px;padding-inline:0 48px;text-align:right}
  .auth-page-v2 .auth-heading>span{font-size:12px}.auth-page-v2 .auth-heading h2{font-size:24px;margin:2px 0 4px}.auth-page-v2 .auth-heading p{font-size:12px;line-height:1.55}
  .auth-page-v2 .auth-form{gap:10px}.auth-page-v2 .auth-field-wrap{gap:4px}.auth-page-v2 .auth-field{min-height:48px!important}.auth-page-v2 .auth-primary,.auth-page-v2 .auth-secondary{min-height:48px!important}.auth-page-v2 .auth-switch{padding-top:8px;font-size:12px}.auth-page-v2 .auth-footnote{margin-top:10px;padding-top:8px}

  /* App shell: desktop sidebar never becomes the primary mobile frame. */
  .app-shell{display:block!important;min-height:100dvh;background:var(--namaa-bg)}
  .workspace{width:100%;max-width:100%;min-width:0;min-height:100dvh;background:var(--namaa-bg)}
  .workspace-content{width:100%;max-width:100%;min-width:0;padding-bottom:calc(76px + env(safe-area-inset-bottom));overflow-x:clip}
  .topbar{height:58px!important;padding:max(6px,env(safe-area-inset-top)) 10px 6px!important;gap:8px;background:var(--namaa-surface);border-bottom:1px solid var(--namaa-border)}
  .mobile-menu-button{display:none!important}.topbar-start{display:none!important}
  .mobile-brand-link{align-items:center;text-decoration:none;margin-inline-end:auto;flex:0 0 auto}
  .mobile-brand-logo,.mobile-brand-logo .brand-logo{width:78px!important;max-width:78px!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important}
  .mobile-brand-logo img{width:100%!important;height:auto!important;aspect-ratio:2/1;object-fit:contain;background:transparent!important;border:0!important;box-shadow:none!important}
  .topbar-actions{margin-inline-start:auto;gap:6px}.topbar-actions .topbar-icon-button,.topbar-actions .theme-toggle,.topbar-actions .user-button{width:38px!important;min-width:38px!important;height:38px!important;flex-basis:38px!important}.topbar-actions .user-button-copy,.topbar-actions .user-button>.namaa-icon{display:none!important}

  .mobile-bottom-nav{position:fixed;z-index:45;inset-inline:0;bottom:0;height:calc(64px + env(safe-area-inset-bottom));padding:6px 8px max(6px,env(safe-area-inset-bottom));align-items:flex-start;justify-content:space-between;gap:2px;background:var(--namaa-surface);border-top:1px solid var(--namaa-border);box-shadow:0 -8px 24px rgba(8,40,31,.08)}
  .mobile-bottom-nav>a,.mobile-bottom-nav>button{width:20%;min-width:0;height:52px;border:0;background:transparent;color:var(--namaa-muted);text-decoration:none;border-radius:12px;padding:5px 2px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font:inherit}
  .mobile-bottom-nav span{font-size:9px;font-weight:700;line-height:1.1;white-space:nowrap}.mobile-bottom-nav .namaa-icon{color:currentColor}.mobile-bottom-nav>a.active,.mobile-bottom-nav>button.active{color:var(--namaa-green-900);background:color-mix(in srgb,var(--namaa-green-700) 9%,var(--namaa-surface))}

  /* Existing menu becomes a mobile bottom sheet, not a desktop side drawer. */
  .sidebar-backdrop{z-index:60!important;background:rgba(2,17,13,.48)!important;backdrop-filter:none!important}
  .sidebar.open{display:flex!important;position:fixed!important;z-index:61!important;right:0!important;left:0!important;top:auto!important;bottom:0!important;width:100%!important;max-width:100%!important;height:min(78dvh,680px)!important;padding:10px 16px calc(18px + env(safe-area-inset-bottom))!important;border-radius:24px 24px 0 0!important;background:var(--namaa-surface)!important;color:var(--namaa-text)!important;box-shadow:0 -24px 60px rgba(4,30,23,.22)!important;overflow:auto!important}
  .sidebar.open .brand{border-bottom:1px solid var(--namaa-border)!important}.sidebar.open .brand .brand-logo-light{display:block!important}.sidebar.open .brand .brand-logo-dark{display:none!important}.sidebar.open .brand>span,.sidebar.open .nav-section-label,.sidebar.open .sidebar-foot{color:var(--namaa-muted)!important}.sidebar.open nav{overflow:visible!important}.sidebar.open a{color:var(--namaa-text)!important;border-color:var(--namaa-border)!important;background:var(--namaa-surface-2)!important}.sidebar.open a.active{border-color:var(--namaa-green-700)!important;background:color-mix(in srgb,var(--namaa-green-700) 8%,var(--namaa-surface))!important}.sidebar.open .nav-icon-box{color:var(--namaa-green-900)!important;background:var(--namaa-control-bg)!important;border-color:var(--namaa-border)!important}

  .page,.section-card,.card,.panel,.chat-layout-refined,.analytics-grid,.advisor-grid{max-width:100%!important;min-width:0!important}
}

@media(max-width:767px) and (max-height:700px){
  .auth-page-v2 .auth-panel{justify-content:flex-start;padding-top:max(12px,env(safe-area-inset-top))!important}.auth-page-v2 .auth-mobile-brand{margin-bottom:6px}.auth-page-v2 .auth-mobile-logo,.auth-page-v2 .auth-mobile-logo .brand-logo{width:96px!important;max-width:96px!important}.auth-page-v2 .auth-heading{margin-bottom:8px}.auth-page-v2 .auth-heading p,.auth-page-v2 .auth-footnote{display:none}.auth-page-v2 .auth-form{gap:7px}
}
`,'utf8');

const appShell=fs.readFileSync(`${root}/src/components/AppShell.tsx`,'utf8');
const authShell=fs.readFileSync(`${root}/src/components/AuthShell.tsx`,'utf8');
const finalCss=fs.readFileSync(globalsPath,'utf8');
for(const [ok,message] of [
  [appShell.includes('mobile-bottom-nav'),'mobile bottom navigation is missing'],
  [authShell.includes('auth-mobile-brand'),'mobile auth brand is missing'],
  [finalCss.includes(marker),'mobile-native CSS contract is missing'],
  [finalCss.includes('height:100dvh'),'100dvh viewport lock is missing'],
]) if(!ok) throw new Error(message);

console.log('Applied Namaa mobile-native shell and auth experience patch.');
