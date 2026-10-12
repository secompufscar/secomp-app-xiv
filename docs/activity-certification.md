# Certificados no CRUD de atividades

O ADMIN informa duração oficial em minutos, sua fonte e uma escolha explícita de certificabilidade ao criar uma atividade. A mesma configuração pode ser alterada tanto no formulário administrativo quanto no editor dos detalhes. Atividades obrigatoriamente excluídas exibem a escolha Não bloqueada, mas continuam tendo duração.

O painel e os detalhes mostram duração e estado: Certificável, Não certificável ou Certificação pendente. Cadastros históricos sem configuração não recebem uma duração presumida. Editar somente outros campos conserva a configuração anterior; alterar a certificação exige duração inteira válida e fonte oficial.

Mudanças são usadas em novas emissões e reemissões. PDFs existentes continuam usando seus snapshots e o gerador V1. A exclusão apresenta a mensagem retornada pela API e não remove fotos antecipadamente; presença ou referência histórica bloqueiam a operação.

A API deve ser integrada e publicada antes deste app. Testes de interface usam atividades e autenticação sintéticas com requisições interceptadas, sem gravar dados reais.
