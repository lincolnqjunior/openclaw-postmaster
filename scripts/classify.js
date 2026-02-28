#!/usr/bin/env node
/**
 * classify.js — Classifica transações pendentes no SQLite
 * Usa categorias conhecidas (few-shot) + sinaliza para revisão humana quando confiança < 0.8
 *
 * Uso:
 *   node classify.js [--db <path>] [--limit <n>] [--dry-run]
 *
 * Saída JSON: array de { id, recebedor, categoria, confianca, needs_review }
 */
const path = require('path');
const Database = require('better-sqlite3');

const args  = process.argv.slice(2);
const get   = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i+1] : def; };
const has   = (flag) => args.includes(flag);

const dbPath   = get('--db',    path.join(__dirname, '../data/despesas_pix.sqlite'));
const limit    = parseInt(get('--limit', '50'), 10);
const dryRun   = has('--dry-run');
const THRESHOLD = 0.80;

function normalize(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

function classify(recebedor, descricao, categorias) {
  const haystack = normalize(recebedor) + ' ' + normalize(descricao);
  let best = { categoria: null, confianca: 0, padrao: null };

  for (const cat of categorias) {
    const padrao = normalize(cat.padrao);
    if (!padrao) continue;

    // Exact substring: confiança base = 0.85 + boost por acertos históricos
    if (haystack.includes(padrao)) {
      const boost = Math.min(cat.acertos * 0.01, 0.14); // max +0.14
      const conf  = Math.min(0.85 + boost, 0.99);
      if (conf > best.confianca) {
        best = { categoria: cat.categoria, confianca: conf, padrao: cat.padrao };
      }
    }
  }

  // Sem match: confiança 0 → vai para revisão humana
  return best.confianca > 0
    ? best
    : { categoria: 'Outros', confianca: 0.0, padrao: null };
}

function main() {
  const db = new Database(dbPath);

  const categorias = db.prepare("SELECT * FROM categorias ORDER BY acertos DESC").all();
  const pendentes  = db.prepare(
    "SELECT id, recebedor, descricao FROM comprovantes WHERE status='pendente_revisao' LIMIT ?"
  ).all(limit);

  console.log(`Categorias conhecidas: ${categorias.length} | Pendentes: ${pendentes.length}`);

  const results = pendentes.map(tx => {
    const { categoria, confianca } = classify(tx.recebedor, tx.descricao, categorias);
    return {
      id:           tx.id,
      recebedor:    tx.recebedor,
      categoria,
      confianca,
      needs_review: confianca < THRESHOLD,
    };
  });

  if (dryRun) {
    console.log(JSON.stringify(results, null, 2));
    db.close();
    return;
  }

  const updateClassified = db.prepare(`
    UPDATE comprovantes
    SET categoria=@categoria, confianca=@confianca, status='classificado', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id=@id
  `);

  const updateReview = db.prepare(`
    UPDATE comprovantes
    SET categoria=@categoria, confianca=@confianca, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id=@id
  `);

  const run = db.transaction((results) => {
    let classified = 0, needsReview = 0;
    for (const r of results) {
      if (r.needs_review) {
        updateReview.run(r);
        needsReview++;
      } else {
        updateClassified.run(r);
        classified++;
      }
    }
    return { classified, needsReview };
  });

  const { classified, needsReview } = run(results);
  console.log(`Classificados: ${classified} | Para revisão: ${needsReview}`);

  // Output JSON para o PostMaster processar as notificações de revisão
  const reviewItems = results.filter(r => r.needs_review);
  if (reviewItems.length > 0) {
    process.stdout.write('\n__REVIEW_NEEDED__\n');
    process.stdout.write(JSON.stringify(reviewItems));
    process.stdout.write('\n');
  }

  db.close();
}

main();
