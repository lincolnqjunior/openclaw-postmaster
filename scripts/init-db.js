#!/usr/bin/env node
/**
 * init-db.js — Inicializa o schema do banco de despesas PIX
 * Uso: node init-db.js [--db <path>]
 */
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = (() => {
  const idx = process.argv.indexOf('--db');
  return idx !== -1 ? process.argv[idx + 1] : path.join(__dirname, '../data/despesas_pix.sqlite');
})();

const db = new Database(dbPath);

db.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA foreign_keys=ON;

  CREATE TABLE IF NOT EXISTS comprovantes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    source_uid    TEXT    NOT NULL UNIQUE,
    source        TEXT    NOT NULL,
    data_transacao TEXT   NOT NULL,
    valor         REAL    NOT NULL,
    recebedor     TEXT,
    descricao     TEXT,
    banco_origem  TEXT    NOT NULL,
    categoria     TEXT,
    confianca     REAL,
    status        TEXT    NOT NULL DEFAULT 'pendente_revisao',
    raw_content   TEXT,
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_data_transacao ON comprovantes(data_transacao);
  CREATE INDEX IF NOT EXISTS idx_status         ON comprovantes(status);
  CREATE INDEX IF NOT EXISTS idx_source         ON comprovantes(source);

  CREATE TABLE IF NOT EXISTS ingest_state (
    source        TEXT PRIMARY KEY,
    last_run_at   TEXT,
    last_tx_at    TEXT
  );

  INSERT OR IGNORE INTO ingest_state (source) VALUES ('gpay');
  INSERT OR IGNORE INTO ingest_state (source) VALUES ('bb_xlsx');

  CREATE TABLE IF NOT EXISTS categorias (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    padrao        TEXT    NOT NULL,
    categoria     TEXT    NOT NULL,
    exemplos      TEXT,
    acertos       INTEGER NOT NULL DEFAULT 0,
    criado_em     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  INSERT OR IGNORE INTO categorias (padrao, categoria) VALUES
    ('uber',         'Transporte'),
    ('99',           'Transporte'),
    ('ifood',        'Alimentação'),
    ('rappi',        'Alimentação'),
    ('mercado livre','Compras'),
    ('amazon',       'Compras'),
    ('netflix',      'Assinatura'),
    ('spotify',      'Assinatura'),
    ('farmacia',     'Saúde'),
    ('drogaria',     'Saúde');
`);

console.log('Schema inicializado: ' + dbPath);
db.close();
