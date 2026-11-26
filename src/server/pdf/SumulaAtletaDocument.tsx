import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { SumulaAthletePage, SumulaRole } from '../../lib/sumula';
// Registra as fontes Barlow usadas aqui.
import './SumulaDocument';

const INK = '#111111';
const MUTED = '#555555';
const LINE = '#9a9a9a';
const BAND = '#e2e2e2';

const s = StyleSheet.create({
  page: { paddingTop: 26, paddingBottom: 46, paddingHorizontal: 28, fontFamily: 'Barlow', fontSize: 9.5, color: INK },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1.2, borderColor: INK, paddingBottom: 6, marginBottom: 8 },
  label: { fontFamily: 'Barlow Condensed', fontWeight: 600, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: MUTED },
  title: { fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 17, textTransform: 'uppercase' },
  meta: { fontSize: 8.5, color: MUTED, marginTop: 1 },
  right: { alignItems: 'flex-end', justifyContent: 'flex-end' },
  pageNo: { fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 11 },
  band: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 24, backgroundColor: BAND, paddingHorizontal: 6, marginBottom: 2 },
  bandText: { fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  bandMeta: { fontFamily: 'Barlow Condensed', fontWeight: 600, fontSize: 10, color: MUTED },
  head: { flexDirection: 'row', alignItems: 'center', height: 18, borderBottomWidth: 1, borderColor: INK },
  th: { fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', height: 22, borderBottomWidth: 0.6, borderBottomStyle: 'dashed', borderColor: LINE },
  num: { fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 11 },
  name: { fontWeight: 600 },
  hc: { color: MUTED },
  footer: { position: 'absolute', left: 28, right: 28, bottom: 20, fontSize: 8, color: MUTED },
});

const hc = (n: number) => n.toFixed(1).replace('.', ',');
const athlete = (a: { nome: string; hc: number }) => (
  <Text><Text style={s.name}>{a.nome}</Text> <Text style={s.hc}>({hc(a.hc)})</Text></Text>
);

export interface SumulaAtletaDocumentProps {
  role: SumulaRole;
  title: string;
  details: string[];
  version: number;
  pages: SumulaAthletePage[];
  generatedAt: string;
}

/** Súmula agrupada por cabeceiro ou por pezeiro: uma página por atleta, com as corridas em ordem de entrada. */
export function SumulaAtletaDocument({ role, title, details, version, pages, generatedAt }: SumulaAtletaDocumentProps) {
  const label = role === 'CABECEIRO' ? 'Súmula por cabeceiro' : 'Súmula por pezeiro';
  return (
    <Document title={`${label} — ${title}`} author="Arena Pro">
      {pages.map(({ group, runs, continued }, index) => (
        <Page key={index} size="A4" orientation="portrait" style={s.page}>
          <View style={s.header}>
            <View>
              <Text style={s.label}>{label}</Text>
              <Text style={s.title}>{title}</Text>
              {details.length > 0 && <Text style={s.meta}>{details.join(' · ')}</Text>}
            </View>
            <View style={s.right}>
              <Text style={s.label}>Versão {version}</Text>
              <Text style={s.pageNo}>Página {index + 1} de {pages.length}</Text>
            </View>
          </View>
          <View style={s.band}>
            <Text style={s.bandText}>
              {group.nome} ({hc(group.hc)}){continued ? ' · continuação' : ''}
            </Text>
            <Text style={s.bandMeta}>{group.runs.length} {group.runs.length === 1 ? 'corrida' : 'corridas'}</Text>
          </View>
          <View style={s.head}>
            <Text style={[s.th, { width: 52 }]}>Posição</Text>
            <Text style={[s.th, { flex: 1 }]}>Cabeceiro</Text>
            <Text style={[s.th, { flex: 1 }]}>Pezeiro</Text>
            <Text style={[s.th, { width: 40, textAlign: 'center' }]}>SHC</Text>
            <Text style={[s.th, { width: 50, textAlign: 'center' }]}>Bateria</Text>
          </View>
          {runs.map((run) => (
            <View key={run.numero} style={s.row} wrap={false}>
              <Text style={[s.num, { width: 52 }]}>{run.numero}</Text>
              <View style={{ flex: 1, paddingRight: 4 }}>{athlete(run.cabeceiro)}</View>
              <View style={{ flex: 1, paddingRight: 4 }}>{athlete(run.pezeiro)}</View>
              <Text style={{ width: 40, textAlign: 'center' }}>{hc(run.shc)}</Text>
              <Text style={{ width: 50, textAlign: 'center' }}>{run.bateria}</Text>
            </View>
          ))}
          <Text style={s.footer} fixed>Arena Pro · gerado em {generatedAt}</Text>
        </Page>
      ))}
    </Document>
  );
}
