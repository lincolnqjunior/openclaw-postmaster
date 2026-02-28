#!/usr/bin/env node
/**
 * ingest-bb-xlsx.js — Importa extrato BB (.xlsx) para o SQLite
 *
 * Uso:
 *   node ingest-bb-xlsx.js --file <path.xlsx> [--db <path>] [--dry-run]
 *
 * Colunas esperadas: Data, Lançamento, Detalhes, N° documento, Valor, Tipo Lançamento
 */
const path  = require('path');
const XLSX  = require('xlsx');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const args  = process.argv.slice(2);
const get   = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i+1] : def; };
const has   = (flag) => args.includes(flag);

const filePath = get('--file', null);
const dbPath   = get('--db',   path.join(__dirname, '../data/despesas_pix.sqlite'));
const dryRun   = has('--dry-run');

if (!filePath) {
  console.error('Erro: --file <path.xlsx> obrigatório');
  process.exit(1);
}

function uid(date, doc, value) {
  const hash = crypto.createHash('sha1')
    .update(`${date}|${doc}|${value}`)
    .digest('hex')
    .slice(0, 8);
  return `bb:${doc || hash}:${date}:${value}`;
}

function parseDate(raw) {
  // "01/02/2026" → "2026-02-01"
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // Excel serial date
  if (!isNaN(Number(s))) {
    const d = XLSX.SSF.parse_date_code(Number(s));
    return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  return s;
}

function parseValue(raw) {
  if (!raw) return null;
  const s = String(raw).replace(/[R$\s]/g,'').replace('.','').replace(',','.');
  return Math.abs(parseFloat(s));
}

function extractRecebedor(detalhes) {
  if (!detalhes) return null;
  const s = String(detalhes).trim();
  // Padrão PIX: "31/01 18:55 Claudemir Constantino Port"
  const m = s.match(/\d{2}\/\d{2}\s+\d{2}:\d{2}\s+(.+)/);
  if (m) return m[1].trim().slice(0, 200);
  return s.slice(0, 200);
}

function main() {
  const wb   = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows  = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  console.log(`Planilha: ${wb.SheetNames[0]} — ${rows.length} linhas`);

  // Filtra apenas saídas
  const saidas = rows.filter(r => {
    const tipo = String(r['Tipo Lançamento'] || '').toLowerCase();
    return tipo.includes('saída') || tipo.includes('saida') || tipo.includes('débito') || tipo.includes('debito');
  });

  console.log(`Saídas encontradas: ${saidas.length}`);

  if (dryRun) {
    saidas.slice(0, 5).forEach(r => console.log(JSON.stringify(r)));
    return;
  }

  const db = new Database(dbPath);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO comprovantes
      (source_uid, source, data_transacao, valor, recebedor, descricao, banco_origem, status, raw_content)
    VALUES
      (@source_uid, 'bb_xlsx', @data_transacao, @valor, @recebedor, @descricao, 'Banco do Brasil', 'pendente_revisao', @raw_content)
  `);

  const updateState = db.prepare(`
    UPDATE ingest_state SET last_run_at=@now, last_tx_at=@last_tx
    WHERE source='bb_xlsx'
  `);

  const run = db.transaction((rows) => {
    let inserted = 0;
    let newestDate = '1970-01-01';
    for (const r of rows) {
      const dateStr  = parseDate(r['Data']);
      const valor    = parseValue(r['Valor']);
      const doc      = String(r['N° documento'] || '').trim();
      const detalhes = String(r['Detalhes'] || '').trim();
      const lancamento = String(r['Lançamento'] || '').trim();

      if (!dateStr || valor === null || isNaN(valor)) continue;

      const recebedor = extractRecebedor(detalhes) || lancamento;
      const suid      = uid(dateStr, doc, valor);

      const res = insert.run({
        source_uid:     suid,
        data_transacao: dateStr,
        valor,
        recebedor,
        descricao:      detalhes,
        raw_content:    JSON.stringify(r),
      });
      if (res.changes > 0) {
        inserted++;
        if (dateStr > newestDate) newestDate = dateStr;
      }
    }
    updateState.run({ now: new Date().toISOString(), last_tx: newestDate });
    return inserted;
  });

  const inserted = run(saidas);
  console.log(`Inseridas: ${inserted} novas transações.`);
  db.close();
}

main();
