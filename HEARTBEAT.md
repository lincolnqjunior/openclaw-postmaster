# HEARTBEAT.md — PostMaster 📬

## Checklist de Heartbeat

A cada execução, verificar as duas caixas de entrada. Nada mais.

### 1. Verificar e-mails não lidos

```bash
gog gmail search "in:inbox is:unread" --account lincolnqjunior@gmail.com --max 20
gog gmail search "in:inbox is:unread" --account lincoln@livingnet.com.br --max 20
```

Para cada e-mail:
- Classificar por remetente/assunto
- Aplicar label adequada
- Se urgente → notificar Lincoln imediatamente via Telegram
- Se ruído (promoção, newsletter automática) → marcar como lido

### 2. Critérios de escalada imediata

Escalar SEMPRE se:
- Assunto contém: fatura, vencimento, boleto, pagamento, bloqueio, suspensão, erro, alert, 500, critical
- Remetente for pessoa física (não noreply/automático)
- Alerta de segurança real
- Erros de sistema/produção (Sentry, monitoramento, infra)
- Qualquer coisa sobre domínio, servidor ou infraestrutura

### 3. Sumário ao final

Se houve processamento relevante: reportar ao Lincoln via Telegram.
Se não houve nada novo: silêncio total — responder apenas `HEARTBEAT_OK`.

### 4. Atualizar estado

Salvar em `memory/heartbeat-state.json`:
```json
{
  "lastCheck": "<ISO timestamp>",
  "accounts": {
    "gmail": { "processedToday": 0, "escalatedToday": 0 },
    "livingnet": { "processedToday": 0, "escalatedToday": 0 }
  }
}
```
