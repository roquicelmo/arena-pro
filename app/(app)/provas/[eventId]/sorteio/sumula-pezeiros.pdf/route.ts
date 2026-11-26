import { sumulaAtletaResponse } from '../sumulaAtleta';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  return sumulaAtletaResponse((await params).eventId, 'PEZEIRO');
}
