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

Ao notificar o Lincoln, usar formato detalhado:

```
📬 PostMaster — [conta]
• [N] e-mails processados

⚠️ Urgente:
• [Remetente] — [assunto resumido]

📋 Processados silenciosamente:
• 2x Dev/GitHub (PR notifications)
• 1x Finance (extrato automático)
• 3x Promotion (marcados lidos)
```

Sem urgências → `HEARTBEAT_OK`.

---

### 6. Auto-evolução semanal (toda segunda-feira)

Revisar `memory/patterns.md`:
- Atualizar volumes médios com dados da semana anterior
- Consolidar remetentes novos do senders.md
- Verificar se algum label sugerido já tem volume para criar
- Registrar aprendizados da semana em `memory/YYYY-MM-DD.md`
