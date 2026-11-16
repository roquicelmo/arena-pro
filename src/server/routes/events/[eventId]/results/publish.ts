import { getAuthenticatedUser } from '../../../../auth';
import { OPERATOR_ROLES } from '../../../../permissions';
import { publishResults } from '../../../../services/commands/results';
import { respondDomainError } from '../../../domain-error';

interface VercelRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
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
  if (!(OPERATOR_ROLES as readonly string[]).includes(user.role)) return res.status(403).json({ message: 'Seu perfil não pode publicar resultados.' });
  if (req.method !== 'POST') return res.status(405).json({ message: 'Método não permitido.' });
  const eventId = typeof req.query?.eventId === 'string' ? req.query.eventId : '';
  if (!eventId) return res.status(400).json({ message: 'Identificador da prova é obrigatório.' });
  try {
    return res.status(200).json(await publishResults(user, eventId));
  } catch (error) {
    return respondDomainError(res, error);
  }
}
