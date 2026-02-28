# HEARTBEAT — PostMaster

## 1. Ingestão GPay (1x por dia)
Verifica se já rodou hoje. Se não, executa:
```bash
node /home/lincoln/.openclaw/workspaces/postmaster/scripts/ingest-gpay.js
```
Se retornar "Sessão expirada", notifica o Arquiteto via sessions_send.

## 2. Classificação automática
Após qualquer ingestão, ou se houver pendentes:
```bash
node /home/lincoln/.openclaw/workspaces/postmaster/scripts/classify.js
```
Para cada item com `needs_review: true`, enviar mensagem individual ao Lincoln via Telegram:
> "💸 Nova despesa não reconhecida: **[recebedor]** — R$ [valor] em [data].
> Qual categoria? (ex: Transporte, Alimentação, Saúde, Compras, Assinatura, Outros)"

Aguardar resposta antes de enviar a próxima (sem agrupar).

## 3. Email
```bash
gog gmail search "in:inbox is:unread newer_than:3d" --account lincolnqjunior@gmail.com --max 20
gog gmail search "in:inbox is:unread newer_than:3d" --account lincoln@livingnet.com.br --max 20
```

## 4. Fechamento mensal (último dia do mês)
Se hoje for o último dia do mês e state.json não tiver `waiting_for`, enviar:
> "📊 Fim de mês! Me manda o extrato do **Banco do Brasil** (.xlsx) para fechar o mês."
Salvar `state.json` com `{ "waiting_for": "bb_extract", "since": "<now>" }`.

## 5. Processar upload de extrato
Se `state.json.waiting_for == "bb_extract"` e Lincoln enviou um arquivo .xlsx:
```bash
node /home/lincoln/.openclaw/workspaces/postmaster/scripts/ingest-bb-xlsx.js --file <path>
node /home/lincoln/.openclaw/workspaces/postmaster/scripts/classify.js
```
Limpar `waiting_for` após processar.
