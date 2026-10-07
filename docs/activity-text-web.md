# Edição de atividades na web

Última revisão documental: 07/10/2026. Editor publicado originalmente no app `cdee8cde` (PR #11), com API `633e8c8` (PR #28); a exibição administrativa de vagas foi validada em 04/10. Limite, recorte e mínimo de vagas conferidos no bundle daquela publicação; fluxos de escrita verificados somente com dados fictícios. [Evidências da publicação inicial](https://github.com/secompufscar/secomp-server-xiv/blob/main/docs/historico/auditorias/production-deployment-2026-10-03.md). A [rodada de 06/10](participant-directory-web.md#validação-e-publicação) valida a nova lista de participantes e não repete os testes de escrita do editor.

Administradores podem abrir uma atividade pela lista ou pelo cronograma e clicar em **Editar atividade**. O formulário permite editar título, nome, detalhes, horário, local, link do local e número de vagas, escolher uma única opção **Apresentadora** ou **Apresentador** e selecionar ou substituir a foto. A escolha também altera o rótulo exibido nos detalhes públicos.

Os nomes são obrigatórios e aceitam 255 caracteres, com espaços das extremidades removidos. Os detalhes são opcionais, aceitam várias linhas e até **1.500 caracteres**, com contador. A foto aceita JPG, PNG, WebP ou GIF até 8 MB, mostra uma prévia e é enviada somente ao salvar. **Desfazer seleção da foto** e **Cancelar** descartam a seleção local.

O formulário usa margens e preenchimento menores em telas estreitas. Até 419 px, as opções de apresentação ficam uma abaixo da outra; a partir de 420 px, ficam lado a lado. O conteúdo rola dentro do diálogo, mantendo o título e os botões Cancelar/Salvar visíveis. O contador, avisos e explicações acompanham os campos sem exigir rolagem horizontal.

Selecionar ou trocar a foto abre **Ajustar foto**, com prévia circular, arraste por mouse/toque, zoom de 100% a 400% por controle deslizante ou botões e movimentação pelas setas do teclado. O enquadramento impede deslocar o recorte para fora da imagem; transparência existente é preservada. **Usar foto** gera um PNG quadrado de 512×512; **Cancelar** mantém a seleção anterior e usa a identificação acessível **Cancelar recorte**. A prévia circular representa a exibição pública, e o upload continua acontecendo somente em Salvar.

O horário usa HH:mm, mantém a data da atividade e segue a representação existente da API, com horário do evento nos componentes UTC. Se não for alterado, a requisição não envia `data`. O local aceita até 255 caracteres; o link opcional aceita HTTP/HTTPS até 2.048 caracteres. O botão **Ver no mapa** abre o link salvo, ou a busca por UFSCar e local quando não há link.

As vagas aceitam inteiro de 0 a 2147483647. Se não forem alteradas, a requisição não envia `vagas`, preservando inclusive capacidade indefinida. Zero não significa capacidade ilimitada: novas inscrições vão para a espera. Ao reduzir a capacidade, os últimos inscritos confirmados sem presença passam para a fila sem exclusão. Ao aumentar, a fila preenche as vagas em ordem de inscrição, com desempate por ID. O vínculo e a data original da inscrição são preservados, permitindo reverter uma redução aumentando as vagas. Pessoas com presença registrada permanecem confirmadas; reduzir abaixo desse total é recusado. Capacidade e fila são atualizadas na mesma transação. A contagem é consultada ao carregar os detalhes e após o admin editar as vagas, sem atualização ao vivo. O participante vê o total da fila e sua posição quando está em espera; outros participantes não têm seus nomes expostos no resumo.

## Permissões e persistência

Na tela de detalhes, admins da versão web veem **Vagas** e **Lista de Espera** em todas as categorias, inclusive atividades sem inscrição obrigatória. A consulta usa somente o resumo agregado autenticado. Para participantes e para a versão mobile, a exibição continua seguindo `requiresEnrollment` da categoria. Essa visibilidade administrativa não muda a ação de salvar/inscrever-se, nem a política de inscrições. Durante o carregamento ou após falha, os totais desconhecidos aparecem como `—`, preservando a capacidade cadastrada; uma falha oferece **Tentar carregar totais novamente**, sem apresentar zero como se fosse um total confirmado.

Antes de salvar, o formulário consulta `presentCount` do resumo e exibe o mínimo permitido abaixo das vagas. Um valor menor destaca o aviso e desabilita Salvar. Se o total não puder ser conferido, há nova tentativa e somente a alteração de vagas fica bloqueada. A API reconfere o total durante a transação; um conflito atualiza a indicação no formulário.

- O botão e o formulário aparecem somente quando `Platform.OS === "web"`, `user.tipo === "ADMIN"` e a [visão do participante](participant-view-web.md) está desativada. Na prévia, os totais seguem `requiresEnrollment` e as ações de inscrição ficam desativadas. A API exige autenticação e papel administrativo nas escritas.
- `PUT /api/v1/activities/:id` recebe `nome`, `palestranteNome`, `palestranteTitulo`, `detalhes`, `local`, `localLink` e, quando alterados, `data` e `vagas`. A seleção usa `APRESENTADORA` ou `APRESENTADOR`.
- A foto usa os endpoints existentes `POST /activityImages` e `PUT /activityImages/:id`, com multipart e `typeOfImage=palestrante`. Uma foto cadastrada é substituída pelo mesmo registro.
- Categoria, pontos, edição e inscrições não são enviados pelo formulário.
- Durante o envio, campos e ações ficam desabilitados. Erros preservam os valores. Se a foto for salva e a edição falhar, o formulário informa esse resultado e permite tentar novamente sem repetir o upload concluído.
- Os detalhes atualizam os dados após salvar; as listas recarregam ao recuperar o foco.

## Publicação e validação

Publicar primeiro a API com as migrações `20261003180000_activity_speaker_title` (seleção, link e limite anterior) e `20261003194000_activity_description_1500` (limite atual `VARCHAR(1500)`), preservando dados. Depois integrar o PR do app na `main`, aguardar o deploy automático GitHub → Vercel e conferir `https://secomp-app-xiv.vercel.app`.

Validar TypeScript/exportação web, testes de contratos e falhas da API, navegador com dados fictícios e ensaio da migração com backup restaurado em banco isolado. Uploads reais de produção não são necessários para esses testes.

Em 04/10/2026, a exibição administrativa de vagas foi validada com seis testes da tela real, TypeScript e exportação web; a suíte do app passou com 18 testes. No navegador, com API simulada e conta fictícia, foram verificados admin em 320/1280 px, participantes com e sem inscrição obrigatória e erro 503 seguido de nova tentativa. Os totais apareceram conforme o papel, sem transbordamento horizontal ou chamadas reais à API. A verificação não utiliza a sessão de uma conta real e simula a dependência do leitor QR.
