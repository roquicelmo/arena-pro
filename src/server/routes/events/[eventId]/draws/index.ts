import { getAuthenticatedUser } from '../../../../auth';
import { OPERATOR_ROLES } from '../../../../permissions';
import { findDrawsRaw } from '../../../../services/raw';
import { generateDraw } from '../../../../services/commands/draws';
import { findScopedEvent } from '../../../../services/commands/registrations';
import { drawConfigSchema } from '../../../../../lib/schemas/draws';
import { respondDomainError } from '../../../domain-error';

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
  const eventId = typeof req.query?.eventId === 'string' ? req.query.eventId : '';
  if (!eventId) return res.status(400).json({ message: 'Identificador da prova é obrigatório.' });

  try {
    // GET usa o mesmo escopo de prova das demais rotas (inclui VIEWER: só as próprias).
    await findScopedEvent(user, eventId);
    if (req.method === 'GET') return res.status(200).json(await findDrawsRaw(eventId));
    if (req.method !== 'POST') return res.status(405).json({ message: 'Método não permitido.' });
    if (!(OPERATOR_ROLES as readonly string[]).includes(user.role)) {
      return res.status(403).json({ message: 'Seu perfil não pode gerar sorteios.' });
    }
    const parsed = drawConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Configuração do sorteio inválida.', issues: parsed.error.flatten() });
    }
    await generateDraw(user, eventId, parsed.data);
    const [draw] = await findDrawsRaw(eventId, { take: 1 });
    return res.status(201).json(draw);
  } catch (error) {
    return respondDomainError(res, error);
  }
}
