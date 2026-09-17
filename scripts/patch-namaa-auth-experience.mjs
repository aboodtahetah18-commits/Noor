import fs from 'node:fs';
import path from 'node:path';

const root = process.env.NAMAA_TARGET_DIR || 'apps/namaa-final-ui';
const file = (p) => path.join(root, p);
function write(p, content) {
  const target = file(p);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
}

const required = [
  'src/components/AuthShell.tsx',
  'src/components/LoginForm.tsx',
  'src/components/SignupForm.tsx',
  'src/components/ForgotPasswordForm.tsx',
  'src/components/ResetPasswordForm.tsx',
  'src/app/globals.css',
];
for (const p of required) if (!fs.existsSync(file(p))) throw new Error('Missing Namaa auth source: ' + p);

write('src/components/AuthShell.tsx', String.raw`import type { ReactNode } from 'react';
import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';

export function AuthShell({eyebrow,title,description,children}:{eyebrow:string;title:string;description:string;children:ReactNode}) {
  return <main className="auth-page auth-page-v2 auth-page-namaa" dir="rtl">
    <div className="auth-leaf-watermark" aria-hidden="true"><span className="auth-leaf-watermark-crop"><BrandLogo /></span></div>
    <section className="auth-hero" aria-label="نماء">
      <div className="auth-logo-stage">
        <BrandLogo className="auth-logo" />
        <span className="auth-mobile-badge">مستقبل مالي أكثر وعيًا</span>
      </div>
      <div className="auth-hero-copy">
        <span className="auth-kicker">رحلتك المالية</span>
        <h1>رؤية أوضح لقرارات أفضل</h1>
        <p>تابع أموالك، خطط بهدوء، وشاهد تقدمك في مكان واحد.</p>
      </div>
      <div className="auth-arches" aria-hidden="true"><i/><i/><i/></div>
    </section>
    <section className="auth-panel">
      <div className="auth-theme"><ThemeToggle compact /></div>
      <div className="auth-heading"><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>
      {children}
      <footer className="auth-footnote"><span>بيئة التشغيل</span><span>نماء</span></footer>
    </section>
  </main>;
}
`);

write('src/components/LoginForm.tsx', String.raw`'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/auth-client';
import { AuthField } from './AuthField';
import { Icon } from './Icon';

export function LoginForm(){
  const router=useRouter();
  const [error,setError]=useState('');
  const [pending,setPending]=useState(false);
  const [show,setShow]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); if(pending)return; setPending(true); setError('');
    const form=new FormData(event.currentTarget);
    const email=String(form.get('email')??'').trim().toLowerCase();
    const password=String(form.get('password')??'');
    try{
      const result=await authClient.signIn.email({email,password,callbackURL:'/'});
      if(result.error){setError('تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور وحاول مرة أخرى.');return;}
      router.push('/'); router.refresh();
    }catch{setError('تعذر الاتصال بخدمة تسجيل الدخول حاليًا. حاول مرة أخرى.');}
    finally{setPending(false);}
  }
  return <form className="auth-form" onSubmit={submit}>
    <AuthField label="البريد الإلكتروني" name="email" type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" required iconName="mail"/>
    <AuthField label="كلمة المرور" name="password" type={show?'text':'password'} autoComplete="current-password" placeholder="أدخل كلمة المرور" required iconName="lock" action={<button type="button" className="field-action-button" onClick={()=>setShow(v=>!v)} aria-label={show?'إخفاء كلمة المرور':'إظهار كلمة المرور'}><Icon name="eye" size={21}/></button>}/>
    <div className="auth-inline"><a href="/forgot-password">نسيت كلمة المرور؟</a></div>
    {error&&<div className="auth-alert error" role="alert"><b>تعذر تسجيل الدخول</b><span>{error}</span></div>}
    <button className="auth-primary" type="submit" disabled={pending}><Icon name="chevron" size={19}/><span>{pending?'جاري تسجيل الدخول...':'تسجيل الدخول'}</span></button>
    <div className="auth-switch">ليس لديك حساب؟ <a href="/signup">إنشاء حساب جديد</a></div>
  </form>;
}
`);

write('src/components/SignupForm.tsx', String.raw`'use client';
import { FormEvent, useState } from 'react';
import { AuthField } from './AuthField';
import { Icon } from './Icon';

function normalizePhone(value:string){
  const digits=value.replace(/\D/g,'');
  if(digits.startsWith('966'))return '+'+digits;
  if(digits.startsWith('05'))return '+966'+digits.slice(1);
  if(digits.startsWith('5')&&digits.length===9)return '+966'+digits;
  return value.trim();
}

export function SignupForm(){
  const [pending,setPending]=useState(false);
  const [error,setError]=useState('');
  const [sent,setSent]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); if(pending)return; setPending(true); setError('');
    const form=new FormData(event.currentTarget);
    const payload={
      firstName:String(form.get('firstName')??'').trim(),
      lastName:String(form.get('lastName')??'').trim(),
      phone:normalizePhone(String(form.get('phone')??'')),
      email:String(form.get('email')??'').trim().toLowerCase(),
      city:String(form.get('city')??'').trim(),
    };
    try{
      const response=await fetch('/api/account/register',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const body=await response.json().catch(()=>({})) as {code?:string};
      if(!response.ok){
        if(body.code==='AUTH_EMAIL_NOT_CONFIGURED')setError('خدمة البريد غير مهيأة بعد على بيئة التشغيل.');
        else if(body.code==='AUTH_INPUT_INVALID')setError('تحقق من الاسم واسم العائلة ورقم الجوال والبريد الإلكتروني والمدينة.');
        else setError('تعذر إنشاء الحساب حاليًا. حاول مرة أخرى.');
        return;
      }
      setSent(true);
    }catch{setError('تعذر الاتصال بخدمة إنشاء الحساب حاليًا.');}
    finally{setPending(false);}
  }
  if(sent)return <div className="auth-success-card" role="status"><strong>تحقق من بريدك الإلكتروني</strong><p>أرسلنا رابط التحقق إلى بريدك. فتح الرابط يؤكد ملكية البريد، وبعدها تنشئ كلمة المرور لأول مرة.</p><a className="auth-secondary" href="/login">العودة إلى تسجيل الدخول</a></div>;
  return <form className="auth-form auth-signup-form" onSubmit={submit}>
    <div className="auth-two-columns">
      <AuthField label="الاسم" name="firstName" autoComplete="given-name" placeholder="الاسم" required iconName="user-outline"/>
      <AuthField label="اسم العائلة" name="lastName" autoComplete="family-name" placeholder="اسم العائلة" required iconName="user-outline"/>
    </div>
    <AuthField label="رقم الجوال" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="05xxxxxxxx" required iconName="user-outline"/>
    <AuthField label="البريد الإلكتروني" name="email" type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" required iconName="mail"/>
    <AuthField label="المدينة" name="city" autoComplete="address-level2" placeholder="مثال: الرياض، جدة، خميس مشيط" required iconName="home"/>
    <p className="auth-data-note">تُحفظ المدينة كمرجع شخصي للخدمات الذكية مستقبلًا، مثل تقدير مسافة السفر والتكلفة، دون عرض خريطة داخل نموذج التسجيل.</p>
    {error&&<div className="auth-alert error" role="alert"><b>تعذر إنشاء الحساب</b><span>{error}</span></div>}
    <button className="auth-primary" type="submit" disabled={pending}><Icon name="chevron" size={19}/><span>{pending?'جاري الإرسال...':'متابعة وتأكيد البريد'}</span></button>
    <div className="auth-switch">لديك حساب بالفعل؟ <a href="/login">تسجيل الدخول</a></div>
  </form>;
}
`);

write('src/components/ForgotPasswordForm.tsx', String.raw`'use client';
import { FormEvent, useState } from 'react';
import { AuthField } from './AuthField';
import { Icon } from './Icon';

export function ForgotPasswordForm(){
  const [pending,setPending]=useState(false);
  const [error,setError]=useState('');
  const [sent,setSent]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); if(pending)return;
    const email=String(new FormData(event.currentTarget).get('email')??'').trim().toLowerCase();
    setPending(true);setError('');
    try{
      const response=await fetch('/api/account/forgot-password',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({email})});
      const body=await response.json().catch(()=>({})) as {code?:string};
      if(!response.ok){setError(body.code==='AUTH_EMAIL_NOT_CONFIGURED'?'خدمة البريد غير مهيأة بعد على بيئة التشغيل.':'تعذر إرسال رابط الاستعادة حاليًا.');return;}
      setSent(true);
    }catch{setError('تعذر الاتصال بخدمة استعادة كلمة المرور.');}
    finally{setPending(false);}
  }
  if(sent)return <div className="auth-success-card" role="status"><strong>تحقق من بريدك الإلكتروني</strong><p>إذا كان البريد مرتبطًا بحساب نماء متحقق، ستصلك رسالة تحتوي على رابط آمن لإنشاء كلمة مرور جديدة.</p><a className="auth-secondary" href="/login">العودة إلى تسجيل الدخول</a></div>;
  return <form className="auth-form" onSubmit={submit}>
    <AuthField label="البريد الإلكتروني" name="email" type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" required iconName="mail"/>
    {error&&<div className="auth-alert error" role="alert"><b>تعذر الإرسال</b><span>{error}</span></div>}
    <button className="auth-primary" type="submit" disabled={pending}><Icon name="mail" size={19}/><span>{pending?'جاري الإرسال...':'إرسال رابط إعادة التعيين'}</span></button>
    <a className="auth-secondary" href="/login"><Icon name="chevron" size={18}/><span>العودة إلى تسجيل الدخول</span></a>
  </form>;
}
`);

write('src/components/PasswordTokenForm.tsx', String.raw`'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthField } from './AuthField';
import { Icon } from './Icon';

export function PasswordTokenForm({token,mode}:{token:string;mode:'setup'|'reset'}){
  const router=useRouter();
  const [show,setShow]=useState(false);
  const [pending,setPending]=useState(false);
  const [error,setError]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); if(pending)return;
    const form=new FormData(event.currentTarget);
    const password=String(form.get('password')??'');
    const confirm=String(form.get('confirmPassword')??'');
    if(password!==confirm){setError('كلمتا المرور غير متطابقتين.');return;}
    setPending(true);setError('');
    try{
      const endpoint=mode==='setup'?'/api/account/set-password':'/api/account/reset-password';
      const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({token,password})});
      const body=await response.json().catch(()=>({})) as {code?:string};
      if(!response.ok){
        if(body.code==='AUTH_TOKEN_INVALID_OR_EXPIRED')setError('الرابط غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.');
        else if(body.code==='AUTH_PASSWORD_WEAK')setError('استخدم 10 أحرف على الأقل، مع حرف ورقم على الأقل.');
        else setError('تعذر حفظ كلمة المرور الجديدة حاليًا.');
        return;
      }
      router.replace('/login?password=updated'); router.refresh();
    }catch{setError('تعذر الاتصال بخدمة كلمة المرور حاليًا.');}
    finally{setPending(false);}
  }
  if(!token)return <div className="auth-alert error" role="alert"><b>الرابط غير مكتمل</b><span>اطلب رابطًا جديدًا لإكمال العملية.</span></div>;
  return <form className="auth-form" onSubmit={submit}>
    <AuthField label="كلمة المرور الجديدة" name="password" type={show?'text':'password'} minLength={10} maxLength={128} autoComplete="new-password" required placeholder="أدخل كلمة المرور الجديدة" iconName="lock" action={<button type="button" className="field-action-button" onClick={()=>setShow(v=>!v)} aria-label={show?'إخفاء كلمة المرور':'إظهار كلمة المرور'}><Icon name="eye" size={21}/></button>}/>
    <AuthField label="تأكيد كلمة المرور الجديدة" name="confirmPassword" type={show?'text':'password'} minLength={10} maxLength={128} autoComplete="new-password" required placeholder="أعد إدخال كلمة المرور الجديدة" iconName="lock"/>
    <div className="password-rules"><b>متطلبات كلمة المرور</b><span>10 أحرف على الأقل</span><span>حرف واحد ورقم واحد على الأقل</span></div>
    {error&&<div className="auth-alert error" role="alert">{error}</div>}
    <button className="auth-primary" type="submit" disabled={pending}><Icon name="verify" size={19}/><span>{pending?'جاري الحفظ...':mode==='setup'?'إنشاء كلمة المرور':'تأكيد كلمة المرور الجديدة'}</span></button>
  </form>;
}
`);

write('src/components/ResetPasswordForm.tsx', String.raw`'use client';
import { PasswordTokenForm } from './PasswordTokenForm';
export function ResetPasswordForm({token}:{token:string}){return <PasswordTokenForm token={token} mode="reset"/>;}
`);

write('src/app/signup/page.tsx', String.raw`import { SignupForm } from '@/components/SignupForm';
import { AuthShell } from '@/components/AuthShell';
export const dynamic='force-dynamic';
export default function SignupPage(){return <AuthShell eyebrow="حساب جديد" title="إنشاء حساب نماء" description="أدخل بياناتك الأساسية فقط. بعد تأكيد البريد ستنشئ كلمة المرور بأمان."><SignupForm/></AuthShell>;}
`);

write('src/app/forgot-password/page.tsx', String.raw`import { ForgotPasswordForm } from '@/components/ForgotPasswordForm';
import { AuthShell } from '@/components/AuthShell';
export default function ForgotPasswordPage(){return <AuthShell eyebrow="استعادة الوصول" title="إعادة تعيين كلمة المرور" description="أدخل بريدك الإلكتروني وسنرسل رابطًا آمنًا لإكمال إعادة التعيين."><ForgotPasswordForm/></AuthShell>;}
`);

write('src/app/reset-password/page.tsx', String.raw`import { AuthShell } from '@/components/AuthShell';
import { ResetPasswordForm } from '@/components/ResetPasswordForm';
export default async function ResetPasswordPage({searchParams}:{searchParams:Promise<{token?:string}>}){const params=await searchParams;return <AuthShell eyebrow="استعادة آمنة" title="كلمة مرور جديدة" description="أنشئ كلمة المرور الجديدة ثم ارجع مباشرة إلى تسجيل الدخول."><ResetPasswordForm token={params.token??''}/></AuthShell>;}
`);

write('src/app/set-password/page.tsx', String.raw`import { AuthShell } from '@/components/AuthShell';
import { PasswordTokenForm } from '@/components/PasswordTokenForm';
export default async function SetPasswordPage({searchParams}:{searchParams:Promise<{token?:string}>}){const params=await searchParams;return <AuthShell eyebrow="تأكيد البريد" title="إنشاء كلمة المرور" description="تم تأكيد بريدك. أنشئ الآن كلمة المرور الأولى لحساب نماء."><PasswordTokenForm token={params.token??''} mode="setup"/></AuthShell>;}
`);

const cssPath=file('src/app/globals.css');
const marker='/* Namaa account access UX 2026-09-17 */';
const before=fs.readFileSync(cssPath,'utf8');
if(before.includes(marker))throw new Error('Namaa account access CSS already exists unexpectedly');
fs.appendFileSync(cssPath, String.raw`

/* Namaa account access UX 2026-09-17 */
.auth-page-namaa{position:relative;isolation:isolate}
.auth-page-namaa .auth-hero,.auth-page-namaa .auth-panel{position:relative;z-index:2}
.auth-leaf-watermark{position:fixed;z-index:1;inset-inline-start:-22px;bottom:-26px;width:min(31vw,420px);height:min(38vw,500px);overflow:hidden;pointer-events:none;opacity:.035}
.auth-leaf-watermark-crop{display:block;width:190%;height:100%;transform:translateX(40%) scale(1.22);transform-origin:bottom left;filter:grayscale(1)}
.auth-leaf-watermark-crop .brand-logo{display:block;width:100%;height:100%}
.auth-leaf-watermark-crop img{width:100%;height:100%;object-fit:contain;object-position:left bottom}
.auth-mobile-badge{display:none}
.auth-signup-form{gap:14px}
.auth-two-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.auth-data-note{margin:0;padding:11px 13px;border:1px solid color-mix(in srgb,#D4AF6B 35%,transparent);border-radius:14px;background:color-mix(in srgb,#FFF7E6 58%,transparent);font-size:12px;line-height:1.7}
.auth-success-card{display:grid;gap:12px;padding:18px;border:1px solid color-mix(in srgb,#0B6B4F 18%,transparent);border-radius:18px;background:color-mix(in srgb,#FAF9F4 84%,white)}
.auth-success-card strong{font-size:18px;color:#0B6B4F}.auth-success-card p{margin:0;line-height:1.8}
@media (max-width:900px){
  .auth-page-namaa .auth-logo{width:clamp(132px,38vw,184px)!important;max-width:184px!important}
  .auth-page-namaa .auth-logo-stage{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
  .auth-mobile-badge{display:inline-flex;align-items:center;min-height:28px;padding:5px 10px;border:1px solid color-mix(in srgb,#D4AF6B 42%,transparent);border-radius:999px;background:color-mix(in srgb,#FFF7E6 72%,transparent);font-size:11px;font-weight:700;color:#0B6B4F}
  .auth-page-namaa .auth-theme{top:max(18px,env(safe-area-inset-top));inset-inline-start:max(18px,env(safe-area-inset-left));inset-inline-end:auto}
  .auth-leaf-watermark{width:62vw;height:54vw;inset-inline-start:-24vw;bottom:-5vw;opacity:.026}
  .auth-two-columns{grid-template-columns:1fr;gap:10px}
  .auth-data-note{font-size:11px;padding:9px 11px}
  .auth-signup-form{gap:10px}
}
@media (prefers-color-scheme:dark){.auth-leaf-watermark{opacity:.02}}
`, 'utf8');

console.log('Applied Namaa account access UI and flows.');
