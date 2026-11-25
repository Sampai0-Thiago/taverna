# LGPD — Proteção de dados no GREMAD

Este documento é o **registro das operações de tratamento** (LGPD art. 37) e o guia de
segurança da aplicação. A política voltada ao usuário está em `/privacidade`
(`frontend/src/features/legal/PrivacyPage.jsx`).

> Não é parecer jurídico. Se o app deixar de ser um grupo privado (ex.: aberto ao público,
> monetizado ou com menores de idade), revise com um profissional de direito digital.

## 1. Papéis

| Papel | Quem |
| ----- | ---- |
| Controlador | Responsável pela mesa GREMAD (quem administra o deploy) |
| Canal do titular / encarregado | E-mail em `PRIVACY_CONTACT` (padrão: `MAIL_FROM`), exibido na política e em `GET /api/legal`. Agentes de pequeno porte podem dispensar a indicação formal de encarregado, mas precisam manter o canal (Res. CD/ANPD nº 2/2022). |
| Operadores | Vercel (site), Render (API), TiDB Cloud/PingCAP (banco), Cloudflare R2 (arquivos), Brevo (e-mail) |

## 2. Inventário de dados

| Dado | Onde | Finalidade | Base legal (art. 7º) | Quem vê | Retenção |
| ---- | ---- | ---------- | -------------------- | ------- | -------- |
| Nome, cor | `users` | Identificar o jogador na mesa | V — execução do serviço | Membros | Enquanto a conta existir |
| E-mail | `users` | Login, códigos de confirmação/recuperação | V | Só o titular | Enquanto a conta existir |
| Senha | `users.password_hash` (bcrypt) | Autenticação | V | Ninguém | Enquanto a conta existir |
| Bio, avatar | `users`, R2 | Perfil (opcional) | V | Membros | Até ser trocado/excluído |
| Agenda | `availabilities` | Comparar disponibilidade | V | Membros | Enquanto a conta existir |
| Personagens, fichas PDF | `characters`, R2 | Função da mesa | V | Membros | Até o titular excluir |
| Rolagens | `dice_rolls` | Histórico do grupo | V | Membros | Enquanto a conta existir |
| Sessões, mapas, pins, itens | tabelas de domínio | Conteúdo coletivo | V | Membros | Permanecem anonimizados se a conta for excluída |
| Datas de aceite da política, confirmação de e-mail, troca de senha | `users` | Responsabilização e segurança | II (aceite) / IX — legítimo interesse | Titular (exportação) | Enquanto a conta existir |
| Tentativas de login erradas / bloqueio | `users.failed_logins`, `locked_until` | Segurança | IX | Ninguém | Zeradas no próximo login certo |
| Códigos de e-mail | `email_verifications`, `password_resets` (só HMAC) | Confirmação/recuperação | V | Ninguém | 15 min + limpeza automática |
| Log de acesso | Render (stdout) | Diagnóstico | IX | Administrador | Retenção do provedor — **sem IP, cabeçalhos, query string ou corpo** |

**Não coletamos:** CPF, telefone, endereço, data de nascimento, dados sensíveis (art. 5º, II),
cookies de rastreamento ou analytics.

## 3. Direitos do titular (art. 18) → onde estão implementados

| Direito | Implementação |
| ------- | ------------- |
| Confirmação e acesso (I, II) | `GET /api/users/me/export` — Perfil → *Meus dados* → *Baixar meus dados* (JSON) |
| Correção (III) | Perfil: nome, bio, cor, avatar |
| Portabilidade (V) | Mesmo JSON da exportação (formato aberto, legível por máquina) |
| Eliminação (VI) | `DELETE /api/users/me` (exige a senha) — Perfil → *Excluir minha conta* |
| Informação sobre compartilhamento (VII) | Política, seção 5 |
| Demais (oposição, revisão, revogação) | Canal de contato (prazo: 15 dias, art. 19, II) |

Na **exclusão**: apagamos o cadastro, agenda, personagens, fichas, avatar (também do R2), rolagens
e códigos pendentes. Itens da Taverna que a pessoa levaria voltam a "abertos". Conteúdo coletivo
criado por ela (sessões, mapas, marcadores, itens) fica para o grupo **sem autor** (`ON DELETE SET NULL`).

## 4. Medidas de segurança (art. 46)

| Ameaça | Medida |
| ------ | ------ |
| Vazamento em trânsito | HTTPS/HSTS no site, TLS obrigatório com o TiDB Cloud e o R2 |
| Vazamento do banco | Senhas com bcrypt (custo 12); códigos de e-mail só como HMAC-SHA256; criptografia em repouso dos provedores |
| Metadados em fotos | `utils/imageSanitizer.js`: toda imagem é regravada sem EXIF/GPS/XMP/IPTC (orientação aplicada antes) |
| Arquivos expostos | R2 privado; a API só entrega arquivos a usuários logados; nomes UUID; magic bytes conferidos |
| Força bruta | Limite por IP (`express-rate-limit`) + **bloqueio por conta** (10 senhas erradas → 15 min); códigos com 5 tentativas |
| Enumeração de contas | Login com mensagem genérica e tempo constante; recuperação de senha sempre responde 204 em segundo plano |
| Sessão roubada | Cookie `httpOnly` + `Secure` + `SameSite=Lax`; trocar/recuperar a senha invalida os logins anteriores |
| XSS / clickjacking | CSP sem scripts de terceiros, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff` |
| Rastreamento por terceiros | Fontes hospedadas no próprio site (sem Google Fonts); nenhum analytics |
| Logs com dados pessoais | Log de acesso só com método, rota e status; `redact` de senhas, tokens e segredos |
| Dados retidos sem necessidade | `jobs/retention.js`: apaga cadastros não confirmados após 7 dias e códigos vencidos |
| Dependências vulneráveis | `npm audit --omit=dev` sem vulnerabilidades (nov/2026) |

## 5. Plano de resposta a incidentes (art. 48)

1. **Conter**: trocar imediatamente as credenciais afetadas no Render (`DATABASE_URL`, `R2_*`,
   `BREVO_API_KEY`) e o `JWT_SECRET` (encerra todas as sessões). Se necessário, suspender o serviço.
2. **Avaliar**: quais dados, quantos titulares, desde quando, risco de dano relevante.
3. **Comunicar** em prazo razoável — a ANPD orienta até **3 dias úteis** (Res. CD/ANPD nº 15/2024) —
   à ANPD (gov.br/anpd → *Comunicação de incidente de segurança*) e aos titulares afetados, quando
   houver risco ou dano relevante: o que aconteceu, dados envolvidos, riscos, medidas tomadas e contato.
4. **Registrar** o incidente (data, causa, decisão de comunicar ou não e por quê) e guardar por 5 anos.
5. **Corrigir** a causa e revisar este documento.

## 6. Ao mudar a política

Atualize `POLICY_DATE` em `PrivacyPage.jsx` **e** `PRIVACY_POLICY_VERSION` em
`backend/src/config/privacy.js`. Cada usuário tem registrada a versão que aceitou
(`users.privacy_version`).

## 7. Limitações conhecidas

- O cadastro informa "e-mail já cadastrado" (permite descobrir se um e-mail tem conta). Aceitável
  para um grupo fechado; para uso público, trocar por envio de e-mail informativo.
- Metadados de PDFs (autor, software) não são removidos.
- Usuários cadastrados antes da versão de 25/11/2026 não têm `privacy_accepted_at`.
- `TRUST_PROXY=4` confia no IP informado pela Vercel; quem chamar o Render direto pode forjar o IP
  e contornar o limite por IP — o bloqueio por conta continua valendo.
