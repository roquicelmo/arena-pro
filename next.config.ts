import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // @react-pdf usa módulos Node (fontkit, yoga); fica fora do bundle do servidor.
  serverExternalPackages: ['@react-pdf/renderer'],
  // As fontes da súmula são lidas do disco em runtime pelas rotas de PDF.
  outputFileTracingIncludes: {
    '/provas/[eventId]/sorteio/sumula.pdf': ['./src/server/pdf/fonts/**'],
    '/sorteio-avulso/sumula.pdf': ['./src/server/pdf/fonts/**'],
  },
  env: {
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || process.env.VITE_RECAPTCHA_SITE_KEY || '',
  },
};

export default nextConfig;
