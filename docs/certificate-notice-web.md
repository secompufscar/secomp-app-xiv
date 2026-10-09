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

A emissão efetiva exige integrar o modelo à regra de carga horária, à validação de credenciamento/presença no servidor e ao download. A emissão individual ainda não existe nesta etapa.

## Regras definidas para a emissão — 09/10/2026

O usuário definiu o **credenciamento da edição como comprovação da doação**. A futura emissão deverá exigir presença confirmada na atividade de credenciamento da mesma edição do certificado. Ausência desse credenciamento impede a emissão, mesmo que existam presenças em palestras ou outras atividades. Inscrição prévia, lista de espera, presença em outra atividade ou credenciamento de uma edição anterior não comprovam a doação dessa edição. Credenciamento legado com presença confirmada e horário desconhecido continua comprovando a doação; o instante não altera essa regra.

A carga horária deverá somar as durações das atividades da edição com presença confirmada, contando cada atividade uma vez e excluindo o próprio credenciamento. O certificado terá uma página principal com o total e um anexo com nomes, datas, horários de início e duração de cada atividade. O horário do check-in não é a duração da atividade.

O schema atual da API contém início (`data`), mas não duração nem horário de término. A fonte das durações ainda precisa ser definida; não inferir horas por pontos, pelo check-in ou pelo horário da próxima atividade. Essas regras estão documentadas para a implementação, **ainda não há validação de elegibilidade ou emissão pela API/app**.

## Modelo visual de duas páginas

O gerador local [create_certificate_model.py](../scripts/certificates/create_certificate_model.py) constrói PDF A4 horizontal, SVGs de ambas as páginas e uma prévia HTML imprimível. Inclui as logos da SECOMP, do Departamento de Computação e da UFSCar. As duas logos institucionais compartilham alinhamento e espaçamento no cabeçalho das duas páginas; os arquivos originais conservam transparência e proporção. A segunda página lista atividades e calcula o total em minutos; a primeira usa esse mesmo total. Os nomes, presenças e durações são ilustrativos, marcados como modelo sem validade. Assinaturas e QR de validação continuam reservados.

Após instalar as dependências do app (fontes) e Python, executar:

```sh
python -m pip install -r scripts/certificates/requirements.txt
python scripts/certificates/create_certificate_model.py --output-dir certificate-model-output
```

O script verifica duas páginas e os textos esperados do PDF. Os arquivos gerados ficam fora do controle de versão. A prévia permite editar nome, data e responsáveis; o total de exemplo é somente leitura para manter a soma do anexo coerente. O gerador não consulta o banco, não habilita o botão do app e não emite certificados reais.

Validação do modelo em 09/10/2026: PDF com duas páginas renderizadas e revisadas, cada uma com as três logos; arquivo transparente da UFSCar preservado, idêntico ao fornecido pelo usuário. Soma dos sete exemplos de duração igual a 750 minutos (12 horas e 30 minutos) nas duas páginas. No navegador, a prévia imprimiu exatamente duas páginas, atualizou o nome em ambas e manteve o total somente leitura, sem erros de execução. Nenhuma consulta ou alteração no banco.

## Verificação

Executar `npm run verify` e conferir a tela inicial em 320 e 1280 px, incluindo abrir/fechar o aviso, fechar por Escape e navegar para outra tela. Confirmar a indicação **Em breve**, a leitura completa do texto e a ausência de downloads ou chamadas de escrita ao abrir a janela. A validação com dados fictícios não comprova a elegibilidade de participantes no serviço online.

Em 08/10/2026, TypeScript, os 70 testes existentes e a exportação web passaram. A conferência local no navegador cobriu participante em 320×480 px, admin em 1280×900 px, visão do participante e indisponibilidade simulada do evento em 320×900 px. Foram verificados aviso, fechamento por botão e Escape, título/botão expostos na tela baixa e ausência de rolagem horizontal, downloads e escritas na API.
