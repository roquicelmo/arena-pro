import { getAuthenticatedUser } from '../../auth';
import { OPERATOR_ROLES } from '../../permissions';
import { createEvent } from '../../services/commands/events';
import { respondDomainError } from '../domain-error';
import { findEventsRaw } from '../../services/raw';
import { z } from 'zod';

interface VercelRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
}

const eventInput = z.object({
  name: z.string().trim().min(3).max(160),
  eventDate: z.string().datetime(),
  arenaId: z.string().trim().min(1).optional(),
  arenaName: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().length(2).toUpperCase(),
});

const VIEW_ROLES: readonly string[] = [...OPERATOR_ROLES, 'TRACK_OPERATOR', 'ANNOUNCER', 'JUDGE', 'VIEWER'];

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
  if (!VIEW_ROLES.includes(user.role)) {
    return res.status(403).json({ message: 'Seu perfil não pode consultar provas.' });
  }
  if (req.method === 'POST') {
    if (!(OPERATOR_ROLES as readonly string[]).includes(user.role)) {
      return res.status(403).json({ message: 'Seu perfil não pode criar provas.' });
    }
    const parsed = eventInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados da prova inválidos.', issues: parsed.error.flatten() });
    }

    const requestedOwnerId = typeof (req.body as { ownerId?: unknown })?.ownerId === 'string'
      ? (req.body as { ownerId: string }).ownerId
      : undefined;
    try {
      const event = await createEvent(user, {
        name: parsed.data.name,
        eventDate: new Date(parsed.data.eventDate),
        arenaId: parsed.data.arenaId,
        newArena: { name: parsed.data.arenaName, city: parsed.data.city, state: parsed.data.state },
        ownerId: requestedOwnerId,
      });
      return res.status(201).json(event);
    } catch (error) {
      return respondDomainError(res, error);
    }
  }

  if (req.method !== 'GET') return res.status(405).json({ message: 'Método não permitido.' });

  const ownerId = typeof req.query?.ownerId === 'string' ? req.query.ownerId : undefined;
  const events = await findEventsRaw(user, { ownerId });

  return res.status(200).json(events);
}
