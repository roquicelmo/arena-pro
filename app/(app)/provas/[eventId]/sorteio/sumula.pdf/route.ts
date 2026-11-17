import { buildFilename, toSumulaRuns } from '../../../../../../src/lib/sumula';
import { renderSumulaResponse } from '../../../../../../src/server/pdf/renderSumula';
import { getLatestDraw, getLatestDrawVersion } from '../../../../../../src/server/services/draws';
import { getEvent } from '../../../../../../src/server/services/events';
import { getCurrentUser } from '../../../../../../src/server/session';

export const runtime = 'nodejs';

const json = (status: number, message: string) => Response.json({ message }, { status });

/** Súmula de pista (PDF) do sorteio mais recente da prova; mesmas regras de acesso da prova. */
export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return json(401, 'É necessário estar autenticado.');
  const { eventId } = await params;
  const event = await getEvent(user, eventId);
  if (!event) return json(404, 'Prova não encontrada.');
  const [draw, version] = await Promise.all([getLatestDraw(user, eventId), getLatestDrawVersion(eventId)]);
  if (!draw?.runs.length || version === null) return json(404, 'Nenhum sorteio gerado para esta prova.');
  return renderSumulaResponse(
    { label: 'Súmula de pista', title: event.name, details: [event.date, event.arena], version, runs: toSumulaRuns(draw.runs) },
    buildFilename(event.name, version),
  );
}
