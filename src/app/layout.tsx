import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Tajawal } from 'next/font/google';
import './globals.css';
import './uiux-governance.css';
import '../design-system/tokens.css';
import '../design-system/themes.css';
import '../design-system/typography.css';
import '../design-system/foundations.css';
import '../design-system/responsive.css';
import '../design-system/contracts.css';
import '../design-system/experience.css';

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-tajawal',
});

export const metadata: Metadata = {
  title: 'مستقبلي',
  description: 'إدارة أذكى لحياتك المالية',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark" className={tajawal.variable} suppressHydrationWarning>
      <body className={tajawal.className}>{children}</body>
    </html>
  );
}
