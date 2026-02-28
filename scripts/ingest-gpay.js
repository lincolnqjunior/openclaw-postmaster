#!/usr/bin/env node
/**
 * ingest-gpay.js — Scrape Google My Activity (GPay) e insere no SQLite
 *
 * Uso:
 *   node ingest-gpay.js [--db <path>] [--profile <path>] [--headless true|false] [--dry-run]
 *
 * Requer: playwright + better-sqlite3
 * Profile: ~/.openclaw/workspaces/postmaster/chrome-profile (login manual na 1ª vez)
 */
const path   = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');
const Database = require('better-sqlite3');

const args = process.argv.slice(2);
const get  = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i+1] : def; };
const has  = (flag) => args.includes(flag);

const dbPath      = get('--db',      path.join(__dirname, '../data/despesas_pix.sqlite'));
const profilePath = get('--profile', path.join(__dirname, '../chrome-profile'));
const headless    = get('--headless', 'true') === 'true';
const dryRun      = has('--dry-run');

const GPAY_URL = 'https://myactivity.google.com/product/gpay/other';
const TIMEOUT  = 30000;

function uid(date, value, recebedor) {
  const hash = crypto.createHash('sha1')
    .update(`${date}|${value}|${recebedor}`)
    .digest('hex')
    .slice(0, 8);
  return `gpay:${date}:${value}:${hash}`;
}

function parseValue(text) {
  // "R$ 29,00" ou "-R$ 29,00" → 29.00 (saída positiva)
  const clean = text.replace(/[R$\s]/g, '').replace('.','').replace(',', '.');
  return Math.abs(parseFloat(clean));
}

async function scrape(lastTxAt) {
  const browser = await chromium.launchPersistentContext(profilePath, {
    headless,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    timeout: TIMEOUT,
  });

  const page = browser.pages().length > 0 ? browser.pages()[0] : await browser.newPage();

  console.log('Navegando para ' + GPAY_URL);
  await page.goto(GPAY_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });

  // Verifica se caiu em login
  const currentUrl = page.url();
  if (currentUrl.includes('accounts.google.com')) {
    await browser.close();
    throw new Error('Sessão expirada — refazer login no Chrome relay e salvar o perfil.');
  }

  // Aguarda items de atividade carregarem
  await page.waitForSelector('c-wiz', { timeout: TIMEOUT }).catch(() => {});

  // Extrai transações do DOM
  const transactions = await page.evaluate((lastTxAtStr) => {
    const results = [];
    const lastTs  = lastTxAtStr ? new Date(lastTxAtStr).getTime() : 0;

    // Seletores do My Activity — podem precisar de ajuste conforme Google atualizar o DOM
    const items = document.querySelectorAll('[data-item-type], .fp-display-item, div[jscontroller]');

    items.forEach(el => {
      const text = el.innerText || '';
      if (!text.includes('R$')) return;

      // Tenta extrair linhas de texto do item
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

      // Valor: linha com "R$"
      const valorLine = lines.find(l => l.includes('R$'));
      if (!valorLine) return;

      // Data: linha com formato de data (dd/mm/aaaa ou "hoje", "ontem")
      const dateLineRaw = lines.find(l => /\d{1,2}\/\d{1,2}\/\d{4}/.test(l) || /hoje|ontem/i.test(l));
      const dateMatch   = dateLineRaw ? dateLineRaw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) : null;
      let dateStr;
      if (dateMatch) {
        dateStr = `${dateMatch[3]}-${String(dateMatch[2]).padStart(2,'0')}-${String(dateMatch[1]).padStart(2,'0')}`;
      } else if (/hoje/i.test(dateLineRaw||'')) {
        dateStr = new Date().toISOString().slice(0,10);
      } else if (/ontem/i.test(dateLineRaw||'')) {
        const d = new Date(); d.setDate(d.getDate()-1);
        dateStr = d.toISOString().slice(0,10);
      } else {
        dateStr = new Date().toISOString().slice(0,10);
      }

      const ts = new Date(dateStr).getTime();
      if (ts <= lastTs) return; // já ingerido

      // Recebedor: linha que não é data nem valor nem status
      const recebedor = lines.find(l =>
        !l.includes('R$') &&
        !/\d{1,2}\/\d{1,2}\/\d{4}/.test(l) &&
        !/hoje|ontem|pix|google pay|realizado|sucesso|falh/i.test(l)
      ) || 'Desconhecido';

      const status = /falh|não (foi|possível)/i.test(text) ? 'falhou' : 'realizado';

      results.push({
        date:      dateStr,
        valorRaw:  valorLine,
        recebedor: recebedor.slice(0, 200),
        status,
        raw:       text.slice(0, 500),
      });
    });

    return results;
  }, lastTxAt);

  await browser.close();
  return transactions;
}

async function main() {
  const db = new Database(dbPath);

  const state   = db.prepare("SELECT last_tx_at FROM ingest_state WHERE source='gpay'").get();
  const lastTxAt = state ? state.last_tx_at : null;

  console.log('Última transação conhecida: ' + (lastTxAt || 'nenhuma'));

  let transactions;
  try {
    transactions = await scrape(lastTxAt);
  } catch (err) {
    console.error('Erro no scraping: ' + err.message);
    process.exit(1);
  }

  console.log(`Transações encontradas: ${transactions.length}`);

  if (dryRun) {
    console.log(JSON.stringify(transactions, null, 2));
    db.close();
    return;
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO comprovantes
      (source_uid, source, data_transacao, valor, recebedor, banco_origem, status, raw_content)
    VALUES
      (@source_uid, 'gpay', @data_transacao, @valor, @recebedor, 'Google Pay', 'pendente_revisao', @raw_content)
  `);

  const updateState = db.prepare(`
    UPDATE ingest_state SET last_run_at=@now, last_tx_at=@last_tx
    WHERE source='gpay'
  `);

  const insertMany = db.transaction((txs) => {
    let inserted = 0;
    let newestDate = lastTxAt || '1970-01-01';
    for (const tx of txs) {
      const valor = parseValue(tx.valorRaw);
      const suid  = uid(tx.date, valor, tx.recebedor);
      const res   = insert.run({
        source_uid:     suid,
        data_transacao: tx.date,
        valor,
        recebedor:      tx.recebedor,
        raw_content:    JSON.stringify(tx),
      });
      if (res.changes > 0) {
        inserted++;
        if (tx.date > newestDate) newestDate = tx.date;
      }
    }
    updateState.run({ now: new Date().toISOString(), last_tx: newestDate });
    return inserted;
  });

  const inserted = insertMany(transactions);
  console.log(`Inseridas: ${inserted} novas transações.`);
  db.close();
}

main().catch(err => { console.error(err); process.exit(1); });
