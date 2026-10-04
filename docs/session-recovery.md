# Sessão durante falhas temporárias

Revisão de 04/10/2026. Mudança no cliente compartilhado e na restauração de sessão. A versão web é publicada pela Vercel após merge do PR do app. Não exige alteração de API, banco ou credenciais. Aplicativos nativos instalados recebem o código somente com uma atualização própria.

## Comportamento

- Se uma consulta recebe 401, o app tenta renovar o access token com o refresh token. Requisições simultâneas compartilham uma única renovação.
- Erro de rede, timeout, 5xx, 429 ou outra falha sem confirmação de sessão inválida preserva os dados de acesso. A falha de renovação é propagada, em vez de apresentar o 401 original.
- Refresh recusado com 401, ou access token legado recusado sem refresh disponível, encerra a sessão local. Isso não dispara outra revogação remota.
- Ao abrir o app, falha temporária em `/users/me` mostra uma tela de recuperação com **Tentar novamente**. Os dados de acesso permanecem armazenados; o botão repete a consulta. Durante a tentativa aparece o indicador de carregamento, e chamadas duplicadas compartilham a operação em andamento.
- A consulta inicial ao perfil tem timeout de dez segundos; a renovação mantém oito segundos. Não há repetição automática de refresh após timeout ou erro de rede: uma resposta perdida pode ter ocorrido após rotação no servidor.
- Sem credenciais, o app abre o fluxo público. Se existir somente refresh token, ainda tenta recuperar a sessão.
- **Sair**, escolhido pelo usuário, mantém revogação remota e limpeza local. Uma resposta atrasada da restauração não recoloca o usuário após sair.

Preservar credenciais em um timeout não garante que o refresh ainda seja válido: se a API concluiu a rotação mas a resposta não chegou, a tentativa seguinte pode receber 401 e exigir novo login. Esta correção não muda esse protocolo nem resolve a origem das desconexões do banco.

## Verificação

`npm test` executa [testes de sessão](../tests/session-recovery.test.cjs) sem acessar produção. O interceptor real usa Axios com transporte simulado; o provider usa um ambiente controlado de hooks. Os cenários cobrem indisponibilidade, timeout/rede, sessão inválida, recuperação posterior, concorrência, ausência de credenciais, logout explícito e resposta atrasada.

`npm run verify` executa TypeScript, esses testes e exportação web. O workflow do app usa esse comando em PRs e no main. Build aprovado não comprova a sessão de uma conta real na Vercel; registrar separadamente deployment e verificações feitas online.

Na revisão de 04/10/2026 passaram TypeScript, os 12 testes de sessão e a exportação web com dois workers. No navegador, a exportação foi verificada em larguras de 320 e 1280 pixels com API local e credenciais fictícias: 503 no perfil e na renovação preservaram os tokens, e **Tentar novamente** recuperou a sessão após o serviço voltar, sem chamada de logout. Não houve transbordamento horizontal; o botão tem pelo menos 48 pixels de altura. A dependência do leitor QR foi simulada para manter o teste offline; esse recurso e contas reais não fizeram parte desta verificação.
