'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { updateProfileSettings } from '@/features/settings/commands/update-profile-settings';
import { setRecurringObligationActive } from '@/features/settings/commands/set-recurring-obligation-active';
import { changeOwnerEmail, changeOwnerPassword, revokeOtherOwnerSessions, updateOwnerAvatar } from '@/lib/auth/http-auth';
import { AUTH_SESSION_COOKIE } from '@/lib/auth/session-cookie';

function safeProfileReturnTo(value: FormDataEntryValue | null): string {
  const path = String(value ?? '/settings').trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/api') || path.startsWith('/login') || path.startsWith('/preview')) return '/settings';
  return path;
}

export async function updateProfileSettingsAction(fd: FormData) {
  const user = await requireAuthenticatedMutationUser('profile-settings-write');
  const returnTo = safeProfileReturnTo(fd.get('returnTo'));
  const result = await updateProfileSettings(user.id, { displayName: fd.get('displayName'), timezone: fd.get('timezone') });
  if (!result.success) redirect(`/settings?error=${encodeURIComponent(result.message)}`);
  revalidatePath('/settings');
  if (returnTo !== '/settings') revalidatePath(returnTo);
  redirect(returnTo === '/settings' ? '/settings?saved=1' : returnTo);
}

export async function setRecurringObligationActiveAction(fd: FormData) {
  const user = await requireAuthenticatedMutationUser();
  const templateId = String(fd.get('templateId') ?? '');
  const isActive = String(fd.get('isActive')) === 'true';
  const result = await setRecurringObligationActive(user.id, templateId, isActive);
  if (!result.success) redirect(`/settings?error=${encodeURIComponent(result.message)}`);
  revalidatePath('/settings');
  revalidatePath('/obligations');
  redirect('/settings');
}


function redirectSecurityResult(returnTo: string, key: 'saved' | 'error', value: string): never {
  const separator = returnTo.includes('?') ? '&' : '?';
  redirect(`${returnTo}${separator}${key}=${encodeURIComponent(value)}`);
  throw new Error('UNREACHABLE_REDIRECT');
}

export async function updateAvatarAction(fd: FormData) {
  const user = await requireAuthenticatedMutationUser('profile-avatar-write');
  const returnTo = safeProfileReturnTo(fd.get('returnTo'));
  const avatar = fd.get('avatar');
  if (!(avatar instanceof File) || avatar.size === 0) redirectSecurityResult(returnTo, 'error', 'اختر صورة للحساب.');
  const allowed = new Set(['image/png', 'image/jpeg', 'image/webp']);
  if (!allowed.has(avatar.type)) redirectSecurityResult(returnTo, 'error', 'صيغة الصورة غير مدعومة.');
  if (avatar.size > 128 * 1024) redirectSecurityResult(returnTo, 'error', 'حجم الصورة يجب ألا يتجاوز 128KB.');
  const bytes = Buffer.from(await avatar.arrayBuffer());
  const imageDataUrl = `data:${avatar.type};base64,${bytes.toString('base64')}`;
  await updateOwnerAvatar(user.id, imageDataUrl);
  revalidatePath('/', 'layout');
  redirectSecurityResult(returnTo, 'saved', 'avatar');
}

export async function changeEmailAction(fd: FormData) {
  const user = await requireAuthenticatedMutationUser('profile-email-write');
  const returnTo = safeProfileReturnTo(fd.get('returnTo'));
  const newEmail = String(fd.get('newEmail') ?? '').trim();
  const currentPassword = String(fd.get('currentPassword') ?? '');
  if (!/^\S+@\S+\.\S+$/.test(newEmail)) redirectSecurityResult(returnTo, 'error', 'البريد الإلكتروني غير صالح.');
  const result = await changeOwnerEmail({ userId: user.id, currentPassword, newEmail });
  if (!result.ok) redirectSecurityResult(returnTo, 'error', result.code === 'INVALID_CURRENT_PASSWORD' ? 'كلمة المرور الحالية غير صحيحة.' : result.code === 'EMAIL_ALREADY_IN_USE' ? 'البريد مستخدم مسبقًا.' : 'تعذر تغيير البريد.');
  revalidatePath('/', 'layout');
  redirectSecurityResult(returnTo, 'saved', 'email');
}

export async function changePasswordAction(fd: FormData) {
  const user = await requireAuthenticatedMutationUser('profile-password-write');
  const returnTo = safeProfileReturnTo(fd.get('returnTo'));
  const currentPassword = String(fd.get('currentPassword') ?? '');
  const newPassword = String(fd.get('newPassword') ?? '');
  const confirmPassword = String(fd.get('confirmPassword') ?? '');
  if (newPassword.length < 12) redirectSecurityResult(returnTo, 'error', 'كلمة المرور الجديدة يجب ألا تقل عن 12 حرفًا.');
  if (newPassword !== confirmPassword) redirectSecurityResult(returnTo, 'error', 'تأكيد كلمة المرور غير مطابق.');
  const token = (await cookies()).get(AUTH_SESSION_COOKIE)?.value ?? '';
  const result = await changeOwnerPassword({ userId: user.id, currentPassword, newPassword, keepSessionToken: token });
  if (!result.ok) redirectSecurityResult(returnTo, 'error', result.code === 'INVALID_CURRENT_PASSWORD' ? 'كلمة المرور الحالية غير صحيحة.' : 'تعذر تغيير كلمة المرور.');
  redirectSecurityResult(returnTo, 'saved', 'password');
}


export async function removeAvatarAction(fd: FormData) {
  const user = await requireAuthenticatedMutationUser('profile-avatar-remove');
  const returnTo = safeProfileReturnTo(fd.get('returnTo'));
  await updateOwnerAvatar(user.id, null);
  revalidatePath('/', 'layout');
  redirectSecurityResult(returnTo, 'saved', 'avatar-removed');
}

export async function revokeOtherSessionsAction(fd: FormData) {
  const user = await requireAuthenticatedMutationUser('profile-session-revoke');
  const returnTo = safeProfileReturnTo(fd.get('returnTo'));
  const token = (await cookies()).get(AUTH_SESSION_COOKIE)?.value ?? '';
  if (!token) redirectSecurityResult(returnTo, 'error', 'تعذر تحديد الجلسة الحالية. سجل الدخول مرة أخرى.');
  const revoked = await revokeOtherOwnerSessions({ userId: user.id, keepSessionToken: token });
  revalidatePath('/settings');
  redirectSecurityResult(returnTo, 'saved', `sessions-${revoked}`);
}
