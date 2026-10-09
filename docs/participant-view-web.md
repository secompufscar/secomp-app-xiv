# Visão do participante na web

Admins da versão web têm o botão **Visão do participante** no topo das telas autenticadas. Ao entrar na prévia, a navegação volta ao Início, o menu **Admin** dá lugar ao **Perfil** e as ferramentas administrativas ficam ocultas. **Voltar à visão administrativa** fica no topo rolável da página (voltar ao início da rolagem para acessá-lo) e também retorna ao Início.

A prévia usa os dados da própria conta: perfil, credencial, inscrições e posição na fila. Não representa outro participante e não muda o papel `ADMIN`, as credenciais ou as permissões da API. Inscrever-se, salvar/remover atividades, cancelar a inscrição no evento e editar o perfil ficam desativados na prévia. O aviso explica essa restrição. **Sair** continua encerrando a sessão de verdade.

Os detalhes seguem a regra dos participantes: vagas e lista de espera aparecem somente nas categorias com `requiresEnrollment`. Ao voltar à visão administrativa, o admin web vê novamente os totais de todas as categorias e pode editar as atividades.

O modo fica somente em memória. Recarregar a página, entrar novamente, sair ou trocar a identidade/papel da conta restaura a visão normal. Atualizar o perfil da mesma conta mantém a prévia. A versão Android/iOS não oferece essa alternância.

## Implementação e verificação

O estado está em `src/hooks/AuthContext.tsx`; o botão em `src/components/app/participantViewToggle.tsx`, incluído na área de rolagem dos cabeçalhos e de `AppLayout`; a navegação em `src/routes/index.tsx`, `stack.routes.tsx` e `tab.routes.tsx`. As telas de início, perfil e detalhes bloqueiam suas ações de escrita na prévia. A API continua responsável por autorizar cada requisição.

`npm test` cobre preservação da sessão/papel, restrição à web/admin, saída e mudança de conta, atualização de perfil e detalhes com/sem inscrição obrigatória. Verificar também TypeScript, exportação web e navegação no navegador em 320 e 1280 px, incluindo entrar pela tela de detalhes, voltar à administração e recarregar. Testes de navegador usam dados fictícios e não comprovam inscrições ou permissões de uma conta real no serviço online.

Em 05/10/2026, a suíte passou com 29 testes, TypeScript e exportação web. O navegador confirmou admin em 320/1280 px e participante em 320 px: alternância pelos detalhes, perfil com edição/cancelamento desativados, retorno ao Início e restauração da visão administrativa após recarregar. O botão de retorno ficou inteiramente exposto, sem sobreposição ou rolagem horizontal. Não houve escritas nem chamadas reais à API; a dependência do leitor QR foi simulada.
