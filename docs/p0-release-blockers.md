# Bloqueadores P0 da versão 1.1.0

## Correções incluídas

- A tela de atividade usa um resumo agregado e não solicita a lista nominal administrativa.
- A distinção entre inscrição e atividade salva vem de `Category.requiresEnrollment`; ícones e agrupamentos usam `Category.slug`, sem IDs mágicos.
- A confirmação da inscrição no evento só aparece depois de resposta bem sucedida da API.
- Access e refresh tokens usam Expo SecureStore em Android e iOS. A primeira execução migra o access token legado; novos logins recebem access token curto e refresh token rotativo. A versão web continua em AsyncStorage.
- Todas as requisições informam plataforma, versão e build. Uma política marcada como `force` mostra uma tela de atualização bloqueante.
- No Android, o botão da tela bloqueante tenta iniciar uma atualização imediata pela Google Play usando Play Core 2.1.0. Quando a instalação não veio da Play Store, não há atualização elegível ou o módulo nativo falha, o aplicativo abre a URL da loja informada pela API.
- Expo Updates, runtime por versão, canais de preview e produção e novos números de build foram configurados.
- O SDK Expo 52 foi alinhado, e `react-native-gesture-handler` e `expo-font` passaram a ser dependências diretas.
- Axios foi atualizado para 1.20.0 e Validator para 13.15.35. Overrides corrigidos são usados para `shell-quote`, `@xmldom/xmldom`, PostCSS e `ws`.
- A política de privacidade descreve os dados e fornecedores usados pelo projeto e remove conteúdo externo indevido. O `postbuild:web` copia o documento para `dist/politica-privacidade.html`, para que ele seja publicado junto do site.

## Dependência da API

Esta versão depende dos contratos:

- `GET /api/v1/app/version`;
- `GET /api/v1/userAtActivities/activity/:activityId/summary`;
- objeto `categoria` nas respostas de atividades, incluindo `requiresEnrollment`.
- `POST /api/v1/users/refresh` e `POST /api/v1/users/logout` para rotação e revogação da sessão.

## Publicação

1. Publique primeiro a API com `APP_VERSION_ENFORCEMENT_ENABLED=false`.
2. Valide builds nos perfis `preview` e depois `production`.
3. Teste a atualização imediata Android com uma instalação feita por um track de teste da Google Play e uma versão de código superior disponível no mesmo track. APKs instalados manualmente não exercitam esse fluxo da Play Store.
4. Publique a versão `1.1.0` (Android `versionCode` 2; iOS `buildNumber` 2).
5. Espere a aprovação e disponibilidade nas lojas.
6. Configure as URLs oficiais e a versão mínima na API.
7. Ative a exigência de versão na API.

Clientes antigos não enviam cabeçalhos de versão. Quando a exigência for ativada, eles receberão HTTP 426 e precisarão instalar a versão publicada pela loja. A ativação deve ocorrer somente após a loja disponibilizar essa versão.

Enquanto o aplicativo não estiver disponível na Play Store, a atualização imediata não pode ser exercitada e a exigência de versão deve permanecer desativada. O módulo nativo fica preparado para a publicação futura; fora da Play Store, o botão usa a URL de distribuição fornecida pela API.

## Validação local

Execute:

```powershell
npm ci
npx tsc --noEmit
npm run build:web
npx expo-modules-autolinking resolve --platform android
npx expo prebuild --platform android --no-install
npx expo config --type public
```

Confirme que `dist/politica-privacidade.html` existe após o build web. Teste também em dispositivo físico: migração da sessão, login e logout, inscrição no evento, inscrição e fila de atividade, salvar atividade sem inscrição, notificações, leitura de QR e atualização imediata a partir de um track de teste da Play Store.

O projeto Android gerado foi validado até a etapa de prebuild e o autolinking encontrou `PlayInAppUpdateModule`. A compilação Gradle local exige JDK e Android SDK, que não estão instalados nesta máquina; o build EAS de preview deve ser usado como validação nativa antes da publicação.

Depois das correções diretas, `npm audit --omit=dev` ainda informa um crítico e quatro altos agregados ao Expo 52. As causas são `tar` 6 na CLI do Expo e `image-size` 1 no Metro, usados na geração e empacotamento, sem caminho conhecido no aplicativo instalado. Forçar `tar` 7 impediu o prebuild e forçar `image-size` 2 impediu o bundle; ambos foram revertidos. A correção compatível exige migrar o SDK Expo e deve ser executada em uma branch própria, com validação nativa completa.

O Expo Doctor aprovou 16 de 18 verificações nesta máquina. Uma falha foi apenas de detecção: o Doctor não identificou a versão do npm, embora `npm --version` retorne 11.6.2. A pendência do projeto é o inventário do React Native Directory: `@react-native-material/core` e `clsx` aparecem como não mantidos, e outras dependências não possuem metadados no diretório. A substituição dessas bibliotecas deve ser planejada separadamente e validada tela a tela.
