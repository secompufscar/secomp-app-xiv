# Rotas e recarregamento na versão web

## Comportamento atual — 09/10/2026

A web reconhece as abas e telas disponíveis para a sessão atual. Recarregar ou abrir diretamente uma URL válida mantém a tela, inclusive cronograma, perfil, detalhes, lista de participantes e edição administrativa. `src/routes/webLinking.ts` define os caminhos e parâmetros conforme a estrutura de `stack.routes.tsx` e `tab.routes.tsx`; `src/routes/index.tsx` aplica essa configuração somente na web.

Os detalhes usam `/ActivityDetails?item=<id>`. A URL contém o identificador, e `activityDetailsRouteScreen.tsx` consulta a atividade pela API ao abrir ou recarregar esse link. Falha na consulta mantém a tela de atividade com opção de tentar novamente. A navegação existente com a atividade completa continua funcionando; a URL serializa somente seu ID. Links antigos com `item=[object Object]` não contêm um ID recuperável e voltam ao Início. É necessário abrir a atividade pelo cronograma novamente para obter o link válido.

As telas administrativas só são reconhecidas com ferramentas de admin habilitadas. URL desconhecida, identificador obrigatório ausente ou rota sem permissão usa a tela inicial disponível. Sessão inválida continua exigindo autenticação; indisponibilidade temporária do perfil mantém a URL enquanto o usuário tenta recuperar a sessão. A API continua autorizando cada requisição.

A [visão do participante](participant-view-web.md) agora permanece ao recarregar na mesma aba e para a mesma conta admin. Isso permite conservar também `/App/Perfil` nessa visão. Alternar a visão explicitamente continua retornando ao Início. Formulários não salvos, diálogos, posição da rolagem, filtros locais e abas internas de uma tela não são armazenados como parte da rota.

### Verificação desta alteração

Executar `npm run verify`. Os testes de rota usam os conversores reais do React Navigation instalado, incluindo parâmetros, permissões, links públicos, identificadores ausentes e consulta/repetição dos detalhes. Conferir no navegador em 320 e 1280 px: abertura direta e recarga das abas e telas administrativas, ID correto dos detalhes/edição, histórico voltar/avançar, falhas 503 de atividade e perfil, recuperação de senha e recarga na visão do participante.

Os testes de navegador usam sessão e API fictícias, sem registrar presenças, inscrições ou alterações em produção. Execução no domínio público confirma o frontend publicado; não comprova autenticação com conta real nem execução em Safari/iOS. O fallback da hospedagem descrito abaixo permanece necessário, mas sozinho não restaura a navegação: o frontend também precisa reconhecer a rota.

Configuração conforme a documentação de [links do React Navigation 6](https://reactnavigation.org/docs/6.x/configuring-links/).

Validação local em 09/10/2026: TypeScript, 84 testes e exportação web passaram. O build servido como SPA passou os 38 cenários de navegador descritos acima, sem erros de execução, chamadas reais à API ou escritas em produção. A execução local não confirma a publicação; conferir o deploy e repetir essa validação no domínio público após o merge.

## Falha confirmada em 03/10/2026

O link enviado pela API tem o formato `https://secomp-app-xiv.vercel.app/SetNewPassword?token=...`. A tela e a configuração de linking já existem no app, mas a hospedagem respondia 404 ao acesso direto a esse caminho. A raiz respondia 200, enquanto `/SetNewPassword` e `/App/Home` respondiam 404.

A falha acontece antes do carregamento do JavaScript e da requisição para atualizar a senha. O token real não foi utilizado na reprodução.

## Correção da hospedagem

O [vercel.json](../vercel.json) usa o build web existente, publica `dist` e encaminha todos os caminhos da SPA (`/:path*`) para `index.html`. A regra abrange links diretos e recargas em qualquer rota web, não somente recuperação de senha. A URL e sua query permanecem no navegador; o React Navigation recebe `token` e abre a tela existente. Arquivos reais exportados, como bundles e política de privacidade, continuam sendo servidos pela hospedagem.

A configuração segue as orientações de [publicação web do Expo](https://docs.expo.dev/guides/publishing-websites/) e de [rewrites da Vercel](https://vercel.com/docs/routing/rewrites). Não muda a API, o banco, as chaves ou o APK. Links já enviados continuam usando o mesmo endereço; expiração e validação dos tokens continuam a cargo da API.

## Verificação e limite

Antes de publicar, executar `npm run verify` e conferir no build servido como SPA:

1. Abrir `/SetNewPassword?token=diagnostic-invalid-token` em contexto sem sessão e verificar o formulário de nova senha.
2. Recarregar a página; o formulário deve continuar acessível.
3. Conferir que o token fictício chega à chamada de atualização, usando interceptação local sem alterar senha real.
4. Conferir bundle JavaScript e `politica-privacidade.html` como arquivos estáticos.

Após o merge e deployment, abrir um link real de recuperação com uma conta controlada, em aba privada, e confirmar a redefinição e o login com a nova senha. Não publicar token ou senha. A aprovação do build não confirma, sozinha, o fluxo completo online.


## Resultado local em 03/10/2026

- `npm run verify` passou: TypeScript e exportação web, incluindo cópia da política de privacidade.
- Build servido com fallback de SPA, em navegador Chromium com viewport de celular e contexto sem sessão: formulário aberto por link direto, recarga concluída e token fictício preservado.
- Uma chamada de atualização foi interceptada localmente; o token e a senha fictícios chegaram ao endpoint esperado. A resposta de erro simulada apareceu na tela; nenhuma chamada alterou produção.
- Bundle JavaScript e política de privacidade foram servidos como arquivos reais; nenhum erro de execução capturado no navegador.

O fallback também foi conferido para `/App/Home`, `/Login`, `/PasswordReset` e um caminho fictício, todos entregando o documento do app. O encaminhamento não cria telas novas: o frontend ainda precisa reconhecer a rota e os parâmetros, e as permissões continuam sendo verificadas pela API. Esse teste local valida o formulário e a navegação com fallback, mas não é um deployment da Vercel nem um teste em Safari/iOS.

## Resultado da publicação em 03/10/2026

O [PR #9](https://github.com/secompufscar/secomp-app-xiv/pull/9) foi integrado em `6d6cc1c2` e publicado na Vercel. Leituras do domínio público confirmaram 200 e o documento do app na raiz, em `/SetNewPassword?token=diagnostic-invalid-token` e `/App/Home`. Esse é o resultado da rodada de 03/10. A conclusão da recuperação de senha e o login com a nova senha ainda não foram verificados em produção. [Evidências e limites](https://github.com/secompufscar/secomp-server-xiv/blob/main/docs/historico/auditorias/production-deployment-2026-10-03.md#rotas-web-e-recuperação-de-senha).

Na revisão documental de 07/10/2026, a configuração de SPA permanece no `vercel.json`. O merge do [PR #21](https://github.com/secompufscar/secomp-app-xiv/pull/21) disparou um deploy automático aprovado; os testes da [lista de participantes](participant-directory-web.md) passaram no domínio público. Essa rodada não testou novamente a recuperação de senha.
