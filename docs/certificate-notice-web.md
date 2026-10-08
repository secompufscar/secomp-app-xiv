# Certificado na tela inicial da web

A tela **Início** da versão web exibe **Certificado de participação**, logo após **Minhas atividades**. O botão **Gerar certificado** tem a indicação **Em breve** e abre um aviso temporário com as orientações. Está disponível para participantes, admins e admins na visão do participante, inclusive após o término do evento. Android e iOS não exibem essa opção.

O aviso informa que a geração estará disponível em breve e explica:

> Para receber seu certificado, sua doação precisa estar registrada pela equipe da SECOMP.
>
> As horas certificadas correspondem às atividades com presença registrada.

Quem já doou e tem dúvidas sobre o registro é orientado a procurar a equipe da SECOMP. **Entendi** e a tecla **Escape** fecham a janela; sair da tela também descarta o aviso.

Em telas baixas, o título e o botão **Entendi** permanecem visíveis enquanto as orientações podem ser roladas. O cartão permite quebra de linha para manter texto e indicação **Em breve** dentro da tela.

## Limites desta etapa

Esta entrada é informativa: não emite nem baixa PDF, não solicita um certificado à API e não altera inscrição, credenciamento ou presença. A janela mostra uma orientação geral e não verifica se a conta já doou. Uma inscrição sem presença registrada não comprova horas para certificação.

A emissão efetiva exige uma implementação posterior com modelo de certificado, regra de carga horária, validação de doação/presença no servidor e download. Esses recursos ainda não existem nesta etapa.

## Verificação

Executar `npm run verify` e conferir a tela inicial em 320 e 1280 px, incluindo abrir/fechar o aviso, fechar por Escape e navegar para outra tela. Confirmar a indicação **Em breve**, a leitura completa do texto e a ausência de downloads ou chamadas de escrita ao abrir a janela. A validação com dados fictícios não comprova a elegibilidade de participantes no serviço online.

Em 08/10/2026, TypeScript, os 70 testes existentes e a exportação web passaram. A conferência local no navegador cobriu participante em 320×480 px, admin em 1280×900 px, visão do participante e indisponibilidade simulada do evento em 320×900 px. Foram verificados aviso, fechamento por botão e Escape, título/botão expostos na tela baixa e ausência de rolagem horizontal, downloads e escritas na API.
