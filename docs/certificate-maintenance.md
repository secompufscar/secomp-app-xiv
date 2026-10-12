# Manutenção dos certificados

Revisão: 12/10/2026. Este guia descreve o código do repositório; integração e publicação são verificadas separadamente. O protótipo Python ilustrativo foi retirado. A opção ADMIN de baixar exemplo usa o mesmo gerador TypeScript, renderizador e assets dos participantes, sem modelo visual separado. O refinamento aprovado da capa V1 integra a comissão organizadora à declaração de participação e redistribui o bloco central, sem identificação solta abaixo das horas.

Consultar também [Meus certificados](my-certificates-web.md), [emissão e validação](certificate-notice-web.md) e [próximas edições da API](https://github.com/secompufscar/secomp-server-xiv/blob/main/docs/funcionalidades/certificados-proximas-edicoes.md). O balanço de testes e publicação fica na [revisão técnica](https://github.com/secompufscar/secomp-server-xiv/blob/main/docs/historico/auditorias/certificate-review-2026-10-11.md).

## Fluxo real

1. `src/components/home/homeCertificate.tsx` abre Meus certificados. `src/screens/certificates/myCertificatesScreen.tsx` lista, seleciona e recupera documentos da própria conta; apenas o comando explícito de geração emite. Ver [guia da área autenticada](my-certificates-web.md).
2. `src/services/certificates.ts` consulta `GET /certificates/mine`, `GET /certificates/mine/:code` e `POST /certificates/mine`, validando resumos, código, minutos, soma do anexo, URL/QR e apresentação. O servidor verifica credenciamento, presenças únicas e durações oficiais; o app não calcula elegibilidade.
3. A API guarda o snapshot de versão 2: evento, atividades e `presentation` (`edition`, `eventName`, `issuer`, `city`, `location`, `templateId`). A consulta pública e a recuperação autenticada usam esse registro, não a edição atual.
4. `src/screens/certificates/certificateValidationScreen.tsx` consulta `/validate/:code` sem credenciais e mostra a edição do certificado. Códigos inválidos/desconhecidos, revogados ou falhas de rede não oferecem download válido.
5. `src/services/certificateDownload.web.ts` carrega logos e fontes do modelo e define o nome do download. `src/utils/certificateDocument.ts` escolhe o renderizador por `templateId`; `src/utils/certificateDocumentV1.ts` desenha o modelo `secomp-landscape-v1` com jsPDF/AutoTable.

## Mapa do visual V1

Todas as coordenadas abaixo estão em milímetros numa página A4 horizontal de 297 × 210 mm. Fontes estão em pontos. O código usa `text` para texto simples e `fitted` para diminuir apenas o que ultrapassa a largura disponível.

| Alteração | Ponto de manutenção em `src/utils/certificateDocumentV1.ts` |
| --- | --- |
| Número da edição, ano, instituição e cidade | Argumento `presentation` e `certificate.event`; valores são persistidos pela API, não editar literais XIV/2026 |
| Nome do evento, local e período | `frame`, texto principal após a declaração da comissão e datas de `certificate.event` |
| Nome da pessoa | `fitted(certificate.participantName, ...)` na capa e no cabeçalho do anexo |
| Data e horário de emissão com segundos | `src/utils/certificateIssuedAt.ts`, usado no rodapé V1, em Meus certificados e na validação pública; prefixo `Emitido em`, somente `issuedAt` persistido |
| Textos fixos e comissão | Chamadas `text`/`fitted` da capa e `frame`; abertura `A Comissão Organizadora da ${presentation.edition} SECOMP certifica que`, em X=80/Y=77, largura 199 e fonte 11; não repetir a comissão abaixo das horas nem inventar signatários |
| Distribuição vertical da capa | Declaração Y=77, nome Y=94, sublinhado Y=101, participação Y=117 e período/local Y=125; faixa de horas Y=136 até 161, rótulo Y=144 e total Y=156; manter 20 mm até o divisor do rodapé em Y=181 |
| Horas por extenso e abreviadas | `fullWorkload` na capa; `workload` na tabela; minutos vêm da API |
| Logos e equilíbrio óptico | `logo`, `dcWidth = 40`, altura UFSCar de 14, centro Y de 18 e intervalo de 12; manter proporções das imagens |
| Fontes e pesos | `addFileToVFS`, `addFont`, `text`, `fitted`, `styles`, `headStyles` e `footStyles`; Inter regular e Poppins SemiBold |
| Cores e estrutura | `frame`, fundos, faixa lateral de 64,5 e linha verde de 1,3; cores explícitas em hexadecimal |
| Divisor do cabeçalho | `frame`: linha de X=80 a X=279 em Y=29, espessura explícita de 0,2; não herdar o estado de outros desenhos |
| Margens e largura útil | Conteúdo começa em X=80, termina em X=279; texto principal dispõe de 199 mm |
| Tabela e alinhamentos | `autoTable`: `startY = 60`, margens top=60/bottom=34/left=80/right=18, colunas 24/15/136/24 |
| Espaçamento entre data e horário | Colunas 0/1 lado a lado; `columnStyles` e `didParseCell` ajustam largura, centralização e padding do cabeçalho |
| Títulos, categorias e espaço entre linhas | Cópia local `activities`, `categoryLabels`, `didParseCell`, `didDrawCell`, fontSize 9, categoria 7,5 e padding inferior 3,6 no título |
| Duração e total do anexo | Coluna 3 à direita, margem interna 2,5; `footStyles` Poppins 9; `showFoot = lastPage` |
| Paginação | `rowPageBreak = avoid`, `willDrawPage` e loop final por página; não cortar atividades para forçar duas páginas |
| Rodapé, link e QR | Loop final: linha Y=181; emissão/código/endereço em 187/194/201 (fontes 8/9/7 pontos, largura 165), paginação X=11/Y=204/largura=44 em 7 pontos na faixa lateral; QR X=251/Y=183/lado=24 |

Os assets V1 ficam em `assets/certificate/v1/`: `secomp.png`, `dc.png`, `ufscar.png`, `Inter-Regular.ttf`, `Poppins-SemiBold.ttf` e a licença `OFL.txt`. São cópias versionadas: mudanças no ícone do app ou nos pacotes de fontes não devem substituir esses arquivos. O download e os testes carregam a mesma pasta; `tests/certificate-assets.test.cjs` confere seus hashes SHA-256 para detectar substituições acidentais.

Horários das atividades usam componentes UTC, como o cronograma existente; emissão usa `America/Sao_Paulo`. Não mudar fuso para corrigir visual. Nomes de atividade são do snapshot; corrigir cadastro não muda documentos já emitidos. Reemissão é uma operação administrativa auditada, não um efeito de baixar PDF.

O refinamento do anexo aprovado em 12/10/2026 usa `ATIVIDADE` como cabeçalho. Somente na apresentação do PDF, uma categoria `Mesa-redonda` ou um título iniciado por `Mesa Redonda`/`Mesa-redonda` identifica esse tipo e recebe o rótulo `Mesa-redonda`, inclusive quando o snapshot usa `Outros`. Remove-se apenas o prefixo inicial seguido de dois-pontos e de assunto não vazio; o restante do título é preservado. Menções no meio do título, nomes sem dois-pontos e títulos sem assunto não são recortados. As demais categorias continuam como antes. A cópia local não altera snapshots, cadastros, horas, emissão, revisões, códigos ou QRs; vale igualmente para PDF real e exemplo ADMIN. Data ausente usa `Não informada`, concordando com o cabeçalho `DATA`. `tests/certificate-document.test.cjs` cobre esses casos e a preservação integral da entrada. PDFs já baixados não mudam.

A API também fornece `Mesa-redonda` para os três IDs aprovados da XIV, independentemente do grupo `Outros` usado no cronograma. A mesa de curricularização pode assim usar o título completo `Da Sala de Aula à Comunidade: Desafios e Práticas da Curricularização da Extensão na Docência Universitária` sem depender de prefixo. O PDF preserva esse título integral; documentos antigos não recebem dados atuais do cadastro sem reemissão.

### Horário de emissão com segundos

O formato comum é `11/10/2026 às 17:25:33 (horário de Brasília)`, com relógio de 24 horas. `certificateIssuedAt` converte o instante ISO recebido da API para `America/Sao_Paulo`, preservando segundos e tratando a virada de dia. Não usar o horário do computador, o momento do download ou o início de uma atividade como emissão. O servidor já persiste e retorna `issuedAt`; não é necessária migração nem atualização da API.

A inclusão do horário V1 foi autorizada em 11/10/2026 como complemento de metadados, inclusive para downloads de certificados históricos. No refinamento autorizado, `Emitido em` precede o instante no rodapé de cada página, sem cidade; o local do evento continua na declaração principal. O bloco preserva 6 mm entre sua largura útil e o QR, sem ocupar a tabela. Esta alteração pontual modifica a apresentação dos PDFs regenerados, mas não os snapshots, os instantes originais, nomes, minutos, códigos, QRs, fontes, logos ou a seleção do modelo. PDFs locais já baixados não são sobrescritos. Não é uma autorização para redesenhar V1; novos visuais continuam exigindo outro `templateId`.

Uma reemissão recebe um novo `issuedAt`, código e revisão e revoga a anterior. Para corrigir títulos, conferir antes que IDs, categorias, horários e minutos das atividades continuem iguais; a API recomputa a partir das presenças atuais. Usar o endpoint administrativo existente, com motivo e responsável autenticado. Nunca alterar apenas o PDF, o snapshot antigo ou presumir que baixar novamente executará essa correção. Preservar evidências reais e dados pessoais somente em diretório privado, fora dos commits.

Os testes unitários cobrem segundos, meia-noite, virada de dia e timestamp inválido. O teste de PDF confere `Emitido em` exatamente uma vez por página, horário original, fonte de 8 pontos, três linhas alinhadas com 7 mm entre bases, limites do rodapé e margem do QR, ausência da instrução redundante, paginação de 7 pontos confinada à faixa lateral, ausência de cidade na emissão e preservação do local do evento. O E2E confere o mesmo formato em Meus certificados e na validação pública em 320/1280 px. Horários das atividades permanecem independentes do instante de emissão.

## Criar outro visual

O V1 estabelece a composição atual, incluindo as revisões visuais aprovadas para a XIV. Não há promessa de reproduzir o layout de PDFs baixados antes desse versionamento. A partir desta base, preservar renderizador e assets para downloads históricos.

1. Copiar o renderizador para `certificateDocumentV2.ts` e os assets necessários para `assets/certificate/v2/`, com novo ID, por exemplo `secomp-landscape-v2`. Não substituir V1, suas fontes ou logos.
2. Registrar o novo ID em `certificatePresentation.ts`, no dispatcher `certificateDocument.ts` e no carregamento de assets em `certificateDownload.web.ts`. O ID desconhecido deve continuar bloqueando o download, sem fallback silencioso.
3. Implementar ajustes apenas no novo modelo. Manter um teste de PDF V1 histórico e adicionar testes V2 para conteúdos extensos, nomes longos, durações, logos, QR, link e paginação.
4. Publicar suporte no app antes de habilitar emissões com o novo ID na API. Usar a configuração da edição somente para novas emissões. Consulta e reemissão antigas conservam o modelo registrado originalmente.

`snapshot.version` é formato de dados, não versão do visual. Não regravar snapshots antigos para mudar a marca. Legado sem `presentation` é aceito exclusivamente para XIV/2026, com identidade congelada em `certificatePresentation.ts`; manter esse fallback quando outras edições forem adicionadas.

O snapshot e o ID preservam conteúdo e seleção do modelo, não bytes idênticos de um PDF regenerado: jsPDF pode gerar metadados distintos e dependências precisam continuar sendo verificadas. O refinamento da declaração V1 aprovado em 11/10/2026 também aparece ao baixar novamente certificados desse modelo, sem alterar snapshots, emissão, códigos ou QRs; arquivos já baixados não são modificados. Isso não autoriza substituir V1 por um visual de outra edição. Quando a preservação binária for necessária, guardar também o arquivo originalmente emitido, sem substituí-lo.

## Próxima edição

O app não rejeita um certificado apenas por ter ano diferente de 2026. A API exige cadastro aprovado e `CERTIFICATE_YEAR` explícito; o app exige metadados válidos e modelo suportado. Hoje apenas XIV/2026 está aprovada; XV/2027 dos testes é fictícia.

Seguir o [procedimento da API](https://github.com/secompufscar/secomp-server-xiv/blob/main/docs/funcionalidades/certificados-proximas-edicoes.md) para evento, presença, credenciamento e plano oficial. Não trocar globalmente XIV por XV. `POST /mine` atende o ano configurado; `GET /mine` lista a última revisão já emitida de cada edição da conta, independentemente do ano configurado e da flag de emissão. Meus certificados permite selecionar e baixar históricos ativos com modelo suportado, além do acesso pelo código público. Não há primeira emissão retroativa de um ano escolhido no seletor.

## Verificação e publicação

```sh
npm run typecheck
npm test
npm run build:web
npx playwright install chromium
npm run test:certificates:e2e
```

`tests/certificate-document.test.cjs` extrai conteúdo/alinhamentos/fontes, confere paginação e renderiza páginas para leitura independente do QR. Inclui nova edição sintética e prova que o certificado XIV continua XIV após a troca. `tests/certificates.test.cjs` verifica contrato, legado e rejeição de metadados/modelos desconhecidos.

Inspecionar visualmente **todas** as páginas do PDF, não só texto extraído. Conferir capa/anexo, 13 horas por extenso, data/horário lado a lado, título longo, margem do QR, total alinhado, logos sem distorção e ausência de sobreposição. Na web, testar 320/1280 px, download, 404, 410, indisponibilidade e sessão expirada na consulta pública. Usar somente dados sintéticos em CI; PDFs reais e backups ficam privados.

Para preservar um `dist` ou evidências locais existentes, exportar para outra pasta com `npx expo export --platform web --output-dir dist-NOME_NOVO`. Pastas `dist-*` são ignoradas pelo Git e excluídas do TypeScript: bundles minificados não devem entrar na checagem das fontes. Não apagar exports existentes para resolver erros de tipos. O E2E aceita `CERTIFICATE_WEB_ROOT` para essa pasta e `CERTIFICATE_E2E_OUTPUT` para outro destino de evidências; por padrão usa `dist` e `test-results/certificates`. `CERTIFICATE_BROWSER_CHANNEL=msedge` usa Edge instalado. A exportação alternativa não executa o `postbuild:web` de cópia da política de privacidade; a publicação normal deve continuar usando `npm run build:web`.

PRs de app e API são separados. Fazer merge da API antes de publicá-la, conferir CI e publicar a API compatível antes do app. Não habilitar emissão antes de revisar o plano oficial e publicar a validação pública. Registrar teste local, merge e produção como estados diferentes. Rollback de app deve continuar suportando todo `templateId` já emitido.

## Regressões obrigatórias

O contrato rejeita resposta de outro código, total divergente, atividades/datas malformadas e URL ambígua. O download privado confere código, ano, edição e modelo novamente; o público reconfirma a validade antes de carregar os assets. Editar código, trocar edição/conta ou sair cancela o download, sem bloquear a operação seguinte nem aceitar resposta antiga.

A emissão também precisa propagar `AbortSignal` ao cliente autenticado. Testar saída da tela, logout e troca de conta durante a operação; uma resposta antiga não deve encerrar a emissão da conta seguinte. Trocar apenas a edição do seletor preserva a emissão explícita em andamento. `tests/session-recovery.test.cjs` usa Axios e os interceptadores reais com transporte simulado para verificar que uma emissão cancelada durante refresh não repete o POST com a nova sessão. Cancelar no app não reverte uma transação já confirmada pela API; recuperar o histórico e manter a idempotência, sem emissão compensatória ou regravação do snapshot.

Manter testes de credenciamento/duração, proprietário, revisão e revogação na API. O endpoint antigo `/admin/preview` deve retornar 404, inclusive com `format=example`. O novo `/admin/example` exige ADMIN e só prepara dados, sem escrita ou bypass de emissão real. Nome de Exemplo, código com G e QR inválido são os únicos identificadores do modelo; não acrescentar marca d'água, avisos ou renderizador alternativo. `tests/certificate-document.test.cjs` compara composição, fontes e posições de exemplo/real pelo mesmo gerador e decodifica o QR. Testar consulta sem presenças, exclusões/durações compartilhadas, um minicurso sem workshop simultâneo, cancelamento, retry e ausência de POST/inserção em banco. Para desenvolver outro visual, usar fixtures sintéticas e novo template versionado, não emitir certificados reais em produção.
