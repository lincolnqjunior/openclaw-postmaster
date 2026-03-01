#!/usr/bin/env node
/**
 * ingest-gpay.js — Extrai transações do wallet.google.com reutilizando
 * sessão aberta no Chrome relay (ou navegando com cookies salvos).
 *
 * Uso:
 *   node ingest-gpay.js [--db <path>] [--cookies <path>] [--dry-run]
 */
const path     = require('path');
const crypto   = require('crypto');
const fs       = require('fs');
const { chromium } = require('playwright');
const Database  = require('better-sqlite3');

const args = process.argv.slice(2);
const get  = (f, d) => { const i = args.indexOf(f); return i !== -1 ? args[i+1] : d; };
const has  = f => args.includes(f);

const dbPath     = get('--db',      path.join(__dirname, '../data/despesas_pix.sqlite'));
const cookiePath = get('--cookies', path.join(__dirname, '../data/cookies-google.json'));
const dryRun     = has('--dry-run');

const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || require("../../../openclaw.json").gateway.auth.token;
const WALLET_URL    = 'https://wallet.google.com/wallet/transactions';

function makeUid(date, valor, recebedor) {
  const h = crypto.createHash('sha1').update(`${date}|${valor}|${recebedor}`).digest('hex').slice(0, 8);
  return `gpay:${date}:${valor}:${h}`;
}

function parseValor(text) {
  const m = text.match(/R\$\s*([\d.,]+)/);
  if (!m) return null;
  return parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
}

function parseDate(raw) {
  const hoje = new Date();
  const pad  = n => String(n).padStart(2, '0');
  const meses = { jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12 };

  const d = (raw || '').toLowerCase().trim();
  if (/hoje/.test(d))  return hoje.toISOString().slice(0,10);
  if (/ontem/.test(d)) { const dd = new Date(hoje); dd.setDate(dd.getDate()-1); return dd.toISOString().slice(0,10); }

  const mMatch = d.match(/(\d{1,2})\s+de\s+([a-zç]{3})/);
  if (mMatch && meses[mMatch[2]]) {
    let year = hoje.getFullYear();
    if (meses[mMatch[2]] > hoje.getMonth() + 1) year--;
    return `${year}-${pad(meses[mMatch[2]])}-${pad(parseInt(mMatch[1]))}`;
  }

  const diasPT = { seg:1,ter:2,qua:3,qui:4,sex:5,sáb:6,sab:6,dom:0 };
  for (const [nome, wday] of Object.entries(diasPT)) {
    if (d.includes(nome)) {
      const diff = (hoje.getDay() - wday + 7) % 7 || 7;
      const dd = new Date(hoje); dd.setDate(dd.getDate() - diff);
      return dd.toISOString().slice(0,10);
    }
  }
  return hoje.toISOString().slice(0,10);
}

async function extractFromPage(page) {
  // Clica "Ver mais" até sumir
  for (let i = 0; i < 10; i++) {
    const btn = await page.$('button:has-text("Ver mais transações")');
    if (!btn) break;
    await btn.click();
    await page.waitForTimeout(1500);
  }

  return page.evaluate(() => {
    // Filtra via JS resolvendo a.href (não o atributo relativo)
    const links = [...document.querySelectorAll('a')]
      .filter(a => a.href.includes('/wallet/transactions/') &&
                   a.href !== 'https://wallet.google.com/wallet/transactions' &&
                   !a.href.endsWith('/transactions'));

    return links.map(a => {
      const lines  = (a.innerText || '').split('\n').map(l => l.trim()).filter(Boolean);
      const txId   = a.href.split('/').pop();
      const isFail = lines.some(l => /com falha/i.test(l));
      const recebedor = lines[1] || lines[0] || 'Desconhecido';
      const dateRaw   = lines[2] || lines[1] || '';
      const valorLine = lines.find(l => l.includes('R$')) || '';
      return { recebedor, dateRaw, valorLine, isFail, txId, raw: lines.join(' | ').slice(0, 400) };
    });
  });
}

async function main() {
  const db       = new Database(dbPath);
  const state    = db.prepare("SELECT last_tx_at FROM ingest_state WHERE source='gpay'").get();
  const lastTxAt = state ? state.last_tx_at : null;

  console.log(`Última tx registrada: ${lastTxAt || 'nenhuma'}`);

  // Conecta no Chrome relay que já tem a sessão aberta
  const browser = await chromium.connectOverCDP(`ws://127.0.0.1:18792/cdp?token=${GATEWAY_TOKEN}`);
  const ctx     = browser.contexts()[0];

  // Reusar página do wallet já aberta, ou abrir nova
  let page = ctx.pages().find(p => p.url().includes('wallet.google.com/wallet/transactions'));
  if (!page) {
    console.log('Abrindo nova aba do wallet...');
    const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
    page = await ctx.newPage();
    await ctx.addCookies(cookies);
    await page.goto(WALLET_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
  } else {
    console.log('Reutilizando aba já aberta:', page.url());
    // Recarrega para garantir dados frescos
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
  }

  if (page.url().includes('accounts.google.com')) {
    await browser.close(); db.close();
    console.error('Sessão expirada — re-exportar cookies.');
    process.exit(1);
  }

  const raw = await extractFromPage(page);
  await browser.close();

  console.log(`Links encontrados na página: ${raw.length}`);

  // Processar e filtrar
  const parsed = raw
    .filter(t => !t.isFail && t.valorLine)
    .map(t => {
      const valor    = parseValor(t.valorLine);
      const dateStr  = parseDate(t.dateRaw);
      if (!valor) return null;
      if (lastTxAt && dateStr <= lastTxAt) return null;
      return { ...t, valor, dateStr };
    })
    .filter(Boolean);

  console.log(`Transações válidas (novas): ${parsed.length}`);

  if (dryRun) {
    parsed.forEach(t => console.log(`  ${t.dateStr} | ${t.recebedor.slice(0,40).padEnd(40)} | R$ ${t.valor.toFixed(2)}`));
    db.close();
    return;
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO comprovantes
      (source_uid, source, data_transacao, valor, recebedor, banco_origem, status, raw_content)
    VALUES
      (@source_uid,'gpay',@data_transacao,@valor,@recebedor,'Google Pay','pendente_revisao',@raw_content)
  `);
  const updState = db.prepare(
    "UPDATE ingest_state SET last_run_at=@now, last_tx_at=@tx WHERE source='gpay'"
  );

  const inserted = db.transaction(txs => {
    let n = 0, newest = lastTxAt || '1970-01-01';
    for (const t of txs) {
      const r = insert.run({
        source_uid:     makeUid(t.dateStr, t.valor, t.recebedor),
        data_transacao: t.dateStr,
        valor:          t.valor,
        recebedor:      t.recebedor.slice(0, 200),
        raw_content:    JSON.stringify(t),
      });
      if (r.changes > 0) { n++; if (t.dateStr > newest) newest = t.dateStr; }
    }
    updState.run({ now: new Date().toISOString(), tx: newest });
    return n;
  })(parsed);

  console.log(`Inseridas no banco: ${inserted}`);
  db.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
