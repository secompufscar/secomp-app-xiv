# Bloqueadores P0 da versão 1.1.0

## Correções incluídas

- A tela de atividade usa um resumo agregado e não solicita a lista nominal administrativa.
- A distinção entre inscrição e atividade salva vem de `Category.requiresEnrollment`; IDs de categoria não controlam mais esse fluxo.
- A confirmação da inscrição no evento só aparece depois de resposta bem sucedida da API.
- O token de sessão usa Expo SecureStore em Android e iOS. A primeira execução migra o token legado e preserva a sessão; a versão web continua em AsyncStorage.
- Todas as requisições informam plataforma, versão e build. Uma política marcada como `force` mostra uma tela de atualização bloqueante.
- Expo Updates, runtime por versão, canais de preview e produção e novos números de build foram configurados.
- O SDK Expo 52 foi alinhado, e `react-native-gesture-handler` e `expo-font` passaram a ser dependências diretas.
- A política de privacidade descreve os dados e fornecedores usados pelo projeto e remove conteúdo externo indevido.

## Dependência da API

Esta versão depende dos contratos:

- `GET /api/v1/app/version`;
- `GET /api/v1/userAtActivities/activity/:activityId/summary`;
- objeto `categoria` nas respostas de atividades, incluindo `requiresEnrollment`.

## Publicação

1. Publique primeiro a API com `APP_VERSION_ENFORCEMENT_ENABLED=false`.
2. Valide builds nos perfis `preview` e depois `production`.
3. Publique a versão `1.1.0` (Android `versionCode` 2; iOS `buildNumber` 2).
4. Espere a aprovação e disponibilidade nas lojas.
5. Configure as URLs oficiais e a versão mínima na API.
6. Ative a exigência de versão na API.

Clientes antigos não enviam cabeçalhos de versão. Quando a exigência for ativada, eles receberão HTTP 426 e precisarão instalar a versão publicada pela loja. A ativação deve ocorrer somente após a loja disponibilizar essa versão.

## Validação local

Execute:

```powershell
npm ci
npx tsc --noEmit
npm run build:web
npx expo config --type public
```

Teste também em dispositivo físico: migração da sessão, login e logout, inscrição no evento, inscrição e fila de atividade, salvar atividade sem inscrição, notificações, leitura de QR e abertura da URL de atualização.

O Expo Doctor aprovou 17 de 18 verificações. A pendência restante é o inventário do React Native Directory: `@react-native-material/core` e `clsx` aparecem como não mantidos, e outras dependências não possuem metadados no diretório. A substituição dessas bibliotecas deve ser planejada separadamente e validada tela a tela.
