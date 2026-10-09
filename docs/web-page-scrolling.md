# Rolagem de cabeçalhos na web

Na versão web, os cabeçalhos acompanham o conteúdo da página. A faixa de visão administrativa/participante, títulos, botão Voltar, filtros e totais ficam no início da área de rolagem, liberando a altura da tela ao avançar pela lista ou formulário.

As listas usam `ListHeaderComponent`; cronograma, lista por categoria e atividades salvas recebem o cabeçalho da tela. Estados de carregamento, erro e lista vazia também conservam esse cabeçalho. Formulários, perfis e detalhes incluem o cabeçalho em seu `ScrollView`; a imagem dos detalhes acompanha a rolagem. A lista de sorteio inclui seleção, filtros e totais no cabeçalho correspondente a cada etapa. A seleção de atividade dentro do formulário de notificação conserva sua área interna limitada.

O ajuste é condicionado à plataforma web. A publicação na Vercel não muda os binários Android/iOS, e o posicionamento anterior do mobile foi preservado no código compartilhado. O seletor de visão fica no topo rolável e continua disponível ao voltar ao início da página. A navegação inferior permanece acessível; os botões dos diálogos permanecem disponíveis enquanto seu texto pode rolar.

Verificar em 320 e 1280 px: rolar listas longas e formulários, confirmar que o topo deixa a área visível, voltar ao topo, usar filtros/paginação, abrir detalhes e verificar os botões de confirmação nominal. Usar contas e API fictícias para evitar alterações em participantes reais.

Em 09/10/2026, o navegador Chromium confirmou a rolagem dos cabeçalhos em 19 telas, nas duas larguras, além de início, detalhes, perfil na visão do participante e a etapa de participantes do sorteio. Os diálogos mantiveram os botões acessíveis, sem rolagem horizontal da página; alternar a visão continuou retornando ao início e retirando/restaurando o menu Admin. Passaram TypeScript, 75 testes e exportação web. As respostas da API e as contas foram fictícias; câmera, presença real e Safari/iOS não foram exercitados.
