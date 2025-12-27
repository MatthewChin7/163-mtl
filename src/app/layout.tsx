import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '163MTL | Secure Transport Management',
  description: 'Automated Indent & Transport Management Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
