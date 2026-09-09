'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ActionDialog } from '@/components/overlays/action-dialog';
import { changeEmailAction, changePasswordAction, updateAvatarAction, updateProfileSettingsAction } from './settings/actions';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { logout } from './dashboard/actions';

export type HeaderProfile = {
  displayName: string | null;
  email: string | null;
  timezone: string;
  emailVerified: boolean;
  image: string | null;
};

export function LogoMark({ image }: { image?: string | null } = {}) {
  if (image) return <span aria-hidden="true" className="p60-avatar-image" style={{ backgroundImage: `url(${image})` }} />;
  return <span aria-hidden="true" className="p60-avatar-fallback"><LucideIcon name="circleUserRound" size={24} /></span>;
}

export function ProfileTrigger({ profile, className = 'p4913-profile-trigger' }: { profile: HeaderProfile; className?: string }) {
  const pathname = usePathname();
  return <ActionDialog
    title="الملف الشخصي"
    description="بياناتك الأساسية وإعدادات العرض في النظام."
    size="md"
    triggerClassName={className}
    triggerAriaLabel="فتح الملف الشخصي"
    triggerTitle="الملف الشخصي"
    trigger={<span className="p4913-logo-mark"><LogoMark image={profile.image} /></span>}
  >
    <div className="p55-profile-dialog">
      <div className="p55-profile-summary">
        <span className="p55-profile-logo"><LogoMark image={profile.image} /></span>
        <div><strong>{profile.displayName || 'المستخدم'}</strong><span>{profile.email || '—'}</span><small>{profile.emailVerified ? 'البريد موثّق' : 'البريد غير موثّق'}</small></div>
      </div>
      <form action={updateProfileSettingsAction} className="p55-profile-form">
        <input type="hidden" name="returnTo" value={pathname} />
        <label>الاسم المعروض<input name="displayName" maxLength={120} defaultValue={profile.displayName ?? ''} /></label>
        <label>البريد الإلكتروني<input value={profile.email ?? ''} readOnly /></label>
        <label>العملة<input value="SAR — ريال سعودي" readOnly /></label>
        <label>المنطقة الزمنية<input name="timezone" defaultValue={profile.timezone} required /></label>
        <div className="p49-dialog-actions p55-profile-actions">
          <Link className="secondary-link" href="/settings">الإعدادات الكاملة</Link>
          <button className="primary-button" type="submit">حفظ</button>
        </div>
      </form>
      <form action={updateAvatarAction} className="p60-security-form" encType="multipart/form-data">
        <input type="hidden" name="returnTo" value={pathname} />
        <label>صورة الحساب<input type="file" name="avatar" accept="image/png,image/jpeg,image/webp" /></label>
        <button className="secondary-button" type="submit">تحديث الصورة</button>
      </form>
      <form action={changeEmailAction} className="p60-security-form">
        <input type="hidden" name="returnTo" value={pathname} />
        <label>البريد الجديد<input name="newEmail" type="email" autoComplete="email" required /></label>
        <label>كلمة المرور الحالية<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
        <button className="secondary-button" type="submit">تغيير البريد</button>
      </form>
      <form action={changePasswordAction} className="p60-security-form">
        <input type="hidden" name="returnTo" value={pathname} />
        <label>كلمة المرور الحالية<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
        <label>كلمة المرور الجديدة<input name="newPassword" type="password" minLength={12} autoComplete="new-password" required /></label>
        <label>تأكيد كلمة المرور<input name="confirmPassword" type="password" minLength={12} autoComplete="new-password" required /></label>
        <button className="secondary-button" type="submit">تغيير كلمة المرور</button>
      </form>
      <div className="p55-profile-logout-zone">
        <form action={logout}>
          <button className="danger-button p55-profile-logout" type="submit"><LucideIcon name="logOut" size={20} />تسجيل الخروج</button>
        </form>
      </div>
    </div>
  </ActionDialog>;
}
