import { buildAthleteFilename, toSumulaRuns, type SumulaRole } from '../../../../../src/lib/sumula';
import { renderSumulaAtletaResponse } from '../../../../../src/server/pdf/renderSumula';
import { getLatestDraw, getLatestDrawVersion } from '../../../../../src/server/services/draws';
import { getEvent } from '../../../../../src/server/services/events';
import { getCurrentUser } from '../../../../../src/server/session';

const json = (status: number, message: string) => Response.json({ message }, { status });

/** Súmula do sorteio mais recente agrupada por atleta; mesmas regras de acesso da súmula de pista. */
export async function sumulaAtletaResponse(eventId: string, role: SumulaRole): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return json(401, 'É necessário estar autenticado.');
  const event = await getEvent(user, eventId);
  if (!event) return json(404, 'Prova não encontrada.');
  const [draw, version] = await Promise.all([getLatestDraw(user, eventId), getLatestDrawVersion(eventId)]);
  if (!draw?.runs.length || version === null) return json(404, 'Nenhum sorteio gerado para esta prova.');
  return renderSumulaAtletaResponse(
    { role, title: event.name, details: [event.date, event.arena], version, runs: toSumulaRuns(draw.runs) },
    buildAthleteFilename(event.name, version, role),
  );
}
