import Link from 'next/link';

const steps = [
  ['/onboarding/accounts','الحسابات'],
  ['/onboarding/income?edit=1','الدخل'],
  ['/onboarding/obligations','الالتزامات'],
  ['/onboarding/controls','الحماية والأهداف'],
  ['/onboarding/plan','الخطة'],
] as const;

function pathOnly(href: string) {
  return href.split('?')[0];
}

export function OnboardingStepNav({ current }: { current: string }) {
  const currentPath = pathOnly(current);
  return <nav className="onboarding-step-nav" aria-label="خطوات الإعداد">
    {steps.map(([href,label],i)=>{
      const active = current === label || currentPath === pathOnly(href);
      return <Link key={href} href={href} className={active?'active':''} aria-current={active?'step':undefined}><span>{i+2}</span>{label}</Link>;
    })}
  </nav>;
}
