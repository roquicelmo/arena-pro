import { z } from 'zod';
import { getAuthenticatedUser } from '../../../auth';
import { OPERATOR_ROLES } from '../../../permissions';
import { recordTime } from '../../../services/commands/times';
import { respondDomainError } from '../../domain-error';

interface VercelRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
}

const timeInput = z.object({
  bullNumber: z.number().int().min(1).max(3),
  timeSeconds: z.number().finite().min(0).max(999.99).nullable().optional(),
  isNt: z.boolean().default(false),
});

const toHeaders = (input: VercelRequest['headers']) => {
  const headers = new Headers();
  for (const [name, value] of Object.entries(input)) {
    if (typeof value === 'string') headers.set(name, value);
    if (Array.isArray(value)) headers.set(name, value.join(', '));
  }
  return headers;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthenticatedUser(toHeaders(req.headers));
  if (!user) return res.status(401).json({ message: 'É necessário estar autenticado.' });
  // User lança nas próprias provas (spec 6.4); o escopo é conferido no command.
  if (!(OPERATOR_ROLES as readonly string[]).includes(user.role)) {
    return res.status(403).json({ message: 'Seu perfil não pode registrar tempos.' });
  }
  if (req.method !== 'PATCH') return res.status(405).json({ message: 'Método não permitido.' });
  const runId = typeof req.query?.runId === 'string' ? req.query.runId : '';
  const parsed = timeInput.safeParse(req.body);
  if (!runId || !parsed.success) {
    return res.status(400).json({ message: 'Dados do tempo inválidos.', issues: parsed.success ? undefined : parsed.error.flatten() });
  }
  try {
    const updatedRun = await recordTime(user, runId, {
      bullNumber: parsed.data.bullNumber,
      timeSeconds: parsed.data.timeSeconds ?? null,
      isNt: parsed.data.isNt,
    });
    return res.status(200).json(updatedRun);
  } catch (error) {
    return respondDomainError(res, error);
  }
}
