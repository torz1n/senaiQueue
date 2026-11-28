# 🏓 SENAI Tênis de Mesa - Sistema de Gestão de Fila

Sistema web para gerenciar a fila de partidas nas mesas de tênis de mesa do SENAI. A fila é compartilhada entre vários celulares, com banco de dados em nuvem e arquitetura serverless.

🔗 **Online:** https://senai-queue.vercel.app

---

## ✨ Funcionalidades

* **Fila compartilhada:** a pessoa abre o link, digita o nome e entra na fila. A tela se atualiza sozinha a cada 5 segundos.
* **Sair da fila:** cada pessoa remove só o próprio nome.
* **Botão "Já joguei":** manda a pessoa para o fim da fila, e quem estava atrás sobe uma posição. Fica inativo quando ela já é a última (ou a única).
* **Reinício automático:** depois de **30 minutos sem atividade** (ninguém entrar, sair ou passar a vez), a fila inteira é apagada sozinha. Não existe botão de reset, porque o app não tem login nem administrador.
* **Tema claro e escuro:** o app lembra o último tema escolhido.

---

## 📋 Regras de Negócio

* Nome obrigatório, de 1 a 30 caracteres e **sem números**.
* Sem nomes repetidos (maiúsculas e minúsculas contam como iguais).
* Um nome por dispositivo.
* Cada pessoa só remove ou move o **próprio** nome.
* A ordem da fila é a ordem de chegada.
* Quem já é o último não pode "passar a vez".
* Após 30 minutos sem atividade, a fila é apagada por completo. Só entrar, sair e passar a vez contam como atividade: apenas olhar a fila **não** conta.

As regras valem no **servidor e no banco**, e não no navegador, porque o JavaScript da página pode ser alterado.

---

## 🚀 Tecnologias Utilizadas

* **Front-end:** HTML, CSS e JavaScript puros, sem frameworks (com paletas de cores inspiradas na identidade visual do SENAI).
* **Back-end / API:** Node.js / Serverless Functions (`/api`).
* **Banco de Dados:** PostgreSQL hospedado no **Neon**.
* **Hospedagem:** Vercel. A branch `main` é a produção, e as outras branches viram *previews*.

---

## ⚙️ Pré-requisitos

* [Node.js](https://nodejs.org/) (versão 18 ou superior recomendada).
* Git.

---

## 📥 Instalação e Configuração Local

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/torz1n/senaiQueue.git
   cd senaiQueue
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure a variável de ambiente.** Na raiz do projeto, crie o arquivo `.env.local` com a string de conexão do seu banco Neon:
   ```env
   DATABASE_URL=postgresql://seu_usuario:sua_senha@seu_host.neon.tech/neondb?sslmode=require
   ```

4. **Crie as tabelas** rodando o SQL da seção **Banco de Dados** (abaixo) no SQL Editor do Neon.

5. **Instale a Vercel CLI e vincule o projeto:**
   ```bash
   npm install -g vercel
   vercel link
   ```

---

## ▶️ Rodando Localmente

```bash
vercel dev
```

O projeto abre em `http://localhost:3000`.

> ⚠️ Se o `DATABASE_URL` aponta para o mesmo banco da produção, o que você testar mexe na fila real. O mesmo vale para as *previews* da Vercel: preview e produção usam o mesmo banco.

---

## 🗄️ Banco de Dados

Duas tabelas. Rode este SQL uma vez, no SQL Editor do Neon:

```sql
-- A fila
CREATE TABLE IF NOT EXISTS fila (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome VARCHAR(30) NOT NULL,
  dispositivo_id VARCHAR(64) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fila_dispositivo_unico UNIQUE (dispositivo_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS fila_nome_unico ON fila (lower(nome));

-- Hora da última atividade (uma linha só), usada no reinício automático
CREATE TABLE IF NOT EXISTS fila_atividade (
  id INT PRIMARY KEY CHECK (id = 1),
  ultima_atividade TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO fila_atividade (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
```

> Não renomeie `fila_dispositivo_unico` e `fila_nome_unico` sem atualizar o `api/fila.js`: a API usa esses nomes para saber qual regra foi violada.

---

## 🔌 API (`/api/fila`)

| Método | O que faz | Sucesso |
|--------|-----------|---------|
| `GET` | Lista a fila | 200 |
| `POST` | Entra na fila. Corpo: `{ "nome": "Ana" }` | 201 |
| `DELETE` | Remove o nome deste dispositivo | 200 |
| `PATCH` | Manda este dispositivo para o fim da fila | 200 |

O servidor reconhece cada dispositivo por um cookie (`dispositivo`), criado na primeira visita. Por isso `DELETE` e `PATCH` não recebem id: só mexem no nome de quem pediu.

**Erros** (sempre `{ "codigo", "erro" }`):

| Código | Status | Quando |
|--------|--------|--------|
| `NOME_VAZIO` | 400 | Nome em branco |
| `NOME_LONGO` | 400 | Mais de 30 caracteres |
| `NOME_INVALIDO` | 400 | Nome com números |
| `NOME_REPETIDO` | 409 | Já existe esse nome na fila |
| `DISPOSITIVO_JA_NA_FILA` | 409 | Este dispositivo já está na fila |
| `JA_E_O_ULTIMO` | 409 | Quem já é o último tentou passar a vez |
| `NAO_ESTA_NA_FILA` | 404 | Este dispositivo não está na fila |
| `METODO_NAO_PERMITIDO` | 405 | Método não aceito |
| `ERRO_INTERNO` | 500 | Erro inesperado (o detalhe fica nos logs da Vercel) |

---

## ⏱️ Reinício Automático

A cada pedido à API, o servidor confere a hora da última atividade. Se já passaram 30 minutos, ele apaga a fila inteira antes de responder, então quem abrir o app depois já vê a fila vazia. Não há um "timer" rodando de fundo, porque funções serverless só existem enquanto atendem um pedido.

O tempo fica em um único lugar: a constante `TEMPO_INATIVIDADE_MINUTOS`, no topo do `api/fila.js`.

---

## 📁 Estrutura de Pastas

```text
senaiQueue/
├── api/
│   └── fila.js       # API e regras de negócio
├── index.html        # Estrutura da página
├── script.js         # Lógica do front-end
├── style.css         # Estilos e tema claro/escuro
├── package.json      # Dependências do projeto
└── README.md         # Documentação
```

---

## 👥 Contribuição

Projeto desenvolvido para organizar as partidas no SENAI. Sinta-se à vontade para abrir *issues* ou enviar *pull requests*!

**Fluxo de trabalho:**
1. Abra uma *issue* e crie uma branch nova a partir da `main` atualizada.
2. Faça commits no padrão `feat:`, `fix:` ou `docs:`.
3. Abra um *pull request* com `Closes #N` e teste na *preview* da Vercel.
4. Faça **Squash and merge** e apague a branch.
5. Limpe o ambiente local:
   ```bash
   git checkout main
   git pull
   git branch -D nome-da-branch
   git fetch --prune
   ```