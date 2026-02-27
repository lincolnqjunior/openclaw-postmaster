# TOOLS.md - PostMaster — Infraestrutura

## Google Workspace (gog)

- **Conta:** lincolnqjunior@gmail.com
- **Serviços usados:** gmail
- **Autenticação:** keyring via GOG_KEYRING_PASSWORD (injetado no systemd do gateway)

### Comandos Gmail

```bash
gog gmail list --unread --limit 20
gog gmail label add <id> <label>
gog gmail mark-read <id>
gog gmail get <id>
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
