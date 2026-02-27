# memory/senders.md — Mapa de Remetentes

Atualizado pelo PostMaster a cada novo remetente identificado.
Formato: remetente | categoria | confiabilidade | notas

---

## Pessoas Reais (escalar sempre)

| Remetente | Email | Organização | Notas |
|-----------|-------|-------------|-------|
| Robert Urech | robert@livingnet.com.br | Living Consultoria | Sócio/gestor. Mensagens sempre relevantes. |
| Alessandra Queiroz | alessandra@livingnet.com.br | Living Consultoria | RH. Envia contra-cheque mensalmente. |

---

## Sistemas — Escalar se crítico

| Remetente | Email | Categoria | Regra |
|-----------|-------|-----------|-------|
| Sentry | noreply@md.getsentry.com | Dev/Infra | Escalar se erro 500 / produção. Ignorar se warning leve. |
| GitHub | notifications@github.com | Dev/GitHub | Escalar se PR review request ou menção direta. Ignorar se watch notification. |

---

## Sistemas — Processar silenciosamente

| Remetente | Email | Label | Ação |
|-----------|-------|-------|------|
| tl;dv | no-reply@tldv.io | Dev/Newsletter | Marcar lido. Resumos de reunião. |
| Intch | newcomers@email.intch.org | Promotion | Marcar lido. |
| LinkedIn | notifications@linkedin.com | Social/LinkedIn | Marcar lido, exceto conexão de pessoa conhecida. |

---

## Desconhecidos recentes

_PostMaster preenche aqui quando encontra remetente novo não mapeado._

| Data | Email | Assunto | Classificação provisória |
|------|-------|---------|-------------------------|
