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
import '../design-system/components.css';
import '../design-system/interaction-components.css';
import '../design-system/pages.css';
import './namaa-responsive-polish.css';
import '../design-system/ndos-v1.2.acceptance.css';
import '../design-system/ndos-v1.2.css';
import '../design-system/ndos-v1.2.enforcement.css';

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-noto-sans-arabic',
});

const approvedTransparentLogo = '/brand/ndos/namaa-logo-color-transparent.png';

export const metadata: Metadata = {
  title: 'نماء',
  description: 'مستقبل مالي أكثر وعيًا',
  icons: {
    icon: approvedTransparentLogo,
    shortcut: approvedTransparentLogo,
    apple: approvedTransparentLogo,
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" data-theme="light" className={notoSansArabic.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
