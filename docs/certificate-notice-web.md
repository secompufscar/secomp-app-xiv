# Certificados individuais na web

A tela Início disponibiliza **Gerar certificado** para participantes e administradores. Abrir o diálogo não emite nada. O comando dentro do diálogo solicita `POST /certificates/mine` para o usuário autenticado. Após sucesso, mostra nome, carga horária, código, link público e **Baixar PDF**. Ao repetir, a API devolve o mesmo registro. Fechar ou sair da tela descarta respostas tardias. Android/iOS continuam sem essa opção.

O credenciamento confirmado na edição 2026 comprova a doação. A carga horária soma apenas atividades certificáveis dessa edição com presença registrada, uma vez por atividade. Credenciamento, Feira da Comp, Camisetas, Coffee, Lual, abertura e encerramento ficam fora da soma e do anexo. Ausência de credenciamento, de atividades certificáveis ou de duração oficial impede emissão. O servidor decide a elegibilidade; o navegador não calcula horas a partir do histórico.

## Durações

Regras confirmadas pela organização em 10/10/2026: palestras de 60 minutos, inclusive as das 11h, sem contabilizar almoço; quatro minicursos de 180 minutos; workshop da Karina e Maratona M@U de 150 minutos cada; mesa-redonda de curricularização de 60 minutos. Mesa Monks tem 90 minutos pela regra anterior de atividades consecutivas no mesmo local. Feira da Comp, Camisetas, Coffee, Lual, abertura e encerramento não concedem horas. O plano por ID está versionado na API e sua aplicação é separada da migração e da habilitação da emissão.

O banco da API armazena minutos, fonte da duração e exclusão da certificação. A emissão global permanece bloqueada até `CERTIFICATES_ENABLED=true`; duração ausente numa atividade certificável presente continua bloqueando o certificado individual. Atividade explicitamente excluída não soma horas nem bloqueia por duração ausente. Contrato, migração e sequência de liberação estão em `secomp-server-xiv/docs/funcionalidades/certificados.md`.

## PDF e validação

O PDF A4 horizontal preserva as logos originais SECOMP, DC e UFSCar, fontes Inter/Poppins, identificação da XIV edição e paleta do modelo. A primeira página mostra nome, período, carga horária total, emissão, código, link e QR. O anexo lista nome, categoria, data/início e duração das atividades do snapshot. Listas extensas continuam em páginas adicionais, repetindo logos, identificação, código e QR, sem truncar atividades. Horários de atividade seguem os componentes UTC usados pelo cronograma existente; a data de emissão usa America/Sao_Paulo.

O documento não inventa assinaturas ou nomes de signatários: identifica a comissão organizadora e usa a validação pública do registro. O PDF é gerado no navegador com jsPDF e AutoTable. Código, total, atividades e URL vêm da API. O código não muda ao baixar novamente e o total precisa corresponder ao anexo.

O endereço impresso conserva o caminho configurado na URL da API, inclusive caminhos customizados; link e QR incluem o código completo. Revogação retorna HTTP 410 com mensagem própria, remove o resultado válido anterior e não oferece download. Uma reemissão administrativa recebe outro código; o participante recupera a versão ativa ao gerar novamente. A página pública não revela motivos de correção nem o código substituto. PDF antigo baixado permanece no dispositivo, mas seu código deixa de validar.

`/certificados?codigo=...` funciona sem login, inclusive com sessão local expirada. Também aceita entrada manual do código e apresenta nome, edição, emissão, total e atividades. A consulta usa um cliente público, sem enviar tokens ou tentar renovar sessão. Código inválido, não encontrado e indisponibilidade têm estados distintos; não exibem um resultado válido anterior. A página permite baixar o mesmo documento.

## Verificação e publicação

Executar `npm run verify`. Os testes verificam o contrato público/autenticado, consistência total/anexo/código e paginação de listas longas. Conferir a interface em 320 e 1280 px, código e QR, download, erros/retry, fechamento por Escape e ausência de credenciais nas consultas públicas. Revisar as páginas do PDF renderizado, não apenas sua extração de texto.

Os testes versionados agora extraem o texto e as anotações do PDF para conferir todas as 45 atividades exatamente uma vez, totais, paginação, código e link customizado. Renderizam duas páginas e decodificam seus QRs com um leitor independente. Dependências de inspeção/renderização são somente de desenvolvimento. `CERTIFICATE_TEST_OUTPUT` opcional grava PNGs para inspeção.

Após `npm run build:web`, executar `npx playwright install chromium` e `npm run test:certificates:e2e`. O CI instala Chromium, executa o fluxo sintético em 320/1280 px e guarda evidências por sete dias. Todas as requisições externas são interceptadas ou bloqueadas; nenhum participante real é usado. O teste cobre estado válido, 404, 410, indisponibilidade, bloqueio de emissão, nova tentativa, download e Escape. Para usar Edge localmente, configurar `CERTIFICATE_BROWSER_CHANNEL=msedge`.

O PR do app é separado do PR da API. Fazer merge da API antes de publicá-la; aplicar migração e publicar endpoints antes do app. Publicar a página de validação antes de habilitar novas emissões. Testes com dados sintéticos não comprovam contas reais nem configuração de produção. Não alterar ou remover arquivos, ignorados ou backups locais do usuário.

## Homologação e publicação em 10/10/2026

O [PR #30](https://github.com/secompufscar/secomp-app-xiv/pull/30) foi integrado após a API do [PR #36](https://github.com/secompufscar/secomp-server-xiv/pull/36) ter sido integrada e publicada. Vercel confirmou sucesso no merge `8792266cfbcebd59fb26a29e7a04f8f18bc9ee3d`; CI desse commit aprovada. Railway confirmou 19 migrações concluídas e o plano de 37 atividades aplicado, com 28 incluídas e 9 excluídas.

Conta real sorteada a pedido da organização entre 59 elegíveis foi ensaiada primeiro numa cópia privada do backup. Depois, houve uma emissão controlada em produção, ainda com emissão geral desativada. Nenhuma senha, papel ou presença foi alterada. Recuperação HTTP autenticada usou credencial de 60 segundos gerada pelo servidor apenas em memória: não comprova login interativo com senha nem renovação de sessão no navegador.

Página pública e API reais, sem mocks, conferidas com Playwright em 320/1280 px: consulta sem credenciais, 11 atividades e 780 minutos consistentes, três logos carregadas, sem overflow horizontal ou erro de página, códigos malformados/desconhecidos rejeitados e resultado válido anterior removido. PDF baixado da página publicado contém três páginas, todas inspecionadas visualmente e com QR/link conferidos; atividades aparecem exatamente uma vez e somam 13 horas. Dados pessoais e artefatos privados não entram em repositório ou CI.

Essa homologação representa uma conta controlada, não todos os participantes. Revogação/reemissão e falhas de transação foram testadas no banco isolado, sem invalidar um certificado real para testar 410. Dependências antigas com alertas de auditoria e capacidade de produção sob carga permanecem riscos fora da comprovação deste teste. A [evidência operacional da API](https://github.com/secompufscar/secomp-server-xiv/blob/main/docs/historico/auditorias/certificate-release-2026-10-10.md) registra também backup, diferenças de MySQL/fuso e estado da habilitação geral.

## Modelo ilustrativo preservado

Revisão técnica em 10/10/2026: 89 testes do app e TypeScript aprovados, exportação web concluída e fluxo E2E versionado aprovado em 320/1280 px, incluindo revogação HTTP 410. As duas páginas renderizadas com URL customizada foram inspecionadas e seus QRs decodificados. O lockfile preservou todas as versões existentes; foram adicionadas apenas dependências de desenvolvimento para os testes. A auditoria npm continua apontando alertas em dependências existentes, fora do escopo desta mudança; não foi executado `npm audit fix`.

Validação local em 09/10/2026: 87 testes passaram, TypeScript aprovado e exportação web concluída. Navegador com API sintética cobriu 320/1280 px, acesso público sem token, código inválido/desconhecido, indisponibilidade, emissão bloqueada por duração pendente, nova tentativa, download e Escape. PDF de teste de duas páginas renderizado e inspecionado; os QRs de ambas as páginas foram decodificados e coincidem com código/URL. Teste adicional cobriu anexo extenso com paginação. Esses resultados não comprovam dados reais, CI remota, migração nem liberação de produção.

`scripts/certificates/create_certificate_model.py` continua disponível para gerar o modelo local em PDF, SVG e HTML com dados fictícios. Dependências em `scripts/certificates/requirements.txt`. Esse script não consulta o banco nem emite certificados reais; o fluxo web é independente e usa os dados persistidos pela API.
