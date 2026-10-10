# Certificados individuais na web

A tela Início disponibiliza **Gerar certificado** para participantes e administradores. Abrir o diálogo não emite nada. O comando dentro do diálogo solicita `POST /certificates/mine` para o usuário autenticado. Após sucesso, mostra nome, carga horária, código, link público e **Baixar PDF**. Ao repetir, a API devolve o mesmo registro. Fechar ou sair da tela descarta respostas tardias. Android/iOS continuam sem essa opção.

O credenciamento confirmado na edição 2026 comprova a doação. A carga horária soma apenas atividades dessa edição com presença registrada, uma vez por atividade, excluindo credenciamento. Ausência de credenciamento, de atividades certificáveis ou de duração oficial impede emissão. O servidor decide a elegibilidade; o navegador não calcula horas a partir do histórico.

## Durações

Regra atualizada pela organização em 09/10/2026: a duração pode ser a diferença de inícios quando houver uma atividade imediatamente seguinte no mesmo local. Sem sucessora clara, consultar a organização; não usar pontos ou check-in. O workshop de terça da Karina dura 150 minutos. Minicursos/workshop simultâneos não servem de término uns para os outros. Restam confirmações para atividades sem sucessora e intervalos ambíguos. Camisetas, Coffee e Lual aguardam definição específica antes de serem excluídos ou contabilizados.

O banco da API armazena minutos e fonte da duração. A emissão global permanece bloqueada até `CERTIFICATES_ENABLED=true`; a duração ausente em qualquer atividade presente continua bloqueando o certificado individual. Contrato, migração e sequência de liberação estão em `secomp-server-xiv/docs/funcionalidades/certificados.md`.

## PDF e validação

O PDF A4 horizontal preserva as logos originais SECOMP, DC e UFSCar, fontes Inter/Poppins, identificação da XIV edição e paleta do modelo. A primeira página mostra nome, período, carga horária total, emissão, código, link e QR. O anexo lista nome, categoria, data/início e duração das atividades do snapshot. Listas extensas continuam em páginas adicionais, repetindo logos, identificação, código e QR, sem truncar atividades. Horários de atividade seguem os componentes UTC usados pelo cronograma existente; a data de emissão usa America/Sao_Paulo.

O documento não inventa assinaturas ou nomes de signatários: identifica a comissão organizadora e usa a validação pública do registro. O PDF é gerado no navegador com jsPDF e AutoTable. Código, total, atividades e URL vêm da API. O código não muda ao baixar novamente e o total precisa corresponder ao anexo.

`/certificados?codigo=...` funciona sem login, inclusive com sessão local expirada. Também aceita entrada manual do código e apresenta nome, edição, emissão, total e atividades. A consulta usa um cliente público, sem enviar tokens ou tentar renovar sessão. Código inválido, não encontrado e indisponibilidade têm estados distintos; não exibem um resultado válido anterior. A página permite baixar o mesmo documento.

## Verificação e publicação

Executar `npm run verify`. Os testes verificam o contrato público/autenticado, consistência total/anexo/código e paginação de listas longas. Conferir a interface em 320 e 1280 px, código e QR, download, erros/retry, fechamento por Escape e ausência de credenciais nas consultas públicas. Revisar as páginas do PDF renderizado, não apenas sua extração de texto.

O PR do app é separado do PR da API. Fazer merge da API antes de publicá-la; aplicar migração e publicar endpoints antes do app. Publicar a página de validação antes de habilitar novas emissões. Testes com dados sintéticos não comprovam contas reais nem configuração de produção. Não alterar ou remover arquivos, ignorados ou backups locais do usuário.

## Modelo ilustrativo preservado

Validação local em 09/10/2026: 87 testes passaram, TypeScript aprovado e exportação web concluída. Navegador com API sintética cobriu 320/1280 px, acesso público sem token, código inválido/desconhecido, indisponibilidade, emissão bloqueada por duração pendente, nova tentativa, download e Escape. PDF de teste de duas páginas renderizado e inspecionado; os QRs de ambas as páginas foram decodificados e coincidem com código/URL. Teste adicional cobriu anexo extenso com paginação. Esses resultados não comprovam dados reais, CI remota, migração nem liberação de produção.

`scripts/certificates/create_certificate_model.py` continua disponível para gerar o modelo local em PDF, SVG e HTML com dados fictícios. Dependências em `scripts/certificates/requirements.txt`. Esse script não consulta o banco nem emite certificados reais; o fluxo web é independente e usa os dados persistidos pela API.
