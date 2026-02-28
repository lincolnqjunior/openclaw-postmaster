#!/usr/bin/env node
/**
 * report.js — Gera relatório de despesas para envio via Telegram
 *
 * Uso:
 *   node report.js --type daily|weekly|monthly [--db <path>] [--date YYYY-MM-DD]
 *
 * Saída: texto formatado (stdout)
 */
const path = require('path');
const Database = require('better-sqlite3');

const args  = process.argv.slice(2);
const get   = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i+1] : def; };

const type   = get('--type',  'daily');
const dbPath = get('--db',    path.join(__dirname, '../data/despesas_pix.sqlite'));
const refDate = get('--date', new Date().toISOString().slice(0, 10));

function fmt(v) {
  return 'R$ ' + v.toFixed(2).replace('.', ',');
}

function getRange(type, refDate) {
  const d = new Date(refDate + 'T00:00:00');
  if (type === 'daily') {
    return { from: refDate, to: refDate, label: `📅 Diário — ${refDate}` };
  }
  if (type === 'weekly') {
    const day = d.getDay(); // 0=dom
    const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7));
    const sun = new Date(d); sun.setDate(mon.getDate() + 6);
    return {
      from:  mon.toISOString().slice(0,10),
      to:    sun.toISOString().slice(0,10),
      label: `📅 Semanal — ${mon.toISOString().slice(0,10)} a ${sun.toISOString().slice(0,10)}`,
    };
  }
  if (type === 'monthly') {
    const from = `${refDate.slice(0,7)}-01`;
    const to   = refDate;
    return { from, to, label: `📅 Mensal — ${refDate.slice(0,7)}` };
  }
  throw new Error('Tipo inválido: ' + type);
}

function main() {
  const db = new Database(dbPath, { readonly: true });
  const { from, to, label } = getRange(type, refDate);

  const rows = db.prepare(`
    SELECT categoria, SUM(valor) as total, COUNT(*) as qtd
    FROM comprovantes
    WHERE data_transacao BETWEEN ? AND ?
      AND status IN ('classificado', 'pendente_revisao')
    GROUP BY categoria
    ORDER BY total DESC
  `).all(from, to);

  const total = rows.reduce((s, r) => s + r.total, 0);
  const pending = db.prepare(`
    SELECT COUNT(*) as n FROM comprovantes
    WHERE data_transacao BETWEEN ? AND ? AND status='pendente_revisao'
  `).get(from, to);

  if (rows.length === 0) {
    console.log(`${label}\n\nNenhuma despesa registrada no período.`);
    db.close();
    return;
  }

  const lines = [label, ''];
  for (const r of rows) {
    const cat = r.categoria || 'Sem categoria';
    lines.push(`${cat}: ${fmt(r.total)} (${r.qtd}x)`);
  }
  lines.push('');
  lines.push(`💰 Total: ${fmt(total)}`);
  if (pending.n > 0) {
    lines.push(`⚠️ ${pending.n} transação(ões) aguardando classificação`);
  }

  console.log(lines.join('\n'));
  db.close();
}

main();
