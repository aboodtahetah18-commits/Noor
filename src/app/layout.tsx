import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Noto_Sans_Arabic } from 'next/font/google';
import './globals.css';
import './uiux-governance.css';
import '../design-system/tokens.css';
import '../design-system/themes.css';
import '../design-system/typography.css';
import '../design-system/foundations.css';
import '../design-system/responsive.css';
import '../design-system/contracts.css';
import '../design-system/experience.css';
import '../design-system/brand-refresh.css';
import '../design-system/ndos-v1.1.css';

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-noto-sans-arabic',
});

export const metadata: Metadata = {
  title: 'نماء',
  description: 'مستقبل مالي أكثر وعيًا',
  icons: {
    icon: '/brand/ndos/namaa-logo-official.png',
    shortcut: '/brand/ndos/namaa-logo-official.png',
    apple: '/brand/ndos/namaa-logo-official.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" data-theme="light" className={notoSansArabic.variable} suppressHydrationWarning>
      <body className={notoSansArabic.className}>{children}</body>
    </html>
  );
}
