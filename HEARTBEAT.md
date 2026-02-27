# HEARTBEAT.md — PostMaster 📬

## Checklist de Heartbeat

A cada execução, seguir essa ordem. Nada mais.

---

### 0. Consultar memória (sempre primeiro)

Antes de qualquer coisa, recuperar contexto acumulado:

```
memory_search("remetentes conhecidos padrões e-mail")
memory_search("critérios escalada Lincoln")
```

Usar o que foi aprendido para classificar melhor neste ciclo.

---

### 1. Verificar e-mails não lidos

```bash
gog gmail search "in:inbox is:unread" --account lincolnqjunior@gmail.com --max 20
gog gmail search "in:inbox is:unread" --account lincoln@livingnet.com.br --max 20
```

Para cada e-mail:
- Cruzar remetente com memória — já vi antes? qual categoria?
- Classificar e aplicar label adequada
- Se urgente → notificar Lincoln imediatamente via Telegram
- Se ruído → marcar como lido silenciosamente

### 2. Critérios de escalada imediata

Escalar SEMPRE se:
- Assunto contém: fatura, vencimento, boleto, pagamento, bloqueio, suspensão, erro, alert, 500, critical
- Remetente for pessoa física (não noreply/automático)
- Alerta de segurança real
- Erros de sistema/produção (Sentry, monitoramento, infra)
- Qualquer coisa sobre domínio, servidor ou infraestrutura

---

### 3. Registrar aprendizados no daily note

Após processar, escrever em `memory/YYYY-MM-DD.md` (append):

```
## HH:MM — Ciclo de heartbeat
- gmail: X não lidos, Y escalados, Z processados silenciosamente
- livingnet: X não lidos, Y escalados, Z processados silenciosamente
- Novos remetentes identificados: [lista]
- Padrões observados: [qualquer anomalia ou insight]
```

Só escrever se houve algo a registrar. Se foi tudo silencioso, não criar entrada.

---

### 4. Atualizar MEMORY.md (a cada ~10 ciclos ou quando aprender algo novo)

Quando identificar um padrão novo ou corrigir uma classificação errada:
- Adicionar remetente em "Remetentes conhecidos"
- Ajustar critérios de escalada se o Lincoln corrigiu algum comportamento
- Atualizar volumes típicos se divergir muito do esperado

---

### 5. Sumário ao final

Se houve escalada ou processamento relevante: reportar ao Lincoln via Telegram (curto e direto).
Se não houve nada novo: `HEARTBEAT_OK`.
