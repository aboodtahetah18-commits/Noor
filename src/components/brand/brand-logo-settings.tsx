'use client';

import { useSyncExternalStore } from 'react';
import { BrandLogo, brandLogoStorage } from './brand-logo';

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key===brandLogoStorage.LIGHT_KEY || event.key===brandLogoStorage.DARK_KEY) callback();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(brandLogoStorage.EVENT, callback);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(brandLogoStorage.EVENT, callback);
  };
}
function serverSnapshot(){return '0|0';}
function clientSnapshot(){return `${window.localStorage.getItem(brandLogoStorage.LIGHT_KEY)?'1':'0'}|${window.localStorage.getItem(brandLogoStorage.DARK_KEY)?'1':'0'}`;}

function saveFile(file: File | undefined, key: string) {
  if (!file) return;
  if (!['image/png','image/jpeg','image/webp'].includes(file.type)) return;
  if (file.size > 1024 * 1024) return;
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    if (typeof reader.result !== 'string') return;
    window.localStorage.setItem(key, reader.result);
    window.dispatchEvent(new Event(brandLogoStorage.EVENT));
  });
  reader.readAsDataURL(file);
}

export function BrandLogoSettings(){
  const snapshot=useSyncExternalStore(subscribe,clientSnapshot,serverSnapshot);
  const [hasLight,hasDark]=snapshot.split('|');
  return <section className="p47-resource-card brand-logo-settings">
    <div className="p47-section-heading"><div><span>هوية المنصة</span><h2>الشعار</h2></div><small>PNG / JPG / WEBP — حتى 1MB</small></div>
    <p className="muted">الشعار الافتراضي هو رمز الهوية النهائي عالي الدقة، ويعمل على المظهرين الفاتح والداكن. يمكنك رفع بديل مستقل لكل مظهر دون تغيير هوية النظام الأساسية.</p>
    <div className="brand-logo-settings-grid">
      <article className="brand-logo-setting-card is-light">
        <div className="brand-logo-preview"><BrandLogo surface="light" /></div>
        <strong>رمز المظهر الفاتح</strong>
        <label className="secondary-button brand-logo-upload">اختيار شعار<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>saveFile(e.currentTarget.files?.[0],brandLogoStorage.LIGHT_KEY)} /></label>
        {hasLight==='1'?<button type="button" className="secondary-button" onClick={()=>{window.localStorage.removeItem(brandLogoStorage.LIGHT_KEY);window.dispatchEvent(new Event(brandLogoStorage.EVENT));}}>استعادة الافتراضي</button>:null}
      </article>
      <article className="brand-logo-setting-card is-dark">
        <div className="brand-logo-preview"><BrandLogo surface="dark" /></div>
        <strong>رمز المظهر الداكن</strong>
        <label className="secondary-button brand-logo-upload">اختيار شعار<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>saveFile(e.currentTarget.files?.[0],brandLogoStorage.DARK_KEY)} /></label>
        {hasDark==='1'?<button type="button" className="secondary-button" onClick={()=>{window.localStorage.removeItem(brandLogoStorage.DARK_KEY);window.dispatchEvent(new Event(brandLogoStorage.EVENT));}}>استعادة الافتراضي</button>:null}
      </article>
    </div>
  </section>;
}
