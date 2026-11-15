 # 🏓 SENAI Tênis de Mesa - Sistema de Gestão de Fila

Sistema web desenvolvido para gerenciar a fila de partidas e o fluxo de jogadores nas mesas de tênis de mesa do SENAI, integrado com banco de dados em nuvem e arquitetura serverless.

---

## 🚀 Tecnologias Utilizadas

* **Front-end:** HTML5, CSS3, JavaScript (com paletas de cores customizadas inspiradas na identidade visual do SENAI).
* **Back-end / API:** Node.js / Serverless Functions (`/api`).
* **Banco de Dados:** PostgreSQL (hospedado no **Neon** com *Connection Pooling* habilitado).
* **Deploy & Ferramentas:** Vercel CLI (`vercel dev`) para execução e testes locais.

---

## ⚙️ Pré-requisitos

Certifique-se de ter instalado em sua máquina:
* [Node.js](https://nodejs.org/) (versão 18 ou superior recomendada).
* Git.

---

## 📥 Instalação e Configuração Local

1. **Clone o repositório e acesse a pasta do projeto:**
   ```bash
   git clone [https://github.com/seu-usuario/senaiProjectTenisDeMesa.git](https://github.com/seu-usuario/senaiProjectTenisDeMesa.git)
   cd senaiProjectTenisDeMesa
   ```

2. **Instale as dependências da aplicação:**
   ```bash
   npm install
   ```

3. **Configure as Variáveis de Ambiente:**
   Na raiz do projeto, crie um arquivo chamado `.env.local` e adicione a string de conexão do seu banco de dados Neon:
   ```env
   DATABASE_URL=postgresql://seu_usuario:sua_senha@seu_host.neon.tech/neondb?sslmode=require
   ```
   *(Nota: Certifique-se de que a URL comece com `postgresql://` e que a opção de Connection Pooling esteja ativa no painel do Neon).*

4. **Instale a Vercel CLI globalmente (caso ainda não tenha instalado):**
   ```bash
   npm install -g vercel
   ```

5. **Vincule o projeto à sua conta da Vercel:**
   ```bash
   vercel link
   ```
   *(Siga as instruções na aba do navegador que irá abrir para autenticar e selecionar o projeto).*

---

## ▶️ Rodando o Projeto Localmente

Para rodar a aplicação junto com as funções de API simulando o ambiente de nuvem, utilize o comando da Vercel CLI:

```bash
vercel dev
```

O projeto estará disponível acessando no navegador:
```text
http://localhost:3000
```

---

## 📁 Estrutura de Pastas

```text
senaiProjectTenisDeMesa/
├── api/              # Endpoints serverless (ex: fila.js)
├── public/ ou raiz   # Arquivos estáticos (HTML, CSS, JS do front-end)
├── .env.local        # Variáveis de ambiente locais (ignorado pelo Git)
├── .vercel/          # Configurações de vínculo com a Vercel (ignorado pelo Git)
├── package.json      # Dependências e scripts do projeto
└── README.md         # Documentação do projeto
```

---

## 👥 Contribuição
Projeto desenvolvido para otimização e organização das partidas no SENAI. Sinta-se à vontade para abrir *issues* ou enviar *pull requests* com melhorias!