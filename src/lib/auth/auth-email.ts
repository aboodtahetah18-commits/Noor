import { getServerEnv } from '@/config/env';

export type AuthEmailKind = 'verify-email' | 'reset-password';

type AuthEmailInput = {
  to: string;
  kind: AuthEmailKind;
  url: string;
};

function emailContent(input: AuthEmailInput): { subject: string; html: string } {
  if (input.kind === 'verify-email') {
    return {
      subject: 'تأكيد بريدك الإلكتروني في نماء',
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>تأكيد البريد الإلكتروني</h2><p>أهلاً بك في نماء. اضغط الرابط التالي لتأكيد بريدك ثم إنشاء كلمة المرور.</p><p><a href="${input.url}">تأكيد البريد وإنشاء كلمة المرور</a></p><p>ينتهي هذا الرابط خلال 30 دقيقة. إذا لم تطلب إنشاء حساب فتجاهل الرسالة.</p></div>`,
    };
  }
  return {
    subject: 'إعادة تعيين كلمة المرور في نماء',
    html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>إعادة تعيين كلمة المرور</h2><p>وصلنا طلب لإعادة تعيين كلمة مرور حسابك في نماء.</p><p><a href="${input.url}">إنشاء كلمة مرور جديدة</a></p><p>ينتهي هذا الرابط خلال 30 دقيقة. إذا لم تطلب ذلك فتجاهل الرسالة.</p></div>`,
  };
}

export async function sendAuthEmail(input: AuthEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.AUTH_EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new Error('AUTH_EMAIL_NOT_CONFIGURED');

  const { subject, html } = emailContent(input);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from, to: [input.to], subject, html }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('AUTH_EMAIL_DELIVERY_FAILED');
}

export function authAbsoluteUrl(path: string): string {
  return new URL(path, getServerEnv().APP_BASE_URL).toString();
}
