# Presenças de um usuário na web

Última revisão: 09/10/2026. Consulta publicada na web; [lista geral e validação atual](participant-directory-web.md).

Admins podem abrir **Participantes** nos detalhes de qualquer atividade ou **Admin → Todos os participantes**. Em cada pessoa, **Ver atividades com presença** abre uma consulta com nome da atividade, horário programado e local. A lista inclui todas as edições, da mais recente à mais antiga; o horário exibido é o da atividade, não o instante do check-in.

O acesso por **Todos os participantes** inclui contas sem credenciamento. [Busca, selos e data de credenciamento](participant-directory-web.md). O horário das atividades preserva os componentes de data usados pelo cronograma, sem aplicar outra conversão de fuso.

A consulta usa o `GET /userAtActivities/all-activities/:userId` existente, que permite acesso à própria conta ou a admins. Somente vínculos com `presente === true` entram na lista. Inscrições e lista de espera sem presença não contam como participação. Abrir o histórico não altera presença, pontos, inscrições ou conta.

O botão e a consulta estão disponíveis apenas na web com ferramentas administrativas ativas, ficando ocultos na visão do participante e no mobile. O diálogo pode ser fechado durante o carregamento, tem rolagem em telas pequenas e mantém **Fechar** acessível. Falha da consulta mostra erro e nova tentativa, sem apresentar um histórico vazio como resultado confirmado. Respostas após fechar ou trocar de pessoa são descartadas. A consulta é atualizada a cada abertura; não há atualização ao vivo.

## Validação

Em 05/10/2026, passaram os 56 testes do app, a verificação de TypeScript e a exportação web. No navegador em 320×640 e 1280×900, dados fictícios confirmaram lista longa com rolagem, título com quebra de linha, edição anterior, horário ausente, exclusão de inscrições/espera sem presença, erro 503 com nova tentativa, histórico vazio, resposta após trocar de pessoa e restrição na visão do participante. Nenhuma consulta ou escrita real à API foi feita nessa validação de interface.
