# Roadmap e pontos de atenção

## Próximos passos sugeridos

| Prioridade | Item | Por quê |
| :--------: | ---- | ------- |
| Alta | Testes de integração da API (Supertest + MySQL/TiDB em container) | Cobrir rotas, permissões e uploads ponta a ponta |
| Alta | Testes de componentes (Vitest + Testing Library) e E2E (Playwright) | Garantir fluxos de agenda, taverna e upload |
| Alta | HTTPS no deploy (Caddy/Traefik ou proxy do provedor) | Necessário para o cookie `Secure` |
| Média | WebSocket/SSE para dados, taverna e agenda | Atualização instantânea em vez de *polling* |
| Média | Recuperação de senha por e-mail | Hoje não há como redefinir senha esquecida |
| Média | Trocar o token de mestre pela interface (com histórico de quem ativou) | Hoje a troca é via variável de ambiente |
| Média | Várias campanhas por usuário | Tabelas `campaigns` / `campaign_members` + `campaign_id` |
| Média | Armazenamento em S3/R2 com URLs assinadas | Escalar uploads e tirar arquivos do servidor |
| Média | Redimensionar imagens e gerar miniaturas (sharp) | Galerias mais leves no celular |
| Baixa | PWA (manifest + service worker) | "Instalar" no celular e abrir offline |
| Baixa | Exportar sessão para o calendário (.ics) | Integração com Google/Apple Calendar |
| Baixa | Notificações (e-mail/push) quando uma sessão é confirmada | |

## Limitações conhecidas

- **Melhores datas** consideram apenas o mês visível no calendário.
- Não há tela para excluir conta (só via banco). Ao excluir, devolva antes à lista os itens da Taverna que a pessoa levaria (ver BANCO-DE-DADOS.md).
- O histórico de dados não é paginado (mostra as 30 últimas rolagens).
- A agenda usa o fuso do servidor para definir "hoje" — configure `TZ=America/Sao_Paulo`.
