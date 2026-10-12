# Meus certificados

Guia do código atual, revisado em 11/10/2026. ADMIN pode baixar um modelo de exemplo usando o mesmo gerador dos participantes. Seus certificados reais continuam sujeitos às mesmas regras de credenciamento e duração; não há exceção administrativa de elegibilidade.

[Área autenticada](https://secomp-app-xiv.vercel.app/MyCertificates) e [validação pública](https://secomp-app-xiv.vercel.app/certificados). A disponibilidade do domínio não comprova publicação desta revisão; conferir CI e deployment conforme a [revisão técnica](https://github.com/secompufscar/secomp-server-xiv/blob/main/docs/historico/auditorias/certificate-review-2026-10-11.md).

## Comportamento

Início abre a área autenticada `/MyCertificates`, disponível somente na web. O seletor apresenta a última revisão emitida de cada edição, ordenada por ano decrescente. Abrir, selecionar, atualizar ou baixar não emite um certificado. Uma revisão revogada permanece visível; o sistema não oferece uma versão anterior como se ainda fosse válida.

O comando separado **Gerar certificado da edição habilitada** usa a edição configurada na API. O ano selecionado no navegador não participa da emissão. Não existe primeira emissão retroativa pelo seletor. A geração continua exigindo credenciamento, presença certificável, durações oficiais e habilitação do servidor.

A requisição de emissão usa `AbortSignal`: sair da tela, encerrar a sessão ou trocar de conta cancela o transporte e impede que uma tentativa tardia continue pelo cliente. Cada operação tem seu próprio controlador; o término de uma emissão cancelada não desbloqueia uma emissão nova nem substitui sua resposta. Trocar apenas a edição selecionada não cancela a emissão explícita da edição configurada. Cancelar no navegador não desfaz uma transação que o servidor já confirmou: ao voltar, atualizar o histórico antes de tentar novamente; a API mantém a emissão idempotente.

Certificados históricos podem ser consultados mesmo com emissão desabilitada ou outro ano configurado. O PDF usa o snapshot e o `templateId` originais, não o cadastro atual da edição. Snapshot legado XIV/2026 continua compatível. Um modelo desconhecido ou registro indisponível não impede selecionar outras edições; não recebe um visual substituto silenciosamente.

Atualizar mantém o código selecionado quando disponível; se houve reemissão, mantém a mesma edição e seleciona sua nova revisão. Após recarregar a página, a rota é restaurada e a edição mais recente é selecionada. A reemissão continua exclusivamente administrativa, auditada e com novo código/QR.

O instante de emissão é mostrado com data, horas, minutos e segundos, por exemplo `Emitido em 11/10/2026 às 17:25:33 (horário de Brasília)`. Meus certificados, validação pública e rodapé de todas as páginas do PDF real compartilham `src/utils/certificateIssuedAt.ts`, usando o `issuedAt` persistido pela API convertido para `America/Sao_Paulo`. Baixar novamente não muda esse instante; uma reemissão tem um novo instante e revisão. O texto pode ocupar mais de uma linha em telas estreitas, sem ocultar segundos ou fuso.

O seletor e o botão Atualizar têm altura fixa de 48 px e vão de 8 px, alinhados pela base. O botão não encolhe; o seletor se adapta à largura disponível. O controle continua sendo um `select` nativo, com navegação por teclado; apenas sua seta é substituída pelo ícone ChevronDown, decorativo e sem interceptar cliques. A seta tem margem direita de 12 px, e o texto reserva 44 px nesse lado. O E2E mede essas dimensões e testa o teclado em 320/1280 px, guardando screenshots do trecho. Esse ajuste de espaçamento é exclusivo da tela web, sem alterar os PDFs ou a API.

## Contrato e segurança

| Requisição autenticada | Resultado |
| --- | --- |
| `GET /certificates/mine` | `{ certificates: [...] }`, um resumo da última revisão por edição da própria conta |
| `GET /certificates/mine/:code` | Documento completo da própria conta, no mesmo formato da validação pública |
| `POST /certificates/mine` | Emissão explícita da edição configurada ou recuperação do registro ativo existente |

Resumo: `code`, `year`, `edition`, `templateId`, `status`, `revision`, `issuedAt`, `totalMinutes`. Estados: `active`, `revoked`, `unavailable`; metadados não identificáveis podem ser nulos. A lista não inclui nome, e-mail, QR, atividades ou justificativas administrativas.

A API deriva o proprietário da sessão, nunca de parâmetros fornecidos pelo navegador. Código de outra conta ou inexistente retorna 404; código revogado da própria conta retorna 410. Sem autenticação, os endpoints privados retornam 401. Respostas usam `Cache-Control: no-store`. A consulta pública permanece em `/certificados?codigo=...`, sem credenciais.

Lista vazia confirmada e falha de rede têm estados diferentes. Consultas antigas são canceladas e suas respostas descartadas ao selecionar, atualizar, sair ou trocar de conta. Antes de baixar, tanto a área autenticada quanto a pública reconfirmam a validade do código. Na área privada, código/ano/edição/modelo devem corresponder ao resumo selecionado. Trocar a seleção, editar o código público ou sair cancela também o carregamento de assets; a resposta anterior não bloqueia nem encerra uma operação nova. Nenhuma verificação local impede uma revogação posterior: a validade atual é sempre a da consulta pública. A visão simulada de participante de um ADMIN não gera documentos nem assume a identidade de outro usuário.

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

## Modelo de exemplo para ADMIN

O botão **Baixar modelo de exemplo** aparece somente na web, para ADMIN fora da visão simulada de participante. Funciona mesmo com histórico vazio ou sem credenciamento. Consulta `GET /certificates/admin/example`, que exige ADMIN no servidor, e encaminha o documento a `downloadCertificate`, `certificateDocument.ts` e ao renderizador/assets do modelo informado: não há gerador, estilo ou aviso exclusivo de amostra.

Nome fixo **Nome de Exemplo**, código `0000000000000000000000000000000G` e QR apontando para esse mesmo código inválido. O `G` não pertence ao formato hexadecimal de certificados reais; cliente público e API rejeitam o código. Nenhum registro entra no histórico, na tabela de certificados ou nas presenças. `Emitido em` indica o instante de preparação do exemplo, não uma emissão persistida.

A API lê a edição configurada, seus títulos e durações oficiais. Aplica as mesmas exclusões e validações de minutos/fonte dos certificados reais. Na XIV seleciona um único minicurso (SDD preferencial, outro cadastrado como alternativa) e exclui os demais minicursos e o workshop simultâneo; o plano atual soma 28 horas. Não copia as presenças do ADMIN, não infere horas e não depende de `CERTIFICATES_ENABLED`. Outra edição exige seleção aprovada para exemplo; sem isso ou com duração pendente retorna 409.

O exemplo tem operação e erro próprios. Clique duplicado é bloqueado; sair, trocar de conta ou entrar na visão de participante cancela consulta/assets e descarta respostas antigas. Seleção e histórico reais não são substituídos pelo exemplo. Testes cobrem essas condições e o E2E baixa o modelo em 320/1280 px sem POST de emissão.

## Verificação e publicação

`npm run typecheck`, `npm test`, exportação web e `npm run test:certificates:e2e`. `tests/my-certificates.test.cjs` cobre seleção sem emissão, cancelamento, troca de conta, revisão substituta, erro/vazio, geração explícita, validade antes do download e restrições mobile/preview. `tests/certificates.test.cjs` cobre o contrato; `tests/web-routing.test.cjs` cobre restauração. O E2E intercepta todas as requisições externas e usa somente edições e pessoas sintéticas em 320/1280 px.

Na API, executar testes unitários, build e o runner MySQL isolado. Verificar ausência de acesso a certificados de outra conta, leitura com emissão desabilitada e seleção da última revisão, inclusive revogada. O teste de banco usa migrações existentes; este incremento não exige migração adicional.

Publicar em PRs separados: conferir CI, integrar a API antes de publicá-la, publicar endpoints compatíveis e só então integrar/publicar o app. Uma exportação local não comprova produção. Não habilitar outra edição ou emissão geral como efeito de publicar esta tela.

O endpoint antigo `/admin/preview`, inclusive `format=example`, permanece 404. A opção restaurada usa somente `/admin/example` e o pipeline real de PDF, sem reintroduzir modo de teste com avisos ou o protótipo Python. Não há fallback para emissão real se o exemplo falhar.
