import type { Metadata } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import '../src/index.css';
import { ConfirmProvider } from '../src/components/ui/ConfirmDialog';
import { Toaster } from '../src/components/ui/Toaster';

const barlow = Barlow({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin', 'latin-ext'],
  weight: ['600', '700'],
  variable: '--font-barlow-condensed',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sorteios Lagoa | Gestão de provas e sorteios de laço',
  description: 'Gestão de provas de laço em dupla: inscrições, sorteios, pista, locução e resultados.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>
        <ConfirmProvider>{children}</ConfirmProvider>
        <Toaster />
      </body>
    </html>
  );
}
