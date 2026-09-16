import fs from 'node:fs';

const root='apps/namaa-final-ui';
function patch(path, from, to){
  const full=`${root}/${path}`;
  const before=fs.readFileSync(full,'utf8');
  if(!before.includes(from)) throw new Error(`Expected compatibility target not found: ${path}`);
  fs.writeFileSync(full,before.replace(from,to),'utf8');
}

// Compatibility-only fixes. They do not change financial logic, execution semantics, RLS, or runtime data.
patch(
  'src/app/agents/page.tsx',
  '<AgentDirectory agents={agents}/>',
  '<AgentDirectory agents={agents as any}/>',
);
patch(
  'src/components/ConversationWorkspace.tsx',
  'const [threadId,setThreadId]=useState(initialThreadId??initialThreads[0]?.id??null);',
  'const [threadId,setThreadId]=useState<string|null>(initialThreadId??initialThreads[0]?.id??null);',
);
patch(
  'src/app/signup/page.tsx',
  "import { getRegistrationAvailability } from '@/lib/auth/registration-status';\n",
  "import { getRegistrationAvailability } from '@/lib/auth/registration-status';\n\nexport const dynamic = 'force-dynamic';\n",
);

// Enforce the approved transparent Namaa logo assets and bust stale browser/CDN copies.
// Intrinsic dimensions match the approved 1774x887 raster ratio to avoid crop/stretch artifacts.
fs.writeFileSync(
  `${root}/src/components/BrandLogo.tsx`,
  `export function BrandLogo({className=''}:{className?:string}) {\n  return <span className={\`brand-logo \${className}\`.trim()} aria-label="نماء">\n    <img\n      className="brand-logo-light"\n      src="/brand/namaa-logo-color-transparent.png?v=approved-20260916"\n      width="1774"\n      height="887"\n      alt="نماء"\n      decoding="async"\n      draggable="false"\n    />\n    <img\n      className="brand-logo-dark"\n      src="/brand/namaa-logo-white-transparent.png?v=approved-20260916"\n      width="1774"\n      height="887"\n      alt=""\n      aria-hidden="true"\n      decoding="async"\n      draggable="false"\n    />\n  </span>;\n}\n`,
  'utf8',
);

const identityCss = `

/* =========================================================
   Approved identity + mobile balance hardening — 2026-09-16
   Visual-only. Keeps Mobile Chat-first and all financial/runtime rules intact.
   ========================================================= */

/* The approved logo files are transparent artwork, never a card/screenshot. */
.brand-logo{
  display:inline-grid!important;
  position:relative!important;
  place-items:center!important;
  line-height:0!important;
  aspect-ratio:1774/887!important;
  overflow:visible!important;
  isolation:isolate;
  background:none!important;
  border:0!important;
  border-radius:0!important;
  box-shadow:none!important;
  padding:0!important;
}
.brand-logo img{
  grid-area:1/1!important;
  display:block!important;
  width:100%!important;
  height:auto!important;
  max-height:none!important;
  object-fit:contain!important;
  object-position:center!important;
  background:transparent!important;
  border:0!important;
  border-radius:0!important;
  box-shadow:none!important;
  clip-path:none!important;
  margin:0!important;
  padding:0!important;
}
.auth-logo-stage,.brand-home-link,.brand{overflow:visible!important}
.auth-logo-stage{background:transparent!important}

/* Give form controls and cards a clearer visual hierarchy without changing behavior. */
.auth-page-v2 .auth-field,
.app-shell input:not([type="checkbox"]):not([type="radio"]),
.app-shell select,
.app-shell textarea{
  border-width:1.5px!important;
  box-shadow:0 1px 0 rgba(11,107,79,.03),0 5px 16px rgba(11,31,58,.035);
}
.auth-page-v2 .auth-field:focus-within,
.app-shell input:not([type="checkbox"]):not([type="radio"]):focus,
.app-shell select:focus,
.app-shell textarea:focus{
  box-shadow:0 0 0 4px color-mix(in srgb,var(--namaa-green-700) 16%,transparent),0 7px 20px rgba(11,31,58,.06)!important;
}
.metric-card,.section-card,.settings-card,.report-card,.context-card,.chat-card,.draft-review,.file-row,.system-state{
  box-shadow:0 8px 24px rgba(11,31,58,.045);
}

/* Mobile auth is a single balanced viewport, not a vertically drifting page. */
@media(max-width:900px){
  html,body{min-height:100%;}
  .auth-page-v2{
    height:100dvh;
    min-height:100svh;
    display:grid!important;
    grid-template-rows:auto minmax(0,1fr)!important;
    overflow:hidden!important;
    background:var(--namaa-bg)!important;
  }
  .auth-page-v2 .auth-hero{
    min-height:0!important;
    padding:14px 20px 24px!important;
    justify-content:flex-start!important;
  }
  .auth-page-v2 .auth-logo-stage{
    min-height:0!important;
    margin:0 0 4px!important;
    justify-content:flex-start!important;
  }
  .auth-page-v2 .auth-logo{
    width:116px!important;
    max-width:116px!important;
  }
  .auth-page-v2 .auth-hero-copy{
    margin:0!important;
    max-width:none!important;
  }
  .auth-page-v2 .auth-kicker{font-size:11px!important;line-height:1.3!important}
  .auth-page-v2 .auth-hero h1{
    margin:3px 0 0!important;
    font-size:21px!important;
    line-height:1.35!important;
  }
  .auth-page-v2 .auth-hero p,.auth-page-v2 .auth-arches{display:none!important}
  .auth-page-v2 .auth-panel{
    align-self:stretch!important;
    width:calc(100% - 24px)!important;
    max-width:520px!important;
    min-height:0!important;
    margin:-10px auto 12px!important;
    padding:16px 16px 14px!important;
    border:1.5px solid var(--namaa-border-strong)!important;
    border-radius:22px!important;
    box-shadow:0 18px 44px rgba(11,31,58,.14)!important;
    overflow:auto!important;
    overscroll-behavior:contain;
    scrollbar-width:none;
  }
  .auth-page-v2 .auth-panel::-webkit-scrollbar{display:none}
  .auth-page-v2 .auth-heading{margin-bottom:13px!important}
  .auth-page-v2 .auth-heading>span{font-size:11px!important}
  .auth-page-v2 .auth-heading h2{font-size:22px!important;margin:3px 0 4px!important}
  .auth-page-v2 .auth-heading p{font-size:12px!important;line-height:1.55!important;margin:0!important}
  .auth-page-v2 .auth-form{gap:10px!important}
  .auth-page-v2 .auth-field{min-height:48px!important;border-radius:12px!important}
  .auth-page-v2 .auth-field-icon{min-width:46px!important}
  .auth-page-v2 .auth-field-action,.auth-page-v2 .field-action-button{min-width:46px!important;width:46px!important}
  .auth-page-v2 .auth-primary,.auth-page-v2 .auth-secondary{min-height:49px!important;border-radius:12px!important}
  .auth-page-v2 .auth-inline{min-height:20px!important}
  .auth-page-v2 .auth-switch{padding-top:10px!important;margin-top:0!important;font-size:12px!important}
  .auth-page-v2 .auth-footnote{margin-top:10px!important;padding-top:9px!important;font-size:10px!important}
  .auth-page-v2 .auth-theme{top:12px!important;left:12px!important}

  /* Reachable mobile workspaces keep consistent spacing and stronger surfaces. */
  .page.allow-mobile-workspace{padding:12px 12px 88px!important}
  .metric-card,.section-card,.settings-card,.report-card,.context-card,.chat-card,.draft-review,.file-row,.system-state{
    border-width:1.25px!important;
    border-radius:15px!important;
  }
}

@media(max-width:420px){
  .auth-page-v2 .auth-hero{padding:10px 16px 20px!important}
  .auth-page-v2 .auth-logo{width:102px!important;max-width:102px!important}
  .auth-page-v2 .auth-hero h1{font-size:19px!important}
  .auth-page-v2 .auth-panel{
    width:calc(100% - 16px)!important;
    margin:-8px auto 8px!important;
    padding:13px 13px 11px!important;
    border-radius:18px!important;
  }
  .auth-page-v2 .auth-heading{margin-bottom:10px!important}
  .auth-page-v2 .auth-heading h2{font-size:20px!important}
  .auth-page-v2 .auth-field{min-height:46px!important}
  .auth-page-v2 .auth-primary,.auth-page-v2 .auth-secondary{min-height:47px!important}
}
`;

const cssPath=`${root}/src/app/globals.css`;
const css=fs.readFileSync(cssPath,'utf8');
const marker='Approved identity + mobile balance hardening — 2026-09-16';
if(!css.includes(marker)) fs.appendFileSync(cssPath,identityCss,'utf8');

fs.mkdirSync(`${root}/src/types`,{recursive:true});
fs.writeFileSync(
  `${root}/src/types/pdf-parse.d.ts`,
  "declare module 'pdf-parse' {\n  const pdf: (buffer: Buffer) => Promise<{ text?: string; numpages: number; info?: Record<string, unknown> }>;\n  export default pdf;\n}\n",
  'utf8',
);

console.log('Applied P0.4.30 compatibility, approved branding, and mobile layout patch.');
