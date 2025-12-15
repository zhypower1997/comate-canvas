import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { PageTracker } from '../components/analytics/PageTracker';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: '趣绘像素岛',
  description: '艺码玩创局出品',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <PageTracker />
        {children}
      </body>
    </html>
  );
}
