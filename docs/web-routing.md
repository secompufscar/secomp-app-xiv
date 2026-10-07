# Acesso direto às rotas da versão web

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
