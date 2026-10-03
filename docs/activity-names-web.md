# Edição rápida dos nomes de atividades na web

Na versão web, administradores podem abrir uma atividade pela lista ou pelo cronograma e clicar em **Editar título e apresentador**, logo abaixo do título. O formulário começa com os nomes atuais; **Salvar** atualiza a atividade na própria tela e **Cancelar** descarta a edição.

O título corresponde ao campo `nome` da atividade. O nome do apresentador corresponde a `palestranteNome`. Ambos são obrigatórios, têm limite de 255 caracteres e são enviados sem espaços nas extremidades.

## Permissões e persistência

- O botão e o formulário são renderizados somente quando `Platform.OS === "web"` e `user.tipo === "ADMIN"`.
- O formulário usa o `PUT /api/v1/activities/:id` existente, enviando apenas `nome` e `palestranteNome`. Data, local, categoria, vagas, pontos, descrição, imagens e inscrições não são enviados pelo formulário.
- A API verifica autenticação e o papel administrativo no servidor. Ocultar o botão não substitui essa verificação.
- Durante o envio, os campos e botões ficam desabilitados. Em caso de erro, os valores digitados são preservados para uma nova tentativa.
- A tela usa a atividade retornada pela API após salvar. As listas recarregam os dados quando recuperam o foco.

## Validação em 03/10/2026

- `npm run verify`: TypeScript e exportação web concluídos.
- `tests/admin-write-contracts.test.cjs` da API: 9 testes passaram, incluindo bloqueio de participante e atualização parcial.
- Navegador com API local e dados fictícios: campos preenchidos, título vazio recusado, cancelamento sem escrita, erro de servidor sem perder edição, nova tentativa bem-sucedida, espaços removidos e nomes atualizados na tela e na lista.
- A API local conferiu que a requisição contém somente os dois campos; horário, vagas, descrição, categoria, local e pontos permaneceram iguais.
- Sessão fictícia de participante: botão de edição ausente.

## Publicação

O GitHub registra status `Vercel` bem-sucedido para a `main` anterior a esta alteração. O fluxo de publicação é PR para `main`, validação de CI e preview, integração e conferência do status Vercel do commit integrado. Um preview bem-sucedido não comprova publicação do domínio de produção; conferir também o conteúdo servido por `https://secomp-app-xiv.vercel.app`.

Esta mudança usa o contrato existente da API e não requer migração de banco nem publicação nas lojas.
