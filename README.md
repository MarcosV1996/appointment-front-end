

## Manual de execução

- Clonar o repositório com `git clone`
- Fazer checkout no branch `develop` que contém as modificações mais recentes
- Abrir o projeto no editor Visual Studio Code (VS Code)
- Abrir um terminal pelo VSCode ou qualquer terminal do seu Sistema Operacional apontando para o diretório raiz do projeto
- Instalar as dependências contidas no `package.json`
  - Comando:  `npm i`
- (Opcional) Instalar o JSON Server globalmente disponível em `https://www.npmjs.com/package/json-server`
  - Comando: `npm i -g json-server`
  - É opcional porque a dependência já vem cadastrada no arquivo `package.json` para instalação logical na pasta `node_modules`
- Executar a API Fake (JSON Server) via um dos seguintes comandos:
  - Execução via script registrado no `package.json`: `npm run json:server:routes`
  - Ou via Execução explícita: `json-server --watch db.json --routes routes.json`
- O comando para execução do JSON Server deve ser aplicado no diretório raiz do projeto, ou seja, que contém o arquivo `db.json` e `routes.json`.
  - Por padrão, a aplicação JSON Server executa no endereço `localhost:3000`
- Abrir um novo terminal pelo VSCode e então executar o projeto Angular
  - Comando: `ng s -o`