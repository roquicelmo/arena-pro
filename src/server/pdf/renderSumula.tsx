import 'server-only';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { groupSumulaByAthlete, paginateByAthlete, paginateSumula, type SumulaRole, type SumulaRun } from '../../lib/sumula';
import { SumulaAtletaDocument } from './SumulaAtletaDocument';
import { SumulaDocument, type SumulaDocumentProps } from './SumulaDocument';

const generatedAt = () =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    .format(new Date())
    .replace(',', '');

/** Gera a súmula (prova ou avulso) e devolve a resposta para download. */
export async function renderSumulaResponse(
  input: Omit<SumulaDocumentProps, 'pages' | 'generatedAt' | 'totalRuns'> & { runs: SumulaRun[] },
  filename: string,
): Promise<Response> {
  const buffer = await renderToBuffer(
    <SumulaDocument {...input} totalRuns={input.runs.length} pages={paginateSumula(input.runs)} generatedAt={generatedAt()} />,
  );
  return pdfResponse(buffer, filename);
}

/** Gera a súmula agrupada por cabeceiro ou por pezeiro. */
export async function renderSumulaAtletaResponse(
  input: { role: SumulaRole; title: string; details: string[]; version: number; runs: SumulaRun[] },
  filename: string,
): Promise<Response> {
  const pages = paginateByAthlete(groupSumulaByAthlete(input.runs, input.role));
  const buffer = await renderToBuffer(
    <SumulaAtletaDocument role={input.role} title={input.title} details={input.details} version={input.version} pages={pages} generatedAt={generatedAt()} />,
  );
  return pdfResponse(buffer, filename);
}

function pdfResponse(buffer: Buffer, filename: string): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
