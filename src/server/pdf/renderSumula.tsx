import 'server-only';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { paginateSumula, type SumulaRun } from '../../lib/sumula';
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
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
