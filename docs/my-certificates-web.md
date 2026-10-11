# Meus certificados

Refinamento atual de apresentação: o PDF real usa três linhas no rodapé de cada página (`Emitido em`, código de validação e endereço), sem cidade na linha de emissão, e paginação separada na faixa lateral. A tela privada e a validação pública continuam usando o mesmo instante e formato, já identificados como `Emitido em`. Não houve mudança no fluxo, na API ou no registro do certificado; os marcos seguintes documentam as publicações anteriores.

Atualização publicada em 11/10/2026: app `6a228319` do [PR #42](https://github.com/secompufscar/secomp-app-xiv/pull/42) inclui horas, minutos, segundos e indicação de horário de Brasília, usando `issuedAt` persistido, também na validação pública e na capa do PDF real. TypeScript, 115 testes, build, CI do PR/merge, Vercel e E2E em 320/1280 px aprovados. O fluxo privado no app publicado foi verificado com APIs sintéticas, não com login interativo de participante. API e migrações não foram alteradas. As publicações seguintes neste guia são marcos históricos; regras de apresentação e reemissão estão no [guia de manutenção](certificate-maintenance.md#horário-de-emissão-com-segundos).

Publicado em 11/10/2026: app `8337d569` do [PR #35](https://github.com/secompufscar/secomp-app-xiv/pull/35), após publicação e validação da API `28780cc3` do [PR #40](https://github.com/secompufscar/secomp-server-xiv/pull/40). CI dos PRs/merges e deploys aprovados. [Evidência operacional](https://github.com/secompufscar/secomp-server-xiv/blob/main/docs/historico/auditorias/certificate-release-2026-10-11.md). Não houve emissão, reemissão ou escrita administrativa em produção nesta rodada.

## Estado publicado

[Meus certificados](https://secomp-app-xiv.vercel.app/MyCertificates) exige sessão; [validação pública](https://secomp-app-xiv.vercel.app/certificados) não exige login. Endpoints privados conferidos no deployment Railway `68f896cb-16ca-4439-8197-364afaa27a83`: lista/detalhe próprios 200, outra conta 404, próprio revogado 410, sem sessão 401 e `Cache-Control: no-store`. Cinco certificados existentes mantiveram hashes integrais antes/depois. Emissão segue habilitada para XIV/2026, sem alteração de variáveis ou migração adicional.

App publicado exercitado em 320/1280 px com API sintética para fluxo privado e, separadamente, API real para validação pública/download. PDF histórico baixado conferido: duas páginas, 11 atividades/780 minutos, mesmo código/link/QR, sem cortes. Isso não comprova login interativo/refresh real, emissão V2 real ou histórico multi-edição em produção; XV/2027 continua exclusiva dos testes. Revisões apenas documentais posteriores não alteram o código funcional identificado acima.

## Comportamento

Início abre a área autenticada `/MyCertificates`, disponível somente na web. O seletor apresenta a última revisão emitida de cada edição, ordenada por ano decrescente. Abrir, selecionar, atualizar ou baixar não emite um certificado. Uma revisão revogada permanece visível; o sistema não oferece uma versão anterior como se ainda fosse válida.

O comando separado **Gerar certificado da edição habilitada** usa a edição configurada na API. O ano selecionado no navegador não participa da emissão. Não existe primeira emissão retroativa pelo seletor. A geração continua exigindo credenciamento, presença certificável, durações oficiais e habilitação do servidor.

Certificados históricos podem ser consultados mesmo com emissão desabilitada ou outro ano configurado. O PDF usa o snapshot e o `templateId` originais, não o cadastro atual da edição. Snapshot legado XIV/2026 continua compatível. Um modelo desconhecido ou registro indisponível não impede selecionar outras edições; não recebe um visual substituto silenciosamente.

Atualizar mantém o código selecionado quando disponível; se houve reemissão, mantém a mesma edição e seleciona sua nova revisão. Após recarregar a página, a rota é restaurada e a edição mais recente é selecionada. A reemissão continua exclusivamente administrativa, auditada e com novo código/QR.

O instante de emissão é mostrado com data, horas, minutos e segundos, por exemplo `Emitido em 11/10/2026 às 17:25:33 (horário de Brasília)`. Meus certificados, validação pública e rodapé de todas as páginas do PDF real compartilham `src/utils/certificateIssuedAt.ts`, usando o `issuedAt` persistido pela API convertido para `America/Sao_Paulo`. Baixar novamente não muda esse instante; uma reemissão tem um novo instante e revisão. O texto pode ocupar mais de uma linha em telas estreitas, sem ocultar segundos ou fuso.

O seletor e o botão Atualizar têm altura fixa de 48 px e vão de 8 px, alinhados pela base. O botão não encolhe; o seletor se adapta à largura disponível. O E2E mede essas dimensões em 320/1280 px e guarda screenshots do trecho. Esse ajuste de espaçamento é exclusivo da tela web, sem alterar os PDFs ou a API.

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

### Certificado de teste para ADMIN

Publicação inicial (histórica) em 11/10/2026: app `bd3a82a7` do PR #37, após API `dd9085ae` do PR #42 publicada e validada. Dois ADMIN reais receberam 28 atividades/2370 minutos (39 horas e 30 minutos). [Evidência inicial preservada](https://github.com/secompufscar/secomp-server-xiv/blob/main/docs/historico/auditorias/admin-certificate-test-release-2026-10-11.md).

Correção atual publicada: app `5b547076` do PR #39, Vercel success, depois da API `5bc02005` do PR #44, Railway `84d93f23-498d-47b3-a97c-9ffd2c102c2d` SUCCESS. Duas contas ADMIN reais receberam 24 atividades/1680 minutos (28 horas), somente SDD nesse bloco; USER 403, anônimo 401, código público 404. Cinco certificados, atividades e presenças preservados por hash. API/app completos, runner MySQL 13/13, PDF de quatro páginas e E2E no app publicado em 320/1280 px conferidos. O fluxo visual privado usa APIs sintéticas; a consulta ADMIN real foi verificada separadamente. Validação pública/download histórico com API real conserva 11 atividades/780 minutos, mesmo código/QR e duas páginas. [Evidência atual e limites](https://github.com/secompufscar/secomp-server-xiv/blob/main/docs/historico/auditorias/admin-certificate-single-course-2026-10-11.md).

O botão **Baixar modelo de exemplo** é exclusivo de contas ADMIN na visão administrativa da web; fica oculto na prévia de participante. Não exige credenciamento, presença ou certificado anterior do administrador. Usa `GET /certificates/admin/preview?format=example` autenticado, nunca `POST /mine`, e não altera histórico, seleção, presenças ou dados da conta.

Nova regra de 11/10/2026: o documento apresenta **Nome de Exemplo** e usa exatamente o gerador do certificado real, sem avisos extras, textos em vermelho ou marcas de teste. O download chama-se `certificado-exemplo-secomp.pdf`. Inclui atividades certificáveis da edição habilitada na API, uma vez por ID. Na XIV, a amostra inclui somente **SDD** entre os quatro minicursos simultâneos e retira o workshop da Karina no mesmo horário: **24 atividades / 1680 minutos (28 horas)**. A escolha é estável, feita na API por IDs; não sorteia a cada download. Mantém exclusões do fluxo real (incluindo credenciamento, abertura, encerramento e os controles excluídos no cadastro) e requer duração/fonte oficiais para cada atividade incluída. Funciona com emissão real desabilitada. Duração pendente, edição não aprovada, ausência de minicurso elegível ou nenhuma atividade certificável bloqueiam a amostra inteira. Essas regras são exclusivas da amostra, sem mudar os certificados reais. As evidências de publicação acima são marcos anteriores.

O QR é legível, mas contém o código fictício fixo `0000000000000000000000000000000G`. Seus 32 caracteres mantêm a aparência do campo normal; o `G` final é incompatível com códigos reais hexadecimais. A página pública rejeita o código; a API pública retorna 404 antes de consultar certificados. O link e o código impresso são os mesmos do QR. Não há código aleatório, emissão, snapshot persistido, revisão ou auditoria de certificado real. A amostra não aparece no seletor. Seu horário é o instante de preparo, não uma emissão persistida; a ausência de avisos no PDF não lhe concede validade. A API sem `format=example` mantém o contrato legado para clientes antigos; o app atual sempre solicita o formato de exemplo.

Arquivos: cliente `src/services/certificateAdminPreview.ts`; contrato restrito `src/utils/certificateAdminPreview.ts`; adaptador `src/utils/certificateAdminPreviewDocument.ts`, que chama o gerador real `src/utils/certificateDocument.ts`; download em `src/services/certificateDownload.web.ts`. O renderizador e assets V1 dos documentos reais não precisam mudar para atender esta regra. Testes em `tests/certificate-admin-preview.test.cjs`, `tests/my-certificates.test.cjs` e `scripts/certificate-e2e.cjs` cobrem comparação visual pixel a pixel com o modelo real, contrato, permissão, cancelamento, clique duplicado, paginação e rejeição do QR. Para futuros modelos, usar o mesmo despacho por `templateId` e não criar outro desenho administrativo.

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
