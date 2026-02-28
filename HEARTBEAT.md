# HEARTBEAT.md — PostMaster 📬

## Ciclo de execução

Seguir essa ordem exata. Nada mais.

---

### 0. Carregar contexto (sempre primeiro)

```
memory_search("remetentes conhecidos padrões escalada")
memory_get("memory/senders.md")
memory_get("memory/patterns.md")
```

Usar o que está nesses arquivos para classificar melhor neste ciclo.

---

### 1. Verificar e-mails não lidos

```bash
gog gmail search "in:inbox is:unread" --account lincolnqjunior@gmail.com --max 20
gog gmail search "in:inbox is:unread" --account lincoln@livingnet.com.br --max 20
```

Para cada e-mail:
- Cruzar remetente com `memory/senders.md` — já mapeado?
- Se não mapeado → adicionar na seção "Desconhecidos recentes" do senders.md
- Classificar e aplicar label
- Se urgente → notificar Lincoln via Telegram imediatamente

**Critérios de escalada imediata:**
- Assunto contém: fatura, vencimento, boleto, pagamento, bloqueio, suspensão, erro, 500, critical, alert
- Remetente é pessoa real (não noreply/automático)
- Alerta de segurança real
- Erro de produção (Sentry, monitoramento, infra)

---

### 2. Registrar no daily note

Escrever em `memory/YYYY-MM-DD.md` (append, só se houve algo):

```markdown
## HH:MM — Heartbeat
- gmail: X processados, Y escalados
- livingnet: X processados, Y escalados
- Escalados: [lista resumida com remetente + assunto]
- Novos remetentes: [lista]
- Anomalia de volume? [sim/não — detalhar se sim]
```

---

### 3. Atualizar patterns.md (quando relevante)

Atualizar `memory/patterns.md` quando:
- Volume do dia diverge do padrão esperado (>2x ou <0.5x)
- Nova categoria recorrente surgiu
- Lincoln corrigiu uma escalada (registrar em "O que o Lincoln considera urgente")
- Identificou padrão novo que merece label próprio → adicionar em "Labels sugeridas"

---

### 4. Atualizar senders.md (quando novo remetente identificado)

Mover remetentes de "Desconhecidos recentes" para a categoria correta após 2+ aparições.

---

### 5. Relatório rico (quando escalar)

Ao notificar o Lincoln, usar SEMPRE este formato:

```
📬 PostMaster: Resumo de Inbox

🚨 AÇÕES NECESSÁRIAS (Urgentes)

▪️ [Remetente] • Categoria: [categoria] (Confiança: X%)
🕒 DD/MM, HH:MM | ✉️ [Assunto exato]
📝 O que você precisa saber: [consequência real — não resumo do corpo, mas o impacto]
👉 Ação implícita: [o que o Lincoln deveria fazer]

(repetir bloco acima para cada urgente)

---
🔕 INFORMATIVOS / SILENCIOSOS (Para depois)

• [Remetente]: [fato ocorrido em uma linha]
• [Remetente]: [fato ocorrido em uma linha]

---
📊 Totais: X Urgentes | Y Silenciosos | Z Processados.
```

**Regras:**
- Score de confiança = sua certeza na classificação (0–100%)
- "O que você precisa saber" = CONSEQUÊNCIA real, não resumo do texto
- "Ação implícita" = o que fazer, mesmo que Lincoln não peça
- Silenciosos: sem hora, sem assunto exato — só remetente + fato em 1 linha
- Sem tabelas markdown no relatório final
- Nunca omitir data/hora dos urgentes

Sem urgências → `HEARTBEAT_OK`.

---

### 6. Auto-evolução semanal (toda segunda-feira)

Revisar `memory/patterns.md`:
- Atualizar volumes médios com dados da semana anterior
- Consolidar remetentes novos do senders.md
- Verificar se algum label sugerido já tem volume para criar
- Registrar aprendizados da semana em `memory/YYYY-MM-DD.md`

---

### 7. Integração tldv — Extração automática de transcrições

Ao detectar e-mail do tldv com anotações prontas:

**Identificação:**
- Remetente: `no-reply@tldv.io`
- Assunto contém: "Anotações e respostas por IA da reunião"

**Ação:**
1. Extrair link de reunião do corpo (formato: `https://tldv.io/app/meetings/<ID>`)
2. Executar:
```bash
cd /home/lincoln/.openclaw/workspace
python3 scripts/tldv-extract.py <meeting_url>
```
3. Se salvo com sucesso → notificar Lincoln com o nome do arquivo
4. Se arquivada (código 2) → informar Lincoln que precisa do Chrome relay
5. Se erro de token → avisar Lincoln para renovar (token expira ~12/03/2026)

**Silenciar:**
- E-mails "esgotou seus resumos com IA gratuitos" → HEARTBEAT_OK, sem ação
