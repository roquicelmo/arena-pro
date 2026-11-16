// Gera os INSERTs de UFs e municípios (IBGE) para a migration de localidades.
// Roda uma vez, à mão: node scripts/generate-ibge-localities.mjs > localidades.sql
// Não é chamado por build, teste nem runtime.
const BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades';

const sql = (value) => `'${String(value).replace(/'/g, "''")}'`;

async function get(path) {
  const response = await fetch(`${BASE}/${path}`);
  if (!response.ok) throw new Error(`IBGE ${path}: ${response.status}`);
  return response.json();
}

const states = (await get('estados')).sort((a, b) => a.sigla.localeCompare(b.sigla));
const municipalities = (await get('municipios')).sort((a, b) => a.id - b.id);

const ufOf = (m) =>
  m.microrregiao?.mesorregiao?.UF?.sigla ?? m['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla;

const lines = ['-- Localidades oficiais do IBGE (UFs e municípios).'];
lines.push('INSERT INTO "BrState" ("code", "uf", "name") VALUES');
lines.push(states.map((s) => `(${s.id}, ${sql(s.sigla)}, ${sql(s.nome)})`).join(',\n') + ';');
lines.push('');
lines.push('INSERT INTO "Municipality" ("code", "name", "uf") VALUES');
const rows = municipalities.map((m) => {
  const uf = ufOf(m);
  if (!uf) throw new Error(`Município sem UF: ${m.id} ${m.nome}`);
  return `(${m.id}, ${sql(m.nome)}, ${sql(uf)})`;
});
lines.push(rows.join(',\n') + ';');
console.log(lines.join('\n'));
console.error(`${states.length} UFs, ${rows.length} municípios`);
