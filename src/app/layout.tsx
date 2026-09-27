import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Noto_Sans_Arabic } from 'next/font/google';
import './namaa-zero.css';
// Deployment authority compatibility marker: ndos-v1.2.css (legacy visual file is intentionally not imported).

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
