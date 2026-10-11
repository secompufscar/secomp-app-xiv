# Manutenção dos certificados

Composição atual do PDF real: rodapé com três linhas, `Emitido em` (data, horário com segundos e fuso), `Código de validação` e endereço. A paginação fica separada, na base da faixa lateral; a instrução redundante de validação foi retirada. A cidade permanece no texto do evento, sem repetição na emissão. A comissão fica em Y=166, separada do rodapé. Este refinamento autorizado é somente de apresentação; não exige reemissão nem escrita na API. Os parágrafos seguintes registram publicações anteriores.

Complemento publicado em 11/10/2026: app `6a228319` do [PR #42](https://github.com/secompufscar/secomp-app-xiv/pull/42) mostra data e horário de emissão com segundos na capa do PDF real, em Meus certificados e na validação pública. CI do PR/merge e [deploy Vercel](https://vercel.com/secomp-tis-projects/secomp-app-xiv/DjYFDD48o4k5iqN6pCPrwtWGjJ6G) aprovados; E2E no app publicado em 320/1280 px aprovado com APIs sintéticas. A API vigente não foi modificada nem republicada. Os identificadores abaixo documentam os marcos anteriores; as regras de metadados deste incremento estão em Horário de emissão com segundos.

Revisão: 11/10/2026. Este guia descreve o código funcional publicado pelo app `8337d569` (PR #35), compatível com a API `28780cc3` (PR #40), publicada primeiro. CI e deploys confirmados; [evidência e limites](https://github.com/secompufscar/secomp-server-xiv/blob/main/docs/historico/auditorias/certificate-release-2026-10-11.md). Para regras e contrato, consultar [emissão e validação web](certificate-notice-web.md) e o [guia de próximas edições da API](https://github.com/secompufscar/secomp-server-xiv/blob/main/docs/funcionalidades/certificados-proximas-edicoes.md). Revisões documentais posteriores não modificam os modelos funcionais indicados.

Incremento anterior da seleção administrativa (histórico): app `5b547076` (PR #39) e API `5bc02005` (PR #44), API publicada/validada primeiro. Corrigiu a amostra ADMIN para apenas SDD no bloco simultâneo (24 atividades/28 horas) e usava texto de amostra, sem mudar os modelos reais acima. Ver [estado e limitações dessa publicação](https://github.com/secompufscar/secomp-server-xiv/blob/main/docs/historico/auditorias/admin-certificate-single-course-2026-10-11.md). A regra atual de identidade e aparência está em Modelo ADMIN fiel; a publicação inicial dos PRs #37/#42 permanece como histórico.

## Fluxo real

1. `src/components/home/homeCertificate.tsx` abre Meus certificados. `src/screens/certificates/myCertificatesScreen.tsx` lista, seleciona e recupera documentos da própria conta; apenas o comando explícito de geração emite. Ver [guia da área autenticada](my-certificates-web.md).
2. `src/services/certificates.ts` consulta `GET /certificates/mine`, `GET /certificates/mine/:code` e `POST /certificates/mine`, validando resumos, código, minutos, soma do anexo, URL/QR e apresentação. O servidor verifica credenciamento, presenças únicas e durações oficiais; o app não calcula elegibilidade.
3. A API guarda o snapshot de versão 2: evento, atividades e `presentation` (`edition`, `eventName`, `issuer`, `city`, `location`, `templateId`). A consulta pública e a recuperação autenticada usam esse registro, não a edição atual.
4. `src/screens/certificates/certificateValidationScreen.tsx` consulta `/validate/:code` sem credenciais e mostra a edição do certificado. Códigos inválidos/desconhecidos, revogados ou falhas de rede não oferecem download válido.
5. `src/services/certificateDownload.web.ts` carrega logos e fontes do modelo e define o nome do download. `src/utils/certificateDocument.ts` escolhe o renderizador por `templateId`; `src/utils/certificateDocumentV1.ts` desenha o modelo `secomp-landscape-v1` com jsPDF/AutoTable.

`scripts/certificates/create_certificate_model.py` é um gerador **ilustrativo independente**, com dados fictícios e saídas PDF/SVG/HTML. Não consulta o banco, não emite códigos e não altera o PDF do app. Para modificar o certificado real, começar pelos arquivos TypeScript acima. Manter o script e seus outputs locais; se o modelo ilustrativo também precisar mudar, revisá-lo separadamente.

## Mapa do visual V1

A seleção de atividades da amostra é responsabilidade exclusiva da API (`certificateAdminPreviewPolicy.ts`), não deste desenho. Na XIV: somente SDD no bloco simultâneo, sem os outros três minicursos nem o workshop da Karina, total aprovado de 24 atividades/28 horas. Nunca filtrar o PDF depois de recebê-lo: isso poderia separar o total do anexo. Para outra edição, revisar o bloco administrativo na API antes de publicar; preservar o renderizador real V1 e seus assets.

Nova regra ADMIN de 11/10/2026: a amostra é visualmente idêntica ao certificado real, com `Nome de Exemplo` e código/QR inválidos, sem faixas, avisos vermelhos, marca-d'água ou textos adicionais. `src/utils/certificateAdminPreviewDocument.ts` apenas valida o contrato e delega a `createCertificatePdf`, incluindo a seleção por `templateId`; não duplica mais o desenho. Usa os mesmos assets, textos, fontes, tabela, rodapé e paginação descritos neste mapa. Alterar o modelo real passa a atualizar também sua amostra, sem mexer nos registros antigos; novos visuais continuam exigindo versionamento. O teste compara os PNGs de todas as páginas, pixel a pixel, com a renderização normal dos mesmos dados.

O fluxo administrativo continua separado da emissão. O cliente pede `GET /certificates/admin/preview?format=example`; o contrato exige `kind: admin-test`, nome fixo e código `0000000000000000000000000000000G`. O `G` final impede validação ou colisão com códigos reais hexadecimais, embora a largura tenha 32 caracteres. QR e link usam esse mesmo código; nada é persistido. `issuedAt` é o instante de preparo da amostra, apresentado como no modelo real, não uma emissão acadêmica. Sem `format=example`, a API conserva o contrato antigo somente para compatibilidade com clientes anteriores durante a publicação. Publicar a API compatível antes do app. Ver [fluxo administrativo de exemplo](my-certificates-web.md#certificado-de-teste-para-admin).

Todas as coordenadas abaixo estão em milímetros numa página A4 horizontal de 297 × 210 mm. Fontes estão em pontos. O código usa `text` para texto simples e `fitted` para diminuir apenas o que ultrapassa a largura disponível.

| Alteração | Ponto de manutenção em `src/utils/certificateDocumentV1.ts` |
| --- | --- |
| Número da edição, ano, instituição e cidade | Argumento `presentation` e `certificate.event`; valores são persistidos pela API, não editar literais XIV/2026 |
| Nome do evento, local e período | `frame`, texto principal após `Certificamos que` e datas de `certificate.event` |
| Nome da pessoa | `fitted(certificate.participantName, ...)` na capa e no cabeçalho do anexo |
| Data e horário de emissão com segundos | `src/utils/certificateIssuedAt.ts`, usado no rodapé V1, em Meus certificados e na validação pública; prefixo `Emitido em`, somente `issuedAt` persistido |
| Textos fixos e comissão | Chamadas `text`/`fitted` da capa e `frame`; não inventar signatários |
| Horas por extenso e abreviadas | `fullWorkload` na capa; `workload` na tabela; minutos vêm da API |
| Logos e equilíbrio óptico | `logo`, `dcWidth = 40`, altura UFSCar de 14, centro Y de 18 e intervalo de 12; manter proporções das imagens |
| Fontes e pesos | `addFileToVFS`, `addFont`, `text`, `fitted`, `styles`, `headStyles` e `footStyles`; Inter regular e Poppins SemiBold |
| Cores e estrutura | `frame`, fundos, faixa lateral de 64,5 e linha verde de 1,3; cores explícitas em hexadecimal |
| Divisor do cabeçalho | `frame`: linha de X=80 a X=279 em Y=29, espessura explícita de 0,2; não herdar o estado de outros desenhos |
| Margens e largura útil | Conteúdo começa em X=80, termina em X=279; texto principal dispõe de 199 mm |
| Tabela e alinhamentos | `autoTable`: `startY = 60`, margens top=60/bottom=34/left=80/right=18, colunas 24/15/136/24 |
| Espaçamento entre data e horário | Colunas 0/1 lado a lado; `columnStyles` e `didParseCell` ajustam largura, centralização e padding do cabeçalho |
| Categorias e espaço entre linhas | `categoryLabels`, `didParseCell`, `didDrawCell`, fontSize 9, categoria 7,5 e padding inferior 3,6 no título |
| Duração e total do anexo | Coluna 3 à direita, margem interna 2,5; `footStyles` Poppins 9; `showFoot = lastPage` |
| Paginação | `rowPageBreak = avoid`, `willDrawPage` e loop final por página; não cortar atividades para forçar duas páginas |
| Rodapé, link e QR | Loop final: linha Y=181; emissão/código/endereço em 187/194/201 (fontes 8/9/7 pontos, largura 165), paginação X=11/Y=204/largura=44 em 7 pontos na faixa lateral; QR X=251/Y=183/lado=24 |

Os assets V1 ficam em `assets/certificate/v1/`: `secomp.png`, `dc.png`, `ufscar.png`, `Inter-Regular.ttf`, `Poppins-SemiBold.ttf` e a licença `OFL.txt`. São cópias versionadas: mudanças no ícone do app ou nos pacotes de fontes não devem substituir esses arquivos. O download e os testes carregam a mesma pasta; `tests/certificate-assets.test.cjs` confere seus hashes SHA-256 para detectar substituições acidentais.

Horários das atividades usam componentes UTC, como o cronograma existente; emissão usa `America/Sao_Paulo`. Não mudar fuso para corrigir visual. Nomes de atividade são do snapshot; corrigir cadastro não muda documentos já emitidos. Reemissão é uma operação administrativa auditada, não um efeito de baixar PDF.

### Horário de emissão com segundos

O formato comum é `11/10/2026 às 17:25:33 (horário de Brasília)`, com relógio de 24 horas. `certificateIssuedAt` converte o instante ISO recebido da API para `America/Sao_Paulo`, preservando segundos e tratando a virada de dia. Não usar o horário do computador, o momento do download ou o início de uma atividade como emissão. O servidor já persiste e retorna `issuedAt`; não é necessária migração nem atualização da API.

A inclusão do horário V1 foi autorizada em 11/10/2026 como complemento de metadados, inclusive para downloads de certificados históricos. No refinamento autorizado, `Emitido em` precede o instante no rodapé de cada página, sem cidade; o local do evento continua na declaração principal. O bloco preserva 6 mm entre sua largura útil e o QR, sem ocupar a tabela. Esta alteração pontual modifica a apresentação dos PDFs regenerados, mas não os snapshots, os instantes originais, nomes, minutos, códigos, QRs, fontes, logos ou a seleção do modelo. PDFs locais já baixados não são sobrescritos. Não é uma autorização para redesenhar V1; novos visuais continuam exigindo outro `templateId`.

Uma reemissão recebe um novo `issuedAt`, código e revisão e revoga a anterior. Para corrigir títulos, conferir antes que IDs, categorias, horários e minutos das atividades continuem iguais; a API recomputa a partir das presenças atuais. Usar o endpoint administrativo existente, com motivo e responsável autenticado. Nunca alterar apenas o PDF, o snapshot antigo ou presumir que baixar novamente executará essa correção. Preservar evidências reais e dados pessoais somente em diretório privado, fora dos commits.

Os testes unitários cobrem segundos, meia-noite, virada de dia e timestamp inválido. O teste de PDF confere `Emitido em` exatamente uma vez por página, horário original, fonte de 8 pontos, três linhas alinhadas com 7 mm entre bases, limites do rodapé e margem do QR, ausência da instrução redundante, paginação de 7 pontos confinada à faixa lateral, ausência de cidade na emissão e preservação do local do evento. O E2E confere o mesmo formato em Meus certificados e na validação pública em 320/1280 px. Horários de atividades e a prévia ADMIN sem validade não foram modificados por este incremento.

## Criar outro visual

O V1 estabelece a composição atual, incluindo as revisões visuais aprovadas para a XIV. Não há promessa de reproduzir o layout de PDFs baixados antes desse versionamento. A partir desta base, preservar renderizador e assets para downloads históricos.

1. Copiar o renderizador para `certificateDocumentV2.ts` e os assets necessários para `assets/certificate/v2/`, com novo ID, por exemplo `secomp-landscape-v2`. Não substituir V1, suas fontes ou logos.
2. Registrar o novo ID em `certificatePresentation.ts`, no dispatcher `certificateDocument.ts` e no carregamento de assets em `certificateDownload.web.ts`. O ID desconhecido deve continuar bloqueando o download, sem fallback silencioso.
3. Implementar ajustes apenas no novo modelo. Manter um teste de PDF V1 histórico e adicionar testes V2 para conteúdos extensos, nomes longos, durações, logos, QR, link e paginação.
4. Publicar suporte no app antes de habilitar emissões com o novo ID na API. Usar a configuração da edição somente para novas emissões. Consulta e reemissão antigas conservam o modelo registrado originalmente.

`snapshot.version` é formato de dados, não versão do visual. Não regravar snapshots antigos para mudar a marca. Legado sem `presentation` é aceito exclusivamente para XIV/2026, com identidade congelada em `certificatePresentation.ts`; manter esse fallback quando outras edições forem adicionadas.

O snapshot e o ID preservam conteúdo e seleção do modelo, não bytes idênticos de um PDF regenerado: jsPDF pode gerar metadados distintos e dependências precisam continuar sendo verificadas. Quando a preservação binária for necessária, guardar também o arquivo originalmente emitido, sem substituí-lo.

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

## Evidência local de 11/10/2026

### Modelo ADMIN fiel

TypeScript e os 115 testes do app aprovados, sem casos ignorados; exportação em pasta nova e E2E com APIs sintéticas aprovados em 320/1280 px, sem chamadas à API real. O teste da amostra de 24 atividades/1680 minutos compara os pixels de **todas as páginas** com o renderizador normal, confere ausência de avisos extras, nome `Nome de Exemplo`, total e atividades, e decodifica o QR com o mesmo código inválido do link. O download usa `certificado-exemplo-secomp.pdf`, não emite nem muda a seleção ou o histórico. CI, MySQL e produção são etapas distintas, a confirmar nos PRs separados antes de publicar API e app, nessa ordem.

Correção adicional aprovada do cabeçalho: `frame` fixa o divisor horizontal em 0,2 mm, sem herdar os 0,8 mm do destaque sob o nome na capa. O ajuste é compartilhado pelo PDF real e pela amostra; não altera conteúdo, snapshots ou códigos. O teste de regressão lê os operadores vetoriais do PDF e confere uma única linha nessa posição, com 0,2 mm em cada página, inclusive anexos com paginação. Antes da correção, reproduziu os 0,8 mm da página 2. Arquivos locais antigos não são sobrescritos.

Depois dessa correção, TypeScript, os **116 testes**, nova exportação e E2E sintético em 320/1280 px aprovados. A API compatível foi integrada pelo [PR #46](https://github.com/secompufscar/secomp-server-xiv/pull/46), com CI unitária e MySQL isolado aprovados no PR e no merge `6e7126f6`, e publicada antes do app no deployment Railway `a168511f-2bbf-47f5-873c-3df7a4e04899` SUCCESS. Duas contas ADMIN receberam a amostra nova; contrato legado 200, participante 403, anônimo 401, marcador público 404 e histórico sem a amostra. Hashes integrais dos seis registros de certificado, atividades e presenças permaneceram iguais antes/depois; 19 migrações já concluídas, sem mudança de flags, esquema ou dados. O app é publicado separadamente pelo [PR #45](https://github.com/secompufscar/secomp-app-xiv/pull/45); verificar seus checks e o deployment, sem inferir publicação a partir do ensaio local.

### Emissão no rodapé

TypeScript e os 115 testes do app aprovados, sem casos ignorados; exportação web em pasta nova e E2E com APIs sintéticas em 320/1280 px aprovados, sem requisições à API real. O PDF real foi regenerado localmente do snapshot privado existente: três páginas, 19 atividades/1260 minutos, mesmo instante, código, link e QR, com `Emitido em` em cada rodapé. Todas as páginas foram inspecionadas e seus QRs decodificados; o local do evento permanece no corpo, sem cidade na emissão. Este ensaio não executa reemissão nem escrita em produção. CI e deploy devem ser conferidos separadamente no PR correspondente; arquivos privados e PDFs baixados anteriormente permanecem fora dos commits e não são sobrescritos.

### Área Meus certificados

A rodada posterior implementou seleção da última revisão por edição e consultas privadas, sem geração automática. Suíte completa do app com 105 casos, TypeScript, exportação web e E2E sintético em 320/1280 px aprovados. API com 144 casos unitários aprovados e 13 casos aprovados no MySQL isolado. Evidências locais no [guia de Meus certificados](my-certificates-web.md#evidência-local-de-11102026); CI remota, merges e publicação foram confirmados depois, conforme [estado publicado](my-certificates-web.md#estado-publicado). O certificado histórico baixado do domínio publicado manteve 11 atividades, 780 minutos, código e QR em duas páginas inspecionadas, sem reemissão.

### Versionamento do modelo

TypeScript aprovado; suíte do app com 96 testes aprovada e teste adicional de hashes dos assets V1 aprovado (97 casos no conjunto). Exportação web concluída em pasta separada, após repetir fora do sandbox uma tentativa que havia compilado mas não conseguira gravar assets. E2E com Edge e API sintética aprovado em 320/1280 px: XIV legada, XV/2027 fictícia com metadados, retorno à XIV, downloads, 404/410, indisponibilidade e diálogo autenticado. Nenhuma requisição do E2E alcançou a API real.

O certificado XIV existente foi renderizado localmente com o snapshot privado já disponível: duas páginas, 11 atividades, 780 minutos, sem mudança de código/QR; ambas as páginas foram inspecionadas com PDF.js e Poppler. Os QRs foram decodificados independentemente. Esse ensaio local não era reemissão nem confirmação de publicação. CI remota, merge e deploy foram conferidos na rodada posterior, descrita no estado publicado acima.
