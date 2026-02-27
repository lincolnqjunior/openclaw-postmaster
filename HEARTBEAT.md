# HEARTBEAT.md — PostMaster 📬

## Checklist de Heartbeat

A cada execução, faça apenas o que está aqui. Nada mais.

### 1. Verificar e-mails não lidos

```bash
gog gmail list --unread --limit 20
```

Para cada e-mail:
- Classificar por remetente/assunto
- Aplicar label adequada via `gog gmail label add <id> <label>`
- Se urgente → notificar Lincoln imediatamente via Telegram
- Se ruído (promoção, newsletter automática) → marcar como lido

### 2. Critérios de escalada imediata

Escalar SEMPRE se:
- Assunto contém: fatura, vencimento, boleto, pagamento, bloqueio, suspensão
- Remetente for pessoa física (não noreply/automático)
- Alerta de segurança real
- Qualquer coisa sobre domínio ou infraestrutura

### 3. Sumário ao final

Se houve processamento relevante: reportar ao Lincoln (Telegram).
Se não houve nada: silêncio total — responder apenas `HEARTBEAT_OK`.

### 4. Atualizar estado

Salvar em `memory/heartbeat-state.json`:
```json
{
  "lastCheck": "<ISO timestamp>",
  "processedToday": 0,
  "escalatedToday": 0
}
```
