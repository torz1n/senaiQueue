// ==========================================================
// API DA FILA  ->  endereço: /api/fila
//
// Na Vercel, todo arquivo dentro da pasta /api vira um endereço.
// Este arquivo atende 3 pedidos, diferenciados pelo MÉTODO HTTP:
//   GET     /api/fila  -> lista a fila
//   POST    /api/fila  -> entra na fila   (body: { "nome": "Ana" })
//   DELETE  /api/fila  -> tira DESTE dispositivo da fila
// ==========================================================
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";

// Conexão com o Neon. A DATABASE_URL é a variável que a Vercel já criou.
// O endereço do banco (com a senha) fica só no servidor, nunca no front-end.
const sql = neon(process.env.DATABASE_URL);

const LIMITE_NOME = 30;
const NOME_COOKIE = "dispositivo";
const UM_ANO_EM_SEGUNDOS = 60 * 60 * 24 * 365;

// ----------------------------------------------------------
// FUNÇÕES AUXILIARES
// ----------------------------------------------------------

// Padroniza as respostas de erro: sempre { codigo, erro }.
// "codigo" é para o programa (script.js) e "erro" é o texto para a pessoa.
function responderErro(res, status, codigo, mensagem) {
  return res.status(status).json({ codigo: codigo, erro: mensagem });
}

// Lê um cookie do cabeçalho "Cookie" que o navegador envia.
function lerCookie(req, nome) {
  const cabecalho = req.headers.cookie || "";
  for (const parte of cabecalho.split(";")) {
    const [chave, ...resto] = parte.trim().split("=");
    if (chave === nome) {
      return resto.join("=");
    }
  }
  return null;
}

// Descobre "quem está chamando". Se o navegador já tem o cookie, usa
// o código dele. Se não tem (primeira visita), cria um e manda gravar.
//
// O cookie é HttpOnly: o JavaScript da página NÃO consegue ler nem
// alterar. Assim ninguém troca de "identidade" pelo console do navegador.
function identificarDispositivo(req, res) {
  const atual = lerCookie(req, NOME_COOKIE);

  // Só aceita se parecer um UUID de verdade (evita lixo vindo do cookie).
  if (atual && /^[0-9a-f-]{36}$/i.test(atual)) {
    return atual;
  }

  const novo = randomUUID();
  const atributos = [
    NOME_COOKIE + "=" + novo,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=" + UM_ANO_EM_SEGUNDOS,
  ];
  // "Secure" = só trafega por HTTPS. Na Vercel é sempre HTTPS.
  if (req.headers["x-forwarded-proto"] === "https") {
    atributos.push("Secure");
  }
  res.setHeader("Set-Cookie", atributos.join("; "));
  return novo;
}

// Limpa o nome: tira espaços das pontas e junta espaços repetidos
// no meio ("Ana   Maria" vira "Ana Maria").
function limparNome(valor) {
  if (typeof valor !== "string") {
    return "";
  }
  return valor.trim().replace(/\s+/g, " ");
}

// ----------------------------------------------------------
// AS 3 AÇÕES
// ----------------------------------------------------------

async function listarFila(res, dispositivoId) {
  // ORDER BY id = ordem de chegada.
  // "minha" diz se a linha é deste dispositivo. Assim o front-end
  // consegue marcar "você" SEM nunca receber o código dos outros.
  const linhas = await sql`
    SELECT id, nome, (dispositivo_id = ${dispositivoId}) AS minha
    FROM fila
    ORDER BY id
  `;
  return res.status(200).json({ fila: linhas, total: linhas.length });
}

async function entrarNaFila(req, res, dispositivoId) {
  const nome = limparNome(req.body && req.body.nome);

  // Validação do campo (o servidor é quem manda; o front-end é só conforto).
  if (nome === "") {
    return responderErro(res, 400, "NOME_VAZIO", "Digite um nome para entrar na fila.");
  }
  if(/\d/.test(nome))
  {
    return responderErro(res, 400, "NOME_INVALIDO", "Não são aceitos números no campo de nome.")
  }
  if (nome.length > LIMITE_NOME) {
    return responderErro(
      res, 400, "NOME_LONGO",
      "O nome pode ter no máximo " + LIMITE_NOME + " caracteres."
    );
  }

  // Por que NÃO fazemos "primeiro consulto se já existe, depois insiro"?
  // Porque entre a consulta e o insert pode chegar outro pedido ao mesmo
  // tempo (dois toques rápidos, duas abas...) e os dois passariam na checagem.
  // Então tentamos inserir direto e deixamos o BANCO recusar (UNIQUE).
  // O banco faz isso de forma atômica: é impossível furar a regra.
  try {
    const linhas = await sql`
      INSERT INTO fila (nome, dispositivo_id)
      VALUES (${nome}, ${dispositivoId})
      RETURNING id, nome
    `;
    return res.status(201).json({ pessoa: linhas[0] });
  } catch (erro) {
    // 23505 = código do Postgres para "violou uma regra de unicidade".
    if (erro && erro.code === "23505") {
      const detalhe = String(erro.constraint || "") + " " + String(erro.message || "");

      if (detalhe.includes("fila_dispositivo_unico")) {
        return responderErro(res, 409, "DISPOSITIVO_JA_NA_FILA", "Este dispositivo já está na fila.");
      }
      if (detalhe.includes("fila_nome_unico")) {
        return responderErro(res, 409, "NOME_REPETIDO", "Já existe alguém com esse nome na fila. Tente outro.");
      }
    }
    throw erro; // erro inesperado: cai no tratamento geral (500)
  }
}

async function sairDaFila(res, dispositivoId) {
  // Repare: NÃO recebemos o id de ninguém. O servidor apaga a linha do
  // dispositivo que fez o pedido. Por desenho, é impossível apagar o nome
  // de outra pessoa (não existe nem "campo" para pedir isso).
  const removidos = await sql`
    DELETE FROM fila
    WHERE dispositivo_id = ${dispositivoId}
    RETURNING id
  `;
  if (removidos.length === 0) {
    return responderErro(res, 404, "NAO_ESTA_NA_FILA", "Este dispositivo não está na fila.");
  }
  return res.status(200).json({ ok: true });
}

// ----------------------------------------------------------
// PORTA DE ENTRADA: a Vercel chama esta função a cada pedido
// ----------------------------------------------------------
export default async function handler(req, res) {
  // A fila muda toda hora: proíbe o navegador de guardar resposta antiga.
  res.setHeader("Cache-Control", "no-store");

  try {
    const dispositivoId = identificarDispositivo(req, res);

    if (req.method === "GET") {
      return await listarFila(res, dispositivoId);
    }
    if (req.method === "POST") {
      return await entrarNaFila(req, res, dispositivoId);
    }
    if (req.method === "DELETE") {
      return await sairDaFila(res, dispositivoId);
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return responderErro(res, 405, "METODO_NAO_PERMITIDO", "Método não permitido.");
  } catch (erro) {
    // O erro de verdade vai para o log da Vercel (para você investigar),
    // mas a pessoa só vê uma mensagem genérica: não vazamos detalhes do banco.
    console.error(erro);
    return responderErro(res, 500, "ERRO_INTERNO", "Algo deu errado. Tente novamente.");
  }
}