# Categorias de atividades na web

Revisão: 04/10/2026.

Na web, a aba **Outros** reúne as atividades das categorias Workshop, LualDAComp, Sociocultural, Credenciamento, Coffee e Outros. A comparação ignora maiúsculas/minúsculas e acentos; todas as categorias correspondentes são consideradas, independentemente da ordem retornada pela API. As atividades continuam ordenadas por data. Palestras, Minicursos e Competições mantêm suas próprias abas.

Uma atividade cadastrada como Workshop e mesas cadastradas como Outros podem aparecer juntas nessa aba. A correção não altera os cadastros, as datas, as inscrições, as vagas nem as regras de inscrição. O cronograma mantém o filtro por dia.

Esta publicação é exclusiva da web: o caminho nativo do filtro foi preservado e não há atualização do APK ou da API. Durante o evento, o APK existente continua com sua limitação na aba Outros; o cronograma permite encontrar as atividades por dia. Trocar uma palestra para Workshop ainda pode torná-la invisível nas abas de categorias desse APK. A categoria de Karina Queiroz não foi alterada por esta correção.

Validação: testes do filtro real do componente com Workshop e duas mesas, ordem invertida das categorias, caixa/acentos, grupo parcial, demais abas e preservação do comportamento nativo; TypeScript e exportação web. A validação no navegador usa respostas locais e sessão fictícia, sem escritas em produção. Build/deploy e recuperação de sessão real são verificações distintas.
