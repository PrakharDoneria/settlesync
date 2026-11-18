import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SettleSync - Group Expense Sharing',
  description: 'Zero-friction group expense and travel sharing app',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className="bg-neo-white text-neo-black">
        {children}
      </body>
    </html>
  );
}
