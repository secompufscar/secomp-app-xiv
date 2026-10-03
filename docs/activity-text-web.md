# Edição de atividades na web

Administradores podem abrir uma atividade pela lista ou pelo cronograma e clicar em **Editar atividade**. O formulário permite editar título, nome, detalhes, horário, local, link do local e número de vagas, escolher uma única opção **Apresentadora** ou **Apresentador** e selecionar ou substituir a foto. A escolha também altera o rótulo exibido nos detalhes públicos.

Os nomes são obrigatórios e aceitam 255 caracteres, com espaços das extremidades removidos. Os detalhes são opcionais, aceitam várias linhas e até **1.000 caracteres**, com contador. A foto aceita JPG, PNG, WebP ou GIF até 8 MB, mostra uma prévia e é enviada somente ao salvar. **Desfazer seleção da foto** e **Cancelar** descartam a seleção local.

O horário usa HH:mm, mantém a data da atividade e segue a representação existente da API, com horário do evento nos componentes UTC. Se não for alterado, a requisição não envia `data`. O local aceita até 255 caracteres; o link opcional aceita HTTP/HTTPS até 2.048 caracteres. O botão **Ver no mapa** abre o link salvo, ou a busca por UFSCar e local quando não há link.

As vagas aceitam inteiro de 0 a 2147483647. Se não forem alteradas, a requisição não envia `vagas`, preservando inclusive capacidade indefinida. Zero não significa capacidade ilimitada: novas inscrições vão para a espera. A fila é calculada automaticamente na inscrição quando a capacidade está preenchida. Editar a capacidade não promove a fila nem cancela inscrições existentes; a contagem é consultada no servidor ao carregar os detalhes, sem atualização ao vivo.

## Permissões e persistência

- O botão e o formulário aparecem somente quando `Platform.OS === "web"` e `user.tipo === "ADMIN"`. A API exige autenticação e papel administrativo nas escritas.
- `PUT /api/v1/activities/:id` recebe `nome`, `palestranteNome`, `palestranteTitulo`, `detalhes`, `local`, `localLink` e, quando alterados, `data` e `vagas`. A seleção usa `APRESENTADORA` ou `APRESENTADOR`.
- A foto usa os endpoints existentes `POST /activityImages` e `PUT /activityImages/:id`, com multipart e `typeOfImage=palestrante`. Uma foto cadastrada é substituída pelo mesmo registro.
- Categoria, pontos, edição e inscrições não são enviados pelo formulário.
- Durante o envio, campos e ações ficam desabilitados. Erros preservam os valores. Se a foto for salva e a edição falhar, o formulário informa esse resultado e permite tentar novamente sem repetir o upload concluído.
- Os detalhes atualizam os dados após salvar; as listas recarregam ao recuperar o foco.

## Publicação e validação

Publicar primeiro a API com a migração `20261003180000_activity_speaker_title`, que acrescenta seleção e link e amplia `detalhes` para `VARCHAR(1000)`, preservando dados. Depois integrar o PR do app na `main`, aguardar o deploy automático GitHub → Vercel e conferir `https://secomp-app-xiv.vercel.app`.

Validar TypeScript/exportação web, testes de contratos e falhas da API, navegador com dados fictícios e ensaio da migração com backup restaurado em banco isolado. Uploads reais de produção não são necessários para esses testes.
