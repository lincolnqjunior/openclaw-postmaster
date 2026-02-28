# HEARTBEAT.md — PostMaster PIX Automation

## Rotina diária (21h BRT via cron)

### 1. Ingestão GPay
```
cd /home/lincoln/.openclaw/workspaces/postmaster
node scripts/ingest-gpay.js
```
- Reutiliza sessão Chrome relay (aba wallet.google.com já aberta)
- Se erro "Sessão expirada" → notificar Lincoln para reabrir aba e re-exportar cookies

### 2. Classificar pendentes
```
node scripts/classify.js
```
- Items com confiança < 0.80 → enviar Telegram ao Lincoln (1 por 1, não agrupado)
- Formato: "Nova transação: R$ XX para NOME — qual categoria?"

### 3. Relatório
```
node scripts/report.js --type daily    # todo dia
node scripts/report.js --type weekly   # domingo
node scripts/report.js --type monthly  # último dia do mês
```

## Rotina fim de mês (último dia às 21h)

1. Gerar relatório mensal
2. Enviar relatório ao Lincoln
3. Solicitar extrato BB: "Lincoln, fechamento do mês. Me manda o extrato do BB (.csv) para conciliação."
4. Salvar state: data/state.json → { "waiting_for": "bb_extract", "since": "<timestamp>" }
5. Quando arquivo chegar: node scripts/ingest-bb-xlsx.js --file <path> (aceita CSV também)
6. Detectar e marcar duplicatas GPay/BB
7. Enviar relatório consolidado final

## Verificar em cada heartbeat

- data/state.json — se waiting_for: "bb_extract" e >2 dias → reenviar lembrete
- Cookies Google expiram em 2027-04-04 — avisar Lincoln 30 dias antes

## Contatos fixos para classificação automática

ELIANE DOS SANTOS    → Faxina
ALCIR BUENO FRANCO   → Aluguel
ASSOC FRANCISCANA    → Educação/Escola
Claudemir Constantino→ Bar/Tabacaria
STEPHANY CABRAL      → Pet Shop (Jessie/cachorra, Frida e Luke/gatos)
GUSTAVO DEISTER      → Ervas Medicinais
ENZO ITAIPAVA        → Combustível
AUTO POSTO           → Combustível
DISTRIBUIDORA CORREAS→ Água Potável
BB Rende Fácil       → Transferência Interna (NUNCA contar como gasto)
LIVING CONSULT       → receita/salário (ignorar para despesas)
