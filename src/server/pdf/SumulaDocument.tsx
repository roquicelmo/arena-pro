import path from 'node:path';
import React from 'react';
import { Document, Font, Line, Page, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import type { SumulaItem, SumulaPage, SumulaRun } from '../../lib/sumula';

const fontDir = path.join(process.cwd(), 'src/server/pdf/fonts');
Font.register({
  family: 'Barlow',
  fonts: [
    { src: path.join(fontDir, 'barlow-latin-400-normal.woff'), fontWeight: 400 },
    { src: path.join(fontDir, 'barlow-latin-600-normal.woff'), fontWeight: 600 },
  ],
});
Font.register({
  family: 'Barlow Condensed',
  fonts: [
    { src: path.join(fontDir, 'barlow-condensed-latin-600-normal.woff'), fontWeight: 600 },
    { src: path.join(fontDir, 'barlow-condensed-latin-700-normal.woff'), fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const INK = '#111111';
const MUTED = '#555555';
const LINE = '#9a9a9a';
const ZEBRA = '#f3f3f3';
const BAND = '#e2e2e2';

const s = StyleSheet.create({
  page: { paddingTop: 26, paddingBottom: 54, paddingHorizontal: 28, fontFamily: 'Barlow', fontSize: 8.5, color: INK },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1.2, borderColor: INK, paddingBottom: 6, marginBottom: 6 },
  label: { fontFamily: 'Barlow Condensed', fontWeight: 600, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: MUTED },
  title: { fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 17, textTransform: 'uppercase' },
  meta: { fontSize: 8.5, color: MUTED, marginTop: 1 },
  right: { alignItems: 'flex-end', justifyContent: 'flex-end' },
  pageNo: { fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 11 },
  row: { flexDirection: 'row', alignItems: 'center', height: 22, borderBottomWidth: 0.5, borderColor: LINE },
  head: { flexDirection: 'row', alignItems: 'center', height: 16, borderBottomWidth: 1, borderColor: INK },
  th: { fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: 0.6 },
  band: { flexDirection: 'row', alignItems: 'center', height: 22, backgroundColor: BAND, paddingHorizontal: 6 },
  bandText: { fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  num: { fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 11, textAlign: 'center' },
  name: { fontWeight: 600 },
  hc: { color: MUTED },
  box: { height: 15, marginHorizontal: 3, borderWidth: 0.8, borderColor: INK },
  footer: { position: 'absolute', left: 28, right: 28, bottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 8, color: MUTED },
  signature: { width: 190, borderTopWidth: 0.8, borderColor: INK, paddingTop: 3, textAlign: 'center', color: INK },
});

const hc = (n: number) => n.toFixed(1).replace('.', ',');

function TimeBox({ crossed }: { crossed: boolean }) {
  if (!crossed) return <View style={s.box} />;
  return (
    <View style={[s.box, { backgroundColor: ZEBRA, borderColor: LINE }]}>
      <Svg width="100%" height="100%" viewBox="0 0 40 15" preserveAspectRatio="none">
        <Line x1="0" y1="15" x2="40" y2="0" stroke={LINE} strokeWidth={1} />
      </Svg>
    </View>
  );
}

function Columns({ mixed }: { mixed: boolean }) {
  return (
    <View style={s.head} fixed>
      <Text style={[s.th, { width: 26, textAlign: 'center' }]}>Nº</Text>
      {mixed && <Text style={[s.th, { width: 30, textAlign: 'center' }]}>Grupos</Text>}
      <Text style={[s.th, { flex: 1, paddingLeft: 4 }]}>Cabeceiro</Text>
      <Text style={[s.th, { flex: 1, paddingLeft: 4 }]}>Pezeiro</Text>
      <Text style={[s.th, { width: 30, textAlign: 'center' }]}>SHC</Text>
      {['T1', 'T2', 'T3', 'Total'].map((t) => (
        <Text key={t} style={[s.th, { width: t === 'Total' ? 50 : 42, textAlign: 'center' }]}>{t}</Text>
      ))}
    </View>
  );
}

function RunRow({ run, mixed, zebra }: { run: SumulaRun; mixed: boolean; zebra: boolean }) {
  return (
    <View style={[s.row, zebra ? { backgroundColor: ZEBRA } : {}]} wrap={false}>
      <Text style={[s.num, { width: 26 }]}>{run.numero}</Text>
      {mixed && <Text style={{ width: 30, textAlign: 'center' }}>{run.grupoCab}×{run.grupoPe}</Text>}
      <Text style={{ flex: 1, paddingLeft: 4 }}><Text style={s.name}>{run.cabeceiro.nome}</Text> <Text style={s.hc}>{hc(run.cabeceiro.hc)}</Text></Text>
      <Text style={{ flex: 1, paddingLeft: 4 }}><Text style={s.name}>{run.pezeiro.nome}</Text> <Text style={s.hc}>{hc(run.pezeiro.hc)}</Text></Text>
      <Text style={{ width: 30, textAlign: 'center' }}>{hc(run.shc)}</Text>
      {[1, 2, 3].map((bull) => (
        <View key={bull} style={{ width: 42 }}><TimeBox crossed={bull > run.bois} /></View>
      ))}
      <View style={{ width: 50 }}><TimeBox crossed={false} /></View>
    </View>
  );
}

export interface SumulaDocumentProps {
  label: 'Súmula de pista' | 'Sorteio';
  title: string;
  details: string[];
  version: number | null;
  totalRuns: number;
  pages: SumulaPage[];
  generatedAt: string;
}

/** Súmula A4 retrato em preto e cinzas (spec 7); paginação já resolvida por `paginateSumula`. */
export function SumulaDocument({ label, title, details, version, totalRuns, pages, generatedAt }: SumulaDocumentProps) {
  const mixedAny = pages.some((p) => p.some((i) => i.mixed));
  return (
    <Document title={`${label} — ${title}`} author="Arena Pro">
      {pages.map((items: SumulaItem[], index) => (
        <Page key={index} size="A4" orientation="portrait" style={s.page}>
          <View style={s.header}>
            <View>
              <Text style={s.label}>{label}</Text>
              <Text style={s.title}>{title}</Text>
              {details.length > 0 && <Text style={s.meta}>{details.join(' · ')}</Text>}
            </View>
            <View style={s.right}>
              {version !== null && <Text style={s.label}>Versão {version}</Text>}
              <Text style={s.meta}>{totalRuns} corridas</Text>
              <Text style={s.pageNo}>Página {index + 1} de {pages.length}</Text>
            </View>
          </View>
          <Columns mixed={mixedAny} />
          {items.map((item, i) =>
            item.kind === 'band' ? (
              <View key={`b${i}`} style={s.band}><Text style={s.bandText}>{item.label}</Text></View>
            ) : (
              <RunRow key={item.run.numero} run={item.run} mixed={mixedAny} zebra={item.run.numero % 2 === 0} />
            ),
          )}
          <View style={s.footer} fixed>
            <Text>Arena Pro · gerado em {generatedAt}</Text>
            <Text style={s.signature}>Assinatura do juiz</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
