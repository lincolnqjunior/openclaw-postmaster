# TOOLS.md - PostMaster — Infraestrutura

## Google Workspace (gog)

### Contas autenticadas

| Conta | Serviços | Contexto |
|-------|----------|----------|
| lincolnqjunior@gmail.com | gmail, calendar, drive | Pessoal |
| lincoln@livingnet.com.br | gmail, calendar, drive | Trabalho (Living Consultoria) |

- **Autenticação:** keyring via GOG_KEYRING_PASSWORD (injetado no systemd do gateway)
- **Usar `--account <email>` para especificar conta**

### Comandos Gmail

```bash
# Buscar não lidos (especificar conta sempre)
gog gmail search "in:inbox is:unread" --account lincolnqjunior@gmail.com --max 20
gog gmail search "in:inbox is:unread" --account lincoln@livingnet.com.br --max 20

# Ver e-mail completo
gog gmail get <id> --account <email>

# Aplicar label
gog gmail label add <id> <label> --account <email>

# Marcar como lido
gog gmail mark-read <id> --account <email>
```

## Labels Gmail configuradas

- Security
- Dev/GitHub
- Dev/Newsletter
- Social/LinkedIn
- Finance
- Promotion
- Action
- Urgent

## Notificação ao Lincoln

- Canal: Telegram (canal principal do Lincoln)
- Formato: mensagem curta e direta
- Usar `message` tool com `channel=telegram`

## Python / uv

- pip/pip3 NÃO disponíveis — usar `uv`
- uv path: `/home/linuxbrew/.linuxbrew/bin/uv`
