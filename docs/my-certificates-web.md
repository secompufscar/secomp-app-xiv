# Meus certificados

Publicado em 11/10/2026: app `8337d569` do [PR #35](https://github.com/secompufscar/secomp-app-xiv/pull/35), após publicação e validação da API `28780cc3` do [PR #40](https://github.com/secompufscar/secomp-server-xiv/pull/40). CI dos PRs/merges e deploys aprovados. [Evidência operacional](https://github.com/secompufscar/secomp-server-xiv/blob/main/docs/historico/auditorias/certificate-release-2026-10-11.md). Não houve emissão, reemissão ou escrita administrativa em produção nesta rodada.

## Estado publicado

[Meus certificados](https://secomp-app-xiv.vercel.app/MyCertificates) exige sessão; [validação pública](https://secomp-app-xiv.vercel.app/certificados) não exige login. Endpoints privados conferidos no deployment Railway `68f896cb-16ca-4439-8197-364afaa27a83`: lista/detalhe próprios 200, outra conta 404, próprio revogado 410, sem sessão 401 e `Cache-Control: no-store`. Cinco certificados existentes mantiveram hashes integrais antes/depois. Emissão segue habilitada para XIV/2026, sem alteração de variáveis ou migração adicional.

App publicado exercitado em 320/1280 px com API sintética para fluxo privado e, separadamente, API real para validação pública/download. PDF histórico baixado conferido: duas páginas, 11 atividades/780 minutos, mesmo código/link/QR, sem cortes. Isso não comprova login interativo/refresh real, emissão V2 real ou histórico multi-edição em produção; XV/2027 continua exclusiva dos testes. Revisões apenas documentais posteriores não alteram o código funcional identificado acima.

## Comportamento

Início abre a área autenticada `/MyCertificates`, disponível somente na web. O seletor apresenta a última revisão emitida de cada edição, ordenada por ano decrescente. Abrir, selecionar, atualizar ou baixar não emite um certificado. Uma revisão revogada permanece visível; o sistema não oferece uma versão anterior como se ainda fosse válida.

O comando separado **Gerar certificado da edição habilitada** usa a edição configurada na API. O ano selecionado no navegador não participa da emissão. Não existe primeira emissão retroativa pelo seletor. A geração continua exigindo credenciamento, presença certificável, durações oficiais e habilitação do servidor.

Certificados históricos podem ser consultados mesmo com emissão desabilitada ou outro ano configurado. O PDF usa o snapshot e o `templateId` originais, não o cadastro atual da edição. Snapshot legado XIV/2026 continua compatível. Um modelo desconhecido ou registro indisponível não impede selecionar outras edições; não recebe um visual substituto silenciosamente.

Atualizar mantém o código selecionado quando disponível; se houve reemissão, mantém a mesma edição e seleciona sua nova revisão. Após recarregar a página, a rota é restaurada e a edição mais recente é selecionada. A reemissão continua exclusivamente administrativa, auditada e com novo código/QR.

## Contrato e segurança

| Requisição autenticada | Resultado |
| --- | --- |
| `GET /certificates/mine` | `{ certificates: [...] }`, um resumo da última revisão por edição da própria conta |
| `GET /certificates/mine/:code` | Documento completo da própria conta, no mesmo formato da validação pública |
| `POST /certificates/mine` | Emissão explícita da edição configurada ou recuperação do registro ativo existente |

Resumo: `code`, `year`, `edition`, `templateId`, `status`, `revision`, `issuedAt`, `totalMinutes`. Estados: `active`, `revoked`, `unavailable`; metadados não identificáveis podem ser nulos. A lista não inclui nome, e-mail, QR, atividades ou justificativas administrativas.

A API deriva o proprietário da sessão, nunca de parâmetros fornecidos pelo navegador. Código de outra conta ou inexistente retorna 404; código revogado da própria conta retorna 410. Sem autenticação, os endpoints privados retornam 401. Respostas usam `Cache-Control: no-store`. A consulta pública permanece em `/certificados?codigo=...`, sem credenciais.

Lista vazia confirmada e falha de rede têm estados diferentes. Consultas antigas são canceladas e suas respostas descartadas ao selecionar, atualizar, sair ou trocar de conta. Antes de baixar, a área autenticada reconfirma a validade do código; trocar a seleção também cancela o carregamento de assets. Nenhuma verificação local impede uma revogação posterior: a validade atual é sempre a da consulta pública. A visão simulada de participante de um ADMIN não gera documentos nem assume a identidade de outro usuário.

## Manutenção

| Elemento | Arquivo |
| --- | --- |
| Entrada na Home | `src/components/home/homeCertificate.tsx` |
| Seleção, detalhes, erros e operações | `src/screens/certificates/myCertificatesScreen.tsx` |
| Rota autenticada e restauração | `src/routes/stack.routes.tsx`, `src/routes/webLinking.ts` |
| Cliente HTTP e validação de respostas | `src/services/certificates.ts` |
| Modelos suportados | `src/utils/certificatePresentation.ts` |
| Download, assets e cancelamento | `src/services/certificateDownload.web.ts` |
| Consulta por proprietário e última revisão | API: `src/repositories/certificateRepository.ts` |
| Endpoints e limites | API: `src/routes/certificates.ts` |

Para alterar o visual do documento ou preparar outro modelo/edição, seguir [manutenção dos certificados](certificate-maintenance.md). Não modificar renderizadores/assets históricos nem regravar snapshots para atualizar a marca.

## Verificação e publicação

`npm run typecheck`, `npm test`, exportação web e `npm run test:certificates:e2e`. `tests/my-certificates.test.cjs` cobre seleção sem emissão, cancelamento, troca de conta, revisão substituta, erro/vazio, geração explícita, validade antes do download e restrições mobile/preview. `tests/certificates.test.cjs` cobre o contrato; `tests/web-routing.test.cjs` cobre restauração. O E2E intercepta todas as requisições externas e usa somente edições e pessoas sintéticas em 320/1280 px.

Na API, executar testes unitários, build e o runner MySQL isolado. Verificar ausência de acesso a certificados de outra conta, leitura com emissão desabilitada e seleção da última revisão, inclusive revogada. O teste de banco usa migrações existentes; este incremento não exige migração adicional.

Publicar em PRs separados: conferir CI, integrar a API antes de publicá-la, publicar endpoints compatíveis e só então integrar/publicar o app. Uma exportação local não comprova produção. Não habilitar outra edição ou emissão geral como efeito de publicar esta tela.

## Evidência local de 11/10/2026

Suíte completa do app: 105 testes aprovados, nenhum ignorado; TypeScript aprovado. Build da API e exportação web do app aprovados. API: 144 testes aprovados e 14 casos dependentes de MySQL ignorados na suíte unitária; o runner MySQL isolado executou seus 13 casos com sucesso, incluindo consulta por proprietário, última revisão por edição e leitura com emissão desabilitada. O teste de capacidade/inscrições fora desse runner não foi reexecutado. A repetição focada dos sete testes de edições/histórico também passou; a primeira tentativa sem acesso de rede local foi bloqueada pelo sandbox, não por uma falha de autorização da API.

E2E com Edge, API sintética e nenhuma requisição à API real aprovado em 320/1280 px: seleção XIV/XV fictícia, download, revogado, modelo desconhecido, lista indisponível/vazia, geração explícita, reemissão e recarga da rota. Screenshots de ambas as larguras inspecionados, sem overflow ou sobreposição. Exports e evidências locais anteriores preservados em pastas separadas. O MySQL temporário foi desligado e seu datadir preservado; somente o schema aleatório criado pelo runner foi removido. Não houve migração adicional, alteração de produção ou emissão real na etapa local. A integração/publicação posterior foi confirmada separadamente e está descrita em Estado publicado e na evidência operacional.
