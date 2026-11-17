import type { NextApiRequest, NextApiResponse } from 'next';
import accessRequests from './routes/access-requests/index';
import runTimes from './routes/runs/[runId]/times';

// Fase 5: só restam os endpoints com consumidor — o formulário público de pedido de
// acesso (POST com reCAPTCHA) e o lançamento de tempos da pista (PATCH). O restante
// migrou para Server Actions e Server Components.

type RouteRequest = NextApiRequest & {
  query: NextApiRequest['query'] & { route?: string };
};
type RouteHandler = (req: RouteRequest, res: NextApiResponse) => unknown;

const handlers: Record<string, RouteHandler> = {
  'access-requests': accessRequests,
  'run-times': runTimes,
};

const routeForPath = (path: string[]) => {
  if (path[0] === 'access-requests' && path.length === 1) return { route: 'access-requests' };
  if (path[0] === 'runs' && path[2] === 'times' && path.length === 3) return { route: 'run-times', runId: path[1] };
  return null;
};

export default async function nextDataGateway(req: NextApiRequest, res: NextApiResponse) {
  const path = Array.isArray(req.query.path) ? req.query.path : [];
  const mapped = routeForPath(path);
  const routeHandler = mapped ? handlers[mapped.route] : undefined;
  if (!mapped || !routeHandler) {
    res.status(404).json({ message: 'Rota da API não encontrada.' });
    return;
  }
  const nextRequest = req as RouteRequest;
  nextRequest.query = { ...req.query, ...mapped };
  await routeHandler(nextRequest, res);
}
