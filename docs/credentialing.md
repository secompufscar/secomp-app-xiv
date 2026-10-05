# Credenciamento pelo cronograma e pelo menu Admin

Os dois caminhos abrem a mesma tela `QRCode` e registram presença pelo mesmo `POST /checkIn/:userId/:activityId`, autorizado pela API somente para admins. Pelo cronograma, o ID é o da atividade selecionada em **Ler Presença**.

O atalho **Admin → Credenciamento** consulta a edição atual, as atividades e as categorias a cada clique. Seleciona somente uma atividade vinculada ao `eventId` atual e à categoria de credenciamento (slug `credenciamento`/`credenciamento-*` ou nome `Credenciamento`). Não depende do nome da atividade, do ano do calendário nem de um ID fixo. Atividades históricas ou sem vínculo com a edição atual são descartadas.

Durante a consulta, o botão indica carregamento e impede cliques duplicados. Sair da tela antes da resposta impede abrir o leitor atrasadamente. Falhas preservam a sessão e permitem tentar novamente pelo botão. Sem edição atual ou sem atividade correspondente, o app mostra um aviso. Havendo mais de uma atividade de credenciamento na edição, orienta escolher a atividade pelo cronograma, sem selecionar uma arbitrariamente.

A visão do participante não oferece o menu administrativo nem o leitor. O QR e as regras de presença/pontos da API permanecem os mesmos. O código compartilhado corrige também o atalho nas futuras compilações Android/iOS; publicar na Vercel atualiza somente a versão web.

## Verificação

Executar `npm test`, TypeScript e exportação web. Verificar seleção por edição/categoria, atividades históricas, ausência/duplicidade, indisponibilidade temporária, clique repetido e resposta após sair da tela. Conferir no navegador que ambos os caminhos abrem `/QRCode?id=<mesmo ID>`, com API e conta fictícias e sem registrar presença real. Uma consulta pública pode confirmar o alvo atual, mas não substitui um teste de câmera e check-in com uma conta real.

Em 05/10/2026, passaram 38 testes, TypeScript e exportação web. O navegador com dados fictícios confirmou o mesmo leitor/ID pelos dois caminhos em 320 e 1280 px, além de falha 503 seguida de nova tentativa e avisos de edição ausente, atividade ausente e duplicidade. A sessão foi preservada e não houve escritas nem chamadas reais à API. A decodificação do QR foi simulada; câmera e presença reais não foram exercitadas.
