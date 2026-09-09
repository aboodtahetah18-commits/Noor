'use client';

import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';

export default function ProtectedError({reset}:{reset:()=>void}){return <main className="app-page" dir="rtl"><div className="page-shell"><section className="functional-state-card is-error"><LucideIcon name="circleX" size={32}/><h1>تعذر فتح هذه الصفحة</h1><p>تعذر تحميل البيانات. أعد المحاولة أو انتقل إلى مركز النظام.</p><div className="button-row"><button className="primary-button" type="button" onClick={reset}>إعادة المحاولة</button><Link className="secondary-link" href="/workspace">فتح مركز النظام</Link></div></section></div></main>}
