import { quickSumulaSchema } from '../../../../src/lib/schemas/draws';
import { buildFilename } from '../../../../src/lib/sumula';
import { renderSumulaResponse } from '../../../../src/server/pdf/renderSumula';
import { buildQuickSumula } from '../../../../src/server/services/commands/draws';
import { DomainError } from '../../../../src/server/services/errors';
import { OPERATOR_ROLES } from '../../../../src/server/permissions';
import { getCurrentUser } from '../../../../src/server/session';

export const runtime = 'nodejs';

const json = (status: number, message: string) => Response.json({ message }, { status });

/** PDF do sorteio avulso: recebe as corridas revisadas na tela e não sorteia de novo (spec 6.8). */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return json(401, 'É necessário estar autenticado.');
  if (!(OPERATOR_ROLES as readonly string[]).includes(user.role)) return json(403, 'Seu perfil não pode gerar sorteios.');
  const parsed = quickSumulaSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, parsed.error.issues[0]?.message ?? 'Dados do sorteio inválidos.');
  const { title, date, place, runs } = parsed.data;
  try {
    const sumula = await buildQuickSumula(user, runs);
    const details = [date ? date.split('-').reverse().join('/') : '', place ?? ''].filter(Boolean);
    return renderSumulaResponse({ label: 'Sorteio', title, details, version: null, runs: sumula }, buildFilename(title, null));
  } catch (error) {
    if (error instanceof DomainError) return json(error.status, error.message);
    throw error;
  }
}
