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

fs.mkdirSync(`${root}/src/types`,{recursive:true});
fs.writeFileSync(
  `${root}/src/types/pdf-parse.d.ts`,
  "declare module 'pdf-parse' {\n  const pdf: (buffer: Buffer) => Promise<{ text?: string; numpages: number; info?: Record<string, unknown> }>;\n  export default pdf;\n}\n",
  'utf8',
);

console.log('Applied P0.4.30 compatibility patch only.');
