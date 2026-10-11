# Certificados individuais na web

Revisão: 11/10/2026. Guia do código mantido; testes, integração e produção são estados distintos. A amostra ADMIN e o protótipo Python foram retirados. O [balanço técnico](https://github.com/secompufscar/secomp-server-xiv/blob/main/docs/historico/auditorias/certificate-review-2026-10-11.md) registra a revisão e publicação; as [auditorias reais anteriores](https://github.com/secompufscar/secomp-server-xiv/blob/main/docs/historico/auditorias/certificate-release-2026-10-11.md) permanecem como evidência histórica.

## Fluxo e elegibilidade

A Home abre **Meus certificados**, disponível na web com sessão. Listar, selecionar, atualizar ou baixar não emite nada. O comando **Gerar certificado da edição habilitada** usa a edição configurada na API, sem enviar o ano selecionado. Repetir recupera o registro ativo existente. Não existe primeira emissão retroativa pelo seletor.

Credenciamento confirmado na mesma edição comprova a doação. Somam-se apenas atividades certificáveis da edição com presença, uma vez por ID. Na XIV, credenciamento, Feira da Comp, Camisetas, Coffee, Lual, abertura e encerramento ficam fora. Ausência de credenciamento retorna 403 com aviso; duração oficial pendente, ausência de atividades certificáveis ou emissão desabilitada retornam 409 com aviso. Isso vale também para ADMIN, sem bypass.

Durações da XIV aprovadas: palestras de 60 minutos, inclusive às 11h sem almoço; minicursos de 180; workshop Karina e Maratona M@U de 150; curricularização de 60; mesa Monks de 90 pela regra de intervalo aprovada. O plano por ID e suas fontes pertencem à API. Pontos, check-in ou programação seguinte não são usados para inferir horas durante emissão. Outra edição exige novo plano aprovado.

A última revisão de cada edição aparece no histórico, inclusive revogada/indisponível. Código de outra conta recebe 404; revogado próprio recebe 410. Falha de rede não é confundida com lista vazia. Visão simulada de participante de um ADMIN não emite nem muda de identidade. Ver [contrato e estados da área privada](my-certificates-web.md).

## Consulta e PDF

A página pública `/certificados?codigo=...` consulta sem autenticação nem recuperação de sessão. Não lista participantes por nome/e-mail. Malformado/desconhecido recebe 404; revogado recebe 410 sem justificativa administrativa. O cliente exige que o código recebido seja o consultado e valida datas, atividades, total, apresentação e URL.

Downloads privados e públicos reconfirmam validade. Na área privada, código/ano/edição/modelo devem corresponder à seleção. Trocar edição/conta, editar o código público ou sair cancela a consulta e o carregamento dos assets; respostas antigas não são aceitas. Um PDF já baixado não pode ser retirado do dispositivo: validade atual é a da consulta pública.

PDF real gerado por `src/utils/certificateDocument.ts`, com despacho por `templateId`. O V1 fica em `certificateDocumentV1.ts`, usando jsPDF/AutoTable e assets congelados. Nome, evento, atividades e total vêm do snapshot; não são recalculados no navegador. QR e link usam o código salvo. Capa mostra horas por extenso; anexo mostra atividades, categoria no singular, data/horário lado a lado e duração, com paginação sem cortes.

Rodapé: `Emitido em`, código de validação e endereço; QR separado e paginação discreta na faixa lateral. Data, horas, minutos, segundos e fuso vêm de `issuedAt` convertido para `America/Sao_Paulo` por `certificateIssuedAt.ts`, compartilhado com as duas telas. Horários das atividades conservam componentes UTC como o cronograma. Não usar horário do download como emissão.

Para textos, logos, fontes, margens, tabela, rodapé, paginação e futuros visuais, consultar o [mapa de manutenção](certificate-maintenance.md). Outro visual exige novo renderizador/assets e novo ID, preservando V1 e snapshots antigos. Código desconhecido nunca recebe fallback silencioso. Títulos corrigidos no cadastro só chegam a documentos antigos por reemissão administrativa auditada, com novo código e revogação do anterior.

## Verificação e publicação

`npm run typecheck`, `npm test`, `npm run build:web`, instalação de Chromium e `npm run test:certificates:e2e`. O E2E intercepta/bloqueia requisições externas e usa somente fixtures sintéticas em 320/1280 px. `CERTIFICATE_WEB_ROOT`, `CERTIFICATE_E2E_OUTPUT` e `CERTIFICATE_BROWSER_CHANNEL=msedge` permitem exportação/evidências alternativas e Edge local.

Testes de PDF verificam conteúdo, total, títulos longos, logos/fontes, links, QR decodificado, alinhamentos, rodapé e páginas extensas. Testes das telas cobrem cancelamento, retry, revogação antes do download e seleção sem emissão. Isso não comprova login real, câmera física, todos os participantes ou capacidade em produção.

API e app usam PRs separados; fazer merge da API antes de publicá-la e conferir seu deploy, depois o app. Não habilitar outra edição ou alterar flags automaticamente. Guardar PDFs reais, backups e dados pessoais somente em diretório privado. Outputs sintéticos antigos podem ser limpos por lista explícita, sem apagar diretórios privados ou arquivos desconhecidos.
