# Sessão durante falhas temporárias

Revisão de 07/10/2026. Mudança no cliente compartilhado e na restauração de sessão. A versão web é publicada pela Vercel após merge do PR do app. Não exige alteração de API, banco ou credenciais. Aplicativos nativos instalados recebem o código somente com uma atualização própria.

## Comportamento

- Se uma consulta protegida recebe 401, o app tenta renovar o access token com o refresh token. Requisições simultâneas compartilham uma única renovação. Um 401 atrasado reutiliza o access token já substituído, sem rotacionar o refresh novamente.
- Na web, navegadores com Web Locks coordenam a renovação entre abas da mesma origem. A aba que aguardou verifica os tokens novamente e reutiliza a renovação concluída pela outra. Sem essa API, permanece a coordenação dentro de cada aba; a proteção entre abas não está disponível.
- Erro de rede, timeout, 5xx, 429 ou outra falha sem confirmação de sessão inválida preserva os dados de acesso. A falha de renovação é propagada, em vez de apresentar o 401 original.
- Refresh recusado com 401, validação 400 com `VALIDATION_ERROR` especificamente no campo `refreshToken`, ou access token legado recusado sem refresh disponível, encerra a sessão local e permite novo login. Outros erros 400 preservam as credenciais. Isso não dispara outra revogação remota.
- Um 401 em login, cadastro, logout, confirmação ou recuperação de senha não encerra uma sessão existente. Uma resposta de refresh após logout ou novo login não grava os tokens da sessão anterior nem limpa os dados de acesso novos.
- Respostas de autenticação incompletas são rejeitadas antes de gravar qualquer token. A falha de gravação do login é propagada para a tela, sem marcar o usuário como autenticado.
- Ao abrir o app, falha temporária em `/users/me` mostra uma tela de recuperação com **Tentar novamente**. Os dados de acesso permanecem armazenados; o botão repete a consulta. Durante a tentativa aparece o indicador de carregamento, e chamadas duplicadas compartilham a operação em andamento.
- A consulta inicial ao perfil tem timeout de dez segundos; a renovação mantém oito segundos. Não há repetição automática de refresh após timeout ou erro de rede: uma resposta perdida pode ter ocorrido após rotação no servidor.
- Sem credenciais, o app abre o fluxo público. Se existir somente refresh token, ainda tenta recuperar a sessão.
- **Sair**, escolhido pelo usuário, mantém revogação remota e limpeza local. Uma resposta atrasada da restauração não recoloca o usuário após sair.

Preservar credenciais em um timeout não garante que o refresh ainda seja válido: se a API concluiu a rotação mas a resposta não chegou, a tentativa seguinte pode receber 401 e exigir novo login. Esta correção não muda esse protocolo nem resolve a origem das desconexões do banco.

## Verificação

`npm test` executa [testes de sessão](../tests/session-recovery.test.cjs) sem acessar produção. O interceptor real usa Axios com transporte simulado; o provider usa um ambiente controlado de hooks. Os cenários cobrem indisponibilidade, timeout/rede, sessão inválida, recuperação posterior, concorrência, ausência de credenciais, logout explícito e resposta atrasada. A revisão de 07/10 acrescenta regressões para validação de refresh inválido, 401 atrasado, duas instâncias compartilhando um Web Lock, operações públicas de autenticação e refresh concluído após logout ou novo login.

`npm run verify` executa TypeScript, esses testes e exportação web. O workflow do app usa esse comando em PRs e no main. Build aprovado não comprova a sessão de uma conta real na Vercel; registrar separadamente deployment e verificações feitas online.

Na revisão de 04/10/2026 passaram TypeScript, os 12 testes de sessão e a exportação web com dois workers. No navegador, a exportação foi verificada em larguras de 320 e 1280 pixels com API local e credenciais fictícias: 503 no perfil e na renovação preservaram os tokens, e **Tentar novamente** recuperou a sessão após o serviço voltar, sem chamada de logout. Não houve transbordamento horizontal; o botão tem pelo menos 48 pixels de altura. A dependência do leitor QR foi simulada para manter o teste offline; esse recurso e contas reais não fizeram parte desta verificação.

Na revisão de 07/10/2026 passaram a verificação completa e a exportação final. O navegador Chromium validou novamente recuperação de 503 em 320 e 1280 pixels, duas abas recebendo 401 antes da renovação e retorno ao login após refresh inválido. Dez rodadas posteriores dos dois últimos cenários passaram, inclusive com outro teste de navegador em paralelo. Uma execução inicial teve contagem divergente de renovações; não se reproduziu nessas rodadas, e sua origem não foi determinada. Safari e contas reais não fizeram parte desses testes.

Separadamente, consultas online em 07/10 confirmaram disponibilidade do site, API e preflight CORS do domínio publicado. Os logs das 24 horas consultadas mostraram 29 respostas 400 no refresh, sem 5xx nas rotas de login, refresh ou perfil; o corpo das requisições não foi registrado nem consultado. Isso não determina como surgiram as credenciais inválidas nem comprova a causa de cada relato. Uma resposta perdida após rotação e navegadores sem Web Locks continuam sujeitos às limitações descritas acima.
