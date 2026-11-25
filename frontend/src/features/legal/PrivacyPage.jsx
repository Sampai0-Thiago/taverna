import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { legalApi } from '../../api/endpoints.js';
import { Logo } from '../../components/layout/Logo.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Política de Privacidade (LGPD — Lei 13.709/2018).
 * Ao alterar o conteúdo de forma relevante, atualize POLICY_DATE aqui e
 * PRIVACY_POLICY_VERSION em backend/src/config/privacy.js.
 */
const POLICY_DATE = '25/11/2026';

export function PrivacyPage() {
  const { user } = useAuth();
  const { data: legal } = useQuery({ queryKey: ['legal'], queryFn: legalApi.get, staleTime: Infinity });
  const app = legal?.controller ?? 'GREMAD';
  const contact = legal?.contactEmail;

  return (
    <div className="legal">
      <article className="legal__card panel">
        <header className="legal__header">
          <Logo size={44} />
          <div>
            <h1>Política de Privacidade</h1>
            <p className="muted">Última atualização: {POLICY_DATE}</p>
          </div>
        </header>

        <p>
          O <strong>{app}</strong> é uma aplicação privada para organizar uma mesa de RPG entre amigos. Esta política
          explica, de forma simples, quais dados pessoais tratamos, por quê, com quem e como você exerce seus direitos,
          conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
        </p>

        <h2>1. Quem é o controlador e como falar com a gente</h2>
        <p>
          O controlador dos dados é o responsável pela mesa {app}.{' '}
          {contact ? (
            <>
              Para qualquer assunto sobre seus dados, escreva para <a href={`mailto:${contact}`}>{contact}</a>.
            </>
          ) : (
            'Para qualquer assunto sobre seus dados, fale com o mestre da mesa.'
          )}{' '}
          Respondemos em até 15 dias.
        </p>

        <h2>2. Quais dados tratamos</h2>
        <ul>
          <li><strong>Cadastro:</strong> nome de jogador, e-mail e senha (guardamos só uma versão embaralhada — <em>hash</em> — que não permite descobrir a senha).</li>
          <li><strong>Perfil (opcional):</strong> bio, cor na agenda e foto de avatar.</li>
          <li><strong>Uso da mesa:</strong> sua disponibilidade na agenda, sessões, personagens e fichas em PDF, mapas/NPCs e marcadores (para quem é mestre), itens da Taverna e rolagens de dados.</li>
          <li><strong>Segurança:</strong> data de confirmação do e-mail, de aceite desta política, da última troca de senha e contagem de tentativas de login erradas.</li>
          <li><strong>Registros técnicos mínimos:</strong> data, rota acessada e resultado de cada requisição, por até o prazo de retenção do provedor de hospedagem. <strong>Não registramos seu IP, navegador ou aparelho.</strong></li>
        </ul>
        <p>Não tratamos dados pessoais sensíveis (art. 5º, II) e não pedimos CPF, telefone, endereço ou data de nascimento.</p>

        <h2>3. Para que usamos e com qual base legal</h2>
        <ul>
          <li><strong>Criar e manter sua conta e as funções da mesa</strong> (agenda, personagens, Taverna, dados): execução do serviço que você pediu ao se cadastrar (art. 7º, V).</li>
          <li><strong>Confirmar seu e-mail e recuperar sua senha:</strong> execução do serviço (art. 7º, V).</li>
          <li><strong>Proteger as contas</strong> (limite de tentativas, bloqueio temporário, registros mínimos): legítimo interesse em manter a aplicação segura (art. 7º, IX), sempre com o mínimo de dados.</li>
        </ul>
        <p>Não usamos seus dados para publicidade, não vendemos dados e não fazemos perfis automatizados.</p>

        <h2>4. Quem vê seus dados</h2>
        <ul>
          <li><strong>Membros logados da mesa</strong> veem seu nome, cor, avatar, bio, sua disponibilidade, seus personagens e fichas, itens da Taverna e suas rolagens — é para isso que a aplicação existe.</li>
          <li><strong>Seu e-mail só você vê.</strong> Os arquivos enviados (fotos, fichas, mapas) não são públicos: só abrem para quem está logado.</li>
        </ul>

        <h2>5. Prestadores de serviço (operadores) e transferência internacional</h2>
        <p>Para funcionar, a aplicação usa provedores que tratam dados em nosso nome, alguns com servidores fora do Brasil (art. 33):</p>
        <ul>
          <li><strong>Vercel</strong> — hospedagem do site.</li>
          <li><strong>Render</strong> — servidor da aplicação.</li>
          <li><strong>TiDB Cloud (PingCAP)</strong> — banco de dados.</li>
          <li><strong>Cloudflare R2</strong> — armazenamento de imagens e PDFs.</li>
          <li><strong>Brevo</strong> — envio dos e-mails com códigos.</li>
        </ul>
        <p>Esses provedores adotam cláusulas contratuais de proteção de dados e criptografia em trânsito e em repouso. Eles não podem usar seus dados para fins próprios.</p>

        <h2>6. Cookies</h2>
        <p>
          Usamos <strong>um único cookie, essencial</strong>, para manter você conectado (protegido contra acesso por scripts e válido por até 7 dias).
          Não usamos cookies de rastreamento, publicidade ou análise.
        </p>

        <h2>7. Por quanto tempo guardamos</h2>
        <ul>
          <li>Enquanto sua conta existir, ou até você pedir a exclusão.</li>
          <li>Cadastros que não confirmam o e-mail são apagados automaticamente em 7 dias.</li>
          <li>Códigos enviados por e-mail valem 15 minutos e são apagados depois de vencidos.</li>
          <li>Ao excluir a conta, apagamos seu cadastro, agenda, personagens, fichas, avatar e rolagens. Conteúdo coletivo que você criou para a mesa (sessões marcadas, mapas, itens da Taverna) continua disponível ao grupo, <strong>sem identificação sua</strong>. Cópias de segurança dos provedores podem manter dados por um período limitado até serem sobrescritas.</li>
        </ul>

        <h2>8. Como protegemos seus dados</h2>
        <ul>
          <li>Conexões sempre criptografadas (HTTPS/TLS), inclusive com o banco de dados.</li>
          <li>Senhas com <em>bcrypt</em>; códigos de e-mail guardados apenas como <em>hash</em>.</li>
          <li><strong>Fotos enviadas têm os metadados removidos</strong> (como localização GPS e modelo do celular).</li>
          <li>Bloqueio temporário da conta após 10 senhas erradas e limite de tentativas por IP.</li>
          <li>Trocar a senha encerra suas sessões em outros aparelhos.</li>
          <li>Acesso restrito a membros logados; somente quem informa o token de mestre pode publicar mapas.</li>
        </ul>

        <h2>9. Seus direitos (art. 18) e como exercê-los</h2>
        <ul>
          <li><strong>Acessar e levar seus dados (portabilidade):</strong> Perfil → <em>Meus dados</em> → <em>Baixar meus dados</em> (arquivo JSON).</li>
          <li><strong>Corrigir:</strong> edite nome, bio, cor e avatar no Perfil.</li>
          <li><strong>Excluir:</strong> Perfil → <em>Meus dados</em> → <em>Excluir minha conta</em>.</li>
          <li><strong>Confirmar o tratamento, saber com quem compartilhamos, se opor ou revisar decisões:</strong> pelo contato do item 1.</li>
          <li>Você também pode reclamar à <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong>: <a href="https://www.gov.br/anpd" target="_blank" rel="noreferrer">gov.br/anpd</a>.</li>
        </ul>

        <h2>10. Crianças e adolescentes</h2>
        <p>
          A aplicação é destinada a maiores de 18 anos. Adolescentes só devem usá-la com autorização de um responsável,
          e crianças (menores de 12 anos) apenas com consentimento específico de um dos pais ou responsável (art. 14).
        </p>

        <h2>11. Incidentes de segurança</h2>
        <p>
          Se ocorrer um incidente que possa trazer risco ou dano relevante, avisaremos as pessoas afetadas e a ANPD,
          informando o que aconteceu, quais dados foram envolvidos e o que está sendo feito (art. 48).
        </p>

        <h2>12. Mudanças nesta política</h2>
        <p>Quando houver mudança relevante, atualizaremos a data acima e avisaremos no aplicativo.</p>

        <p className="legal__back">
          <Link to={user ? '/perfil' : '/entrar'}>← Voltar</Link>
        </p>
      </article>
    </div>
  );
}
