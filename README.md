# APP da SECOMP UFSCar

Aplicativo desenvolvido pela equipe de TI da SECOMP UFSCar especialmente para o evento.

Guias: [edição administrativa de atividades na web](docs/activity-text-web.md), [visão do participante para admins](docs/participant-view-web.md), [rotas e publicação na Vercel](docs/web-routing.md), [recuperação de sessão em falhas temporárias](docs/session-recovery.md) e [validação da versão mobile](docs/p0-release-blockers.md). O app web é publicado automaticamente pela Vercel após integração na `main`.

Ele é utilizado pelos participantes para realizar a inscrição no evento e em suas atividades, acompanhar novidades e acessar informações importantes. Para a organização, o aplicativo oferece ferramentas que facilitam o controle do evento, como o gerenciamento de atividades e a leitura de presença dos participantes.

<br>

## 📋 Requisitos

Antes de mais nada, certifique-se de ter os seguintes programas instalados:

[![git][git-logo]][git-url]
[![expo][expo-logo]][expo-url]
[![node][node-logo]][node-url]

<br>

## **🛠️ Tecnologias**

Tecnologias utilizadas no frontend do aplicativo: React Native, Expo, TypeScript, Tailwind(Nativewind).

![Skills](https://skills.syvixor.com/api/icons?i=reactnative,expo,ts,tailwind)

<br>

## ⚙️ Guia de Execução

Clone o repositório

```
git clone https://github.com/secompufscar/secomp-app-xiv.git
```

<br>

Acesse a pasta clonada

```
cd ./secomp-app-xiv
```

<br>

Instale as dependências

```
npm install
```

<br>

Execute o programa

```
npm start
```

<br>

## 💻 Rodar Localmente

Para rodar o aplicativo localmente, siga os passos adicionais abaixo:

1. **Configure o backend** conforme as instruções disponíveis no README do repositório correspondente
2. Ajuste `baseURL` em [src/services/api.ts](src/services/api.ts) para o endereço do backend local, incluindo `/api/v1` (exemplo: `http://seuip:3000/api/v1`).
3. Para a versão web, use `npm run web`. `npm run verify` confere TypeScript e gera a exportação web em `dist`.

<div align="center">
  <br/>
    <div>
      <sub>Copyright © 2024 - <a href="https://github.com/secompufscar">secompufscar</sub></a>
    </div>
</div>

[git-url]: https://git-scm.com/
[git-logo]: https://img.shields.io/badge/Git-f14e32?style=for-the-badge&logo=git&logoColor=white
[expo-url]: https://docs.expo.dev/
[expo-logo]: https://img.shields.io/badge/Expo-000000?style=for-the-badge&logo=expo&logoColor=white
[node-url]: https://nodejs.org/en
[node-logo]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white
[demo]: assets/images/demo.gif
