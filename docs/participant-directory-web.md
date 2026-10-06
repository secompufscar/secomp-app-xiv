# Todos os participantes

**Admin → Todos os participantes** lista todas as contas cadastradas, mesmo sem inscrição na edição ou vínculo de credenciamento. A busca aceita nome ou e-mail; filtros **Todos**, **Credenciados** e **Não credenciados** podem ser combinados com ela. A lista tem páginas de 50 pessoas, ordenadas por nome, com desempate por ID.

O selo verde **Credenciado** exige presença no credenciamento da edição atual. O vermelho **Não credenciado** inclui ausência de vínculo ou vínculo sem presença; inscrição e credenciamento antigo não equivalem a presença atual. Os textos acompanham as cores. O instante do credenciamento aparece no horário de São Paulo. Registros antigos sem data confiável mostram **Data do credenciamento não disponível**, mantendo o status verde.

**Ver atividades com presença** funciona para qualquer pessoa, incluindo quem não foi credenciado, e usa o [histórico de presenças](user-attendance-web.md). A lista geral não oferece exclusão da conta. Remover o vínculo pelo fluxo existente não retira a pessoa dessa lista; ao atualizar a consulta, ela aparece como não credenciada.

A consulta utiliza `GET /users/directory`, restrito a admins pela API. A interface e a rota são exclusivas da web e ficam indisponíveis na visão do participante. Erros de serviço ou de configuração do credenciamento mostram erro e nova tentativa, sem classificar todas as pessoas como não credenciadas. Respostas depois de sair/trocar os filtros são descartadas; a consulta recarrega ao abrir a tela e pelo botão de busca. Não há atualização ao vivo.

O horário programado da atividade segue a representação existente do cronograma (componentes UTC usados como horário do evento); `credentialedAt` é um instante real, convertido para São Paulo. São datas com finalidades distintas.

## Validação e publicação

Em 06/10/2026, passaram os 62 testes do app, TypeScript e exportação web. Navegador com API fictícia em 320×640 e 1280×900 confirmou busca por nome/e-mail, filtros, paginação, selos/data, rolagem da página inteira, consulta de presenças sem credenciamento, erro com nova tentativa, histórico vazio, resposta atrasada e restrição na visão do participante. Não houve chamadas reais à API durante essa validação visual.

Publicar após a API da lista geral e a migração `20261006090000_attendance_timestamp`, implementadas no [PR #33 da API](https://github.com/secompufscar/secomp-server-xiv/pull/33). Horários antigos só são recuperados quando confiáveis; a lista continua incluindo contas sem essa informação.
