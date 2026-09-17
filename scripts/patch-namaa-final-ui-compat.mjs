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

// Runtime-auth hardening: allow the public login shell to render when Vercel runtime auth
// secrets are not configured, but do not create or fall back to an insecure auth secret.
// Authentication API calls remain unavailable until the real BETTER_AUTH_SECRET exists.
const sessionPath=`${root}/src/lib/auth/session.ts`;
const sessionBefore=fs.readFileSync(sessionPath,'utf8');
if(!sessionBefore.includes("import { auth } from './auth';")) {
  throw new Error('Expected runtime-auth session target not found');
}
fs.writeFileSync(sessionPath,`import { headers } from 'next/headers';

export type NamaaSessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export async function getSessionUser(): Promise<NamaaSessionUser | null> {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return null;

  const { auth } = await import('./auth');
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return null;

  return {
    id: session.user.id,
    name: session.user.name ?? 'مستخدم نماء',
    email: session.user.email,
    image: session.user.image ?? null,
  };
}
`,'utf8');

const authRoutePath=`${root}/src/app/api/auth/[...all]/route.ts`;
const authRouteBefore=fs.readFileSync(authRoutePath,'utf8');
if(!authRouteBefore.includes("import { auth } from '@/lib/auth/auth';")) {
  throw new Error('Expected runtime-auth route target not found');
}
fs.writeFileSync(authRoutePath,`import { toNextJsHandler } from 'better-auth/next-js';

function runtimeAuthReady() {
  return Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET);
}

function unavailable() {
  return Response.json(
    { error: 'AUTH_RUNTIME_NOT_READY' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}

async function handlers() {
  const { auth } = await import('@/lib/auth/auth');
  return toNextJsHandler(auth);
}

export async function GET(request: Request) {
  if (!runtimeAuthReady()) return unavailable();
  const { GET } = await handlers();
  return GET(request);
}

export async function POST(request: Request) {
  if (!runtimeAuthReady()) return unavailable();
  const { POST } = await handlers();
  return POST(request);
}
`,'utf8');

// Preserve the approved 2:1 transparent logo ratio in the actual materialized Vercel app.
patch(
  'src/components/BrandLogo.tsx',
  'width="182"\n      height="101"',
  'width="182"\n      height="91"',
);
patch(
  'src/components/BrandLogo.tsx',
  'width="182"\n      height="101"',
  'width="182"\n      height="91"',
);

const globalsPath=`${root}/src/app/globals.css`;
const globalsBefore=fs.readFileSync(globalsPath,'utf8');
const runtimePatchMarker='/* Namaa Vercel runtime/mobile auth patch */';
if(globalsBefore.includes(runtimePatchMarker)) {
  throw new Error('Runtime/mobile auth patch unexpectedly already exists in source artifact');
}
fs.appendFileSync(globalsPath,`\n\n${runtimePatchMarker}\n
/* The approved transparent logo must never inherit a tile, border, radius, shadow or padding. */
.auth-page-v2 .auth-logo-stage,
.auth-page-v2 .auth-logo,
.auth-page-v2 .auth-logo .brand-logo,
.auth-page-v2 .auth-logo img {
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
}
.auth-page-v2 .auth-logo img {
  aspect-ratio: 2 / 1;
  object-fit: contain;
}

/* Mobile login is a single viewport experience: no redundant page scrolling. */
@media (max-width: 900px) {
  html:has(.auth-page-v2),
  body:has(.auth-page-v2) {
    height: 100%;
    min-height: 100%;
    overflow: hidden;
    overscroll-behavior: none;
  }

  .auth-page-v2 {
    height: 100dvh;
    min-height: 100dvh;
    max-height: 100dvh;
    display: grid !important;
    grid-template-rows: auto minmax(0, 1fr);
    overflow: hidden;
  }

  .auth-page-v2 .auth-hero {
    min-height: 0 !important;
    height: auto;
    padding: max(14px, env(safe-area-inset-top)) 20px 22px;
  }

  .auth-page-v2 .auth-logo-stage {
    min-height: 0;
    justify-content: flex-start;
    margin-bottom: 8px;
  }

  .auth-page-v2 .auth-logo {
    width: 112px !important;
    max-width: 112px !important;
  }

  .auth-page-v2 .auth-hero-copy {
    margin-top: 0;
  }

  .auth-page-v2 .auth-kicker {
    font-size: 12px;
    margin-bottom: 2px;
  }

  .auth-page-v2 .auth-hero h1 {
    font-size: clamp(20px, 6vw, 26px);
    line-height: 1.35;
  }

  .auth-page-v2 .auth-hero p,
  .auth-page-v2 .auth-arches {
    display: none !important;
  }

  .auth-page-v2 .auth-panel {
    width: 100%;
    min-height: 0 !important;
    height: 100%;
    margin: 0;
    border-radius: 22px 22px 0 0;
    border-inline: 0;
    border-bottom: 0;
    padding: 18px 18px max(14px, env(safe-area-inset-bottom));
    overflow: hidden;
    align-self: stretch;
  }

  .auth-page-v2 .auth-theme {
    inset-inline-start: 18px;
    left: auto;
    top: 16px;
  }

  .auth-page-v2 .auth-heading {
    margin-bottom: 12px;
    padding-inline-start: 0;
    padding-inline-end: 48px;
  }

  .auth-page-v2 .auth-heading > span {
    font-size: 13px;
  }

  .auth-page-v2 .auth-heading h2 {
    font-size: 23px;
    margin-block: 2px 4px;
  }

  .auth-page-v2 .auth-heading h2::after {
    width: 42px;
    height: 3px;
    margin-top: 5px;
  }

  .auth-page-v2 .auth-heading p {
    font-size: 12px;
    line-height: 1.5;
  }

  .auth-page-v2 .auth-form {
    gap: 10px;
  }

  .auth-page-v2 .auth-field-wrap {
    gap: 4px;
  }

  .auth-page-v2 .auth-label {
    font-size: 12px;
  }

  .auth-page-v2 .auth-field {
    min-height: 48px !important;
  }

  .auth-page-v2 .auth-primary,
  .auth-page-v2 .auth-secondary {
    min-height: 48px !important;
    font-size: 15px;
  }

  .auth-page-v2 .auth-switch {
    padding-top: 10px;
    font-size: 12px;
  }

  .auth-page-v2 .auth-footnote {
    margin-top: 10px;
    padding-top: 8px;
  }
}

@media (max-width: 900px) and (max-height: 700px) {
  .auth-page-v2 {
    grid-template-rows: 118px minmax(0, 1fr);
  }
  .auth-page-v2 .auth-hero {
    padding-block: max(8px, env(safe-area-inset-top)) 12px;
  }
  .auth-page-v2 .auth-logo-stage {
    margin-bottom: 2px;
  }
  .auth-page-v2 .auth-logo {
    width: 88px !important;
    max-width: 88px !important;
  }
  .auth-page-v2 .auth-kicker,
  .auth-page-v2 .auth-hero h1 {
    display: none;
  }
  .auth-page-v2 .auth-panel {
    padding-top: 12px;
  }
  .auth-page-v2 .auth-heading {
    margin-bottom: 8px;
  }
  .auth-page-v2 .auth-heading p,
  .auth-page-v2 .auth-footnote {
    display: none;
  }
  .auth-page-v2 .auth-form {
    gap: 8px;
  }
}
`,'utf8');

fs.mkdirSync(`${root}/src/types`,{recursive:true});
fs.writeFileSync(
  `${root}/src/types/pdf-parse.d.ts`,
  "declare module 'pdf-parse' {\n  const pdf: (buffer: Buffer) => Promise<{ text?: string; numpages: number; info?: Record<string, unknown> }>;\n  export default pdf;\n}\n",
  'utf8',
);

console.log('Applied P0.4.30 compatibility, runtime-auth, transparent brand, and mobile viewport patches.');
