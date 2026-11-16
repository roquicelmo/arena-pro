import { DomainError } from '../services/errors';

interface JsonResponse {
  status: (code: number) => JsonResponse;
  json: (body: unknown) => void;
}

/** Converte DomainError em resposta HTTP; qualquer outro erro continua subindo. */
export function respondDomainError(res: JsonResponse, error: unknown) {
  if (error instanceof DomainError) return res.status(error.status).json({ message: error.message });
  throw error;
}
