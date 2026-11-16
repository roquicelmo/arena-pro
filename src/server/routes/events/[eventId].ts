import { z } from 'zod';
import { getAuthenticatedUser } from '../../auth';
import { OPERATOR_ROLES } from '../../permissions';
import { cancelEvent, updateEvent } from '../../services/commands/events';
import { respondDomainError } from '../domain-error';

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

const eventUpdate = z.object({
  name: z.string().trim().min(3).max(160).optional(),
  eventDate: z.string().datetime().optional(),
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
  if (!(OPERATOR_ROLES as readonly string[]).includes(user.role)) {
    return res.status(403).json({ message: 'Seu perfil não pode alterar provas.' });
  }

  const eventId = typeof req.query?.eventId === 'string' ? req.query.eventId : '';
  if (!eventId) return res.status(400).json({ message: 'Identificador da prova é obrigatório.' });

  if (req.method === 'DELETE') {
    try {
      await cancelEvent(user, eventId);
      return res.status(204).json(null);
    } catch (error) {
      return respondDomainError(res, error);
    }
  }

  if (req.method !== 'PATCH') return res.status(405).json({ message: 'Método não permitido.' });
  const parsed = eventUpdate.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Dados da prova inválidos.', issues: parsed.error.flatten() });
  }

  try {
    const event = await updateEvent(user, eventId, {
      name: parsed.data.name,
      eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : undefined,
    });
    return res.status(200).json(event);
  } catch (error) {
    return respondDomainError(res, error);
  }
}
