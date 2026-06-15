import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './global.css';

const description =
  'User documentation for the TStack Engineering Harness and its agent workflows.';

export const metadata: Metadata = {
  title: {
    default: 'TStack Documentation',
    template: '%s | TStack Docs',
  },
  description,
  openGraph: {
    title: 'TStack Documentation',
    description,
    siteName: 'TStack Docs',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
