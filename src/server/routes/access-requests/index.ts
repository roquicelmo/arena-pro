import { z } from 'zod';
import { prisma } from '../../prisma';
import { evaluateRecaptcha, type SiteverifyResult } from '../../../lib/recaptchaPolicy';

const requestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30),
  email: z.string().trim().toLowerCase().email().max(160),
  recaptchaToken: z.string().min(1),
});

interface VercelRequest {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
}

const verifyRecaptcha = async (token: string, remoteIp?: string) => {
  const runtime = globalThis as typeof globalThis & { process?: { env?: { RECAPTCHA_SECRET_KEY?: string } } };
  const secret = runtime.process?.env?.RECAPTCHA_SECRET_KEY;
  if (!secret) throw new Error('RECAPTCHA_SECRET_KEY não configurada.');

  const params = new URLSearchParams({ secret, response: token });
  if (remoteIp) params.set('remoteip', remoteIp);
  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  if (!response.ok) throw new Error('Não foi possível validar o reCAPTCHA.');
  return evaluateRecaptcha(await response.json() as SiteverifyResult);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Método não permitido.' });
    return;
  }

  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Informe nome, telefone e e-mail válidos.' });
    return;
  }

  try {
    const captcha = await verifyRecaptcha(parsed.data.recaptchaToken);
    if (!captcha.ok) {
      res.status(400).json({
        message: captcha.reason === 'low-score'
          ? 'Não conseguimos confirmar que a solicitação foi feita por uma pessoa. Tente novamente em alguns instantes.'
          : 'A validação do reCAPTCHA não foi concluída.',
      });
      return;
    }

    const existing = await prisma.accessRequest.findFirst({
      where: { email: parsed.data.email, status: 'PENDING' },
      select: { id: true },
    });
    if (existing) {
      res.status(409).json({ message: 'Já existe uma solicitação pendente para este e-mail.' });
      return;
    }

    const accessRequest = await prisma.accessRequest.create({
      data: { name: parsed.data.name, phone: parsed.data.phone, email: parsed.data.email },
      select: { id: true, name: true, email: true, status: true, createdAt: true },
    });
    res.status(201).json(accessRequest);
  } catch (error) {
    console.error('access_request_failed', error);
    res.status(500).json({ message: 'Não foi possível registrar a solicitação agora.' });
  }
}
