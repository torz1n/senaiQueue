/* ==========================================================
   1) ESTADO DO APP
   Antes a fila "morava" aqui, num array. Agora ela mora no BANCO
   (via API). A variável "fila" virou só uma CÓPIA do que o servidor
   respondeu, usada para desenhar a tela.
   O proximoId sumiu: quem gera o id agora é o banco (IDENTITY).
   ========================================================== */
const URL_API = "/api/fila";
const INTERVALO_ATUALIZACAO = 5000; // de quantos em quantos ms buscar a fila de novo

let fila = [];                 // cada item: { id, nome, minha }
let carregou = false;          // já recebemos a fila pelo menos uma vez?
let ocupado = false;           // tem um pedido em andamento? (evita toque duplo)
let idRecemAdicionado = null;  // só para animar o card que acabou de entrar

/* ==========================================================
   2) REFERÊNCIAS AO HTML
   ========================================================== */
const formulario = document.getElementById("formulario");
const campoNome = document.getElementById("campo-nome");
const botaoEntrar = document.getElementById("botao-entrar");
const mensagemErro = document.getElementById("mensagem-erro");
const areaStatus = document.getElementById("area-status");
const textoStatus = document.getElementById("texto-status");
const botaoSair = document.getElementById("botao-sair");
const listaFila = document.getElementById("lista-fila");
const contador = document.getElementById("contador");
const mensagemVazia = document.getElementById("mensagem-vazia");

/* ==========================================================
   3) CONVERSA COM A API
   Toda a comunicação com o servidor passa por esta função.
   Se um dia a URL ou o formato mudar, você arruma em um lugar só.
   ========================================================== */

// Devolve { ok, status, dados }.
//  - ok: true se o servidor respondeu com sucesso (códigos 2xx)
//  - dados: o JSON da resposta (ex.: { fila: [...] } ou { codigo, erro })
// Se a internet cair, o fetch lança erro: quem chamou trata com try/catch.
async function chamarApi(metodo, corpo) {
  const opcoes = { method: metodo, headers: {} };

  if (corpo) {
    opcoes.headers["Content-Type"] = "application/json";
    opcoes.body = JSON.stringify(corpo);
  }

  // O navegador envia o cookie do dispositivo sozinho (mesma origem).
  // É assim que o servidor sabe QUEM está pedindo.
  const resposta = await fetch(URL_API, opcoes);
  const dados = await resposta.json().catch(function () { return {}; });

  return { ok: resposta.ok, status: resposta.status, dados: dados };
}

// Busca a fila no servidor e redesenha SE algo mudou.
async function carregarFila() {
  try {
    const { ok, dados } = await chamarApi("GET");
    if (!ok) {
      return;
    }

    // Comparar antes evita redesenhar a tela à toa a cada atualização.
    const mudou = !carregou || JSON.stringify(dados.fila) !== JSON.stringify(fila);
    fila = dados.fila;
    carregou = true;

    if (mudou) {
      renderizar();
    }
  } catch (erro) {
    // Sem conexão: mantém o que já está na tela e tenta de novo depois.
  }
}

// Pede ao servidor para colocar o nome na fila.
// Não validamos o nome aqui: o servidor é quem valida (tem uma única
// fonte de verdade para as regras). Aqui só repassamos a resposta.
async function adicionarNaFila(nome) {
  const { ok, dados } = await chamarApi("POST", { nome: nome });

  if (!ok) {
    return { ok: false, codigo: dados.codigo, erro: dados.erro || "Não foi possível entrar na fila." };
  }

  idRecemAdicionado = dados.pessoa.id;
  await carregarFila(); // busca a fila atualizada e redesenha
  return { ok: true };
}

// Pede ao servidor para tirar ESTE dispositivo da fila.
async function sairDaFila() {
  const { ok, dados } = await chamarApi("DELETE");

  // 404 "não está na fila" não é problema: o objetivo (não estar na fila)
  // já foi cumprido. Só atualizamos a tela.
  if (!ok && dados.codigo !== "NAO_ESTA_NA_FILA") {
    return { ok: false, erro: dados.erro || "Não foi possível sair da fila." };
  }

  await carregarFila();
  return { ok: true };
}

/* ==========================================================
   4) TELA
   Mesma ideia de antes: a tela é um reflexo dos dados.
   Mudou a fila? Chama renderizar().
   ========================================================== */
function renderizar() {
  listaFila.innerHTML = ""; // só limpa (sem texto do usuário), então é seguro

  fila.forEach(function (pessoa, indice) {
    const card = document.createElement("li");
    card.className = "card";

    // Posição = índice no array (ordem de chegada). O id é só identidade.
    if (indice === 0) {
      card.classList.add("primeiro");
    }
    if (pessoa.id === idRecemAdicionado) {
      card.classList.add("novo");
    }
    if (pessoa.minha) {
      card.classList.add("meu");
    }

    const posicao = document.createElement("span");
    posicao.className = "posicao";
    posicao.textContent = "#" + (indice + 1);

    const nome = document.createElement("span");
    nome.className = "nome";
    // textContent: o nome vem do banco, mas continua sendo texto de
    // usuário. Tratar como TEXTO PURO evita injeção de HTML (XSS).
    nome.textContent = pessoa.nome;

    card.appendChild(posicao);
    card.appendChild(nome);

    if (pessoa.minha) {
      const etiqueta = document.createElement("span");
      etiqueta.className = "etiqueta-voce";
      etiqueta.textContent = "você";
      card.appendChild(etiqueta);
    }

    listaFila.appendChild(card);
  });

  // A animação deve rodar uma vez só. Sem isso, o card ficaria
  // animando de novo a cada atualização automática.
  idRecemAdicionado = null;

  atualizarContador();
  atualizarFormulario();
}

function atualizarContador() {
  const total = fila.length;

  if (!carregou) {
    contador.textContent = "Carregando fila...";
  } else if (total === 1) {
    contador.textContent = "1 pessoa na fila";
  } else {
    contador.textContent = total + " pessoas na fila";
  }

  // Só mostra "fila vazia" depois que o servidor confirmou que está vazia.
  mensagemVazia.classList.toggle("escondido", !carregou || total > 0);
}

// Trava o formulário se este dispositivo já está na fila (ou se tem um
// pedido em andamento) e mostra o aviso com o botão de sair.
function atualizarFormulario() {
  const minhaEntrada = fila.find(function (pessoa) {
    return pessoa.minha;
  });
  const jaEntrou = Boolean(minhaEntrada);

  campoNome.disabled = jaEntrou || ocupado;
  botaoEntrar.disabled = jaEntrou || ocupado;
  botaoSair.disabled = ocupado;

  if (jaEntrou) {
    textoStatus.textContent = "Você está na fila como " + minhaEntrada.nome + ".";
  }
  areaStatus.classList.toggle("escondido", !jaEntrou);
}

function definirOcupado(valor) {
  ocupado = valor;
  atualizarFormulario();
}

/* ==========================================================
   5) EVENTOS
   ========================================================== */

function mostrarErro(texto) {
  mensagemErro.textContent = texto;
  campoNome.classList.add("invalido");
}

function limparErro() {
  mensagemErro.textContent = "";
  campoNome.classList.remove("invalido");
}

// "submit" cobre o clique no botão e o Enter.
formulario.addEventListener("submit", async function (evento) {
  evento.preventDefault();
  if (ocupado) {
    return;
  }

  definirOcupado(true);
  try {
    const resultado = await adicionarNaFila(campoNome.value);

    if (resultado.ok) {
      limparErro();
      campoNome.value = "";
    } else {
      mostrarErro(resultado.erro); // a mensagem vem pronta do servidor
      if (resultado.codigo === "DISPOSITIVO_JA_NA_FILA") {
        await carregarFila(); // a tela estava desatualizada: sincroniza
      }
    }
  } catch (erro) {
    mostrarErro("Sem conexão com o servidor. Tente de novo.");
  } finally {
    definirOcupado(false);
    if (!campoNome.disabled) {
      campoNome.focus(); // se deu erro, deixa pronto para corrigir
    }
  }
});

botaoSair.addEventListener("click", async function () {
  if (ocupado) {
    return;
  }

  definirOcupado(true);
  try {
    const resultado = await sairDaFila();
    if (resultado.ok) {
      limparErro();
    } else {
      mostrarErro(resultado.erro);
    }
  } catch (erro) {
    mostrarErro("Sem conexão com o servidor. Tente de novo.");
  } finally {
    definirOcupado(false);
  }
});

campoNome.addEventListener("input", limparErro);

/* ==========================================================
   6) ATUALIZAÇÃO AUTOMÁTICA
   Outras pessoas entram e saem pelos celulares delas. Como o servidor
   não "empurra" novidades, o navegador PERGUNTA de tempos em tempos
   (técnica chamada polling). Pausa quando a aba está escondida,
   para não gastar bateria nem requisições à toa.
   ========================================================== */
setInterval(function () {
  if (!document.hidden && !ocupado) {
    carregarFila();
  }
}, INTERVALO_ATUALIZACAO);

// Voltou para a aba? Atualiza na hora, sem esperar o próximo ciclo.
document.addEventListener("visibilitychange", function () {
  if (!document.hidden) {
    carregarFila();
  }
});

/* ==========================================================
   7) INÍCIO DO APP
   Fica ANTES do tema de propósito: o essencial (mostrar a fila) não
   pode depender de um detalhe visual. Se algo no tema falhar, o
   script para ali, mas a fila já está funcionando.
   ========================================================== */
// Desenha o estado "carregando" e busca a fila de verdade.
renderizar();
carregarFila();

/* ==========================================================
   8) TEMA CLARO / ESCURO
   O tema inicial já foi escolhido pelo mini-script do <head> (para a
   tela não "piscar"). Aqui ficam: a CRIAÇÃO do botão dentro do
   cabeçalho, a troca de tema e o salvamento da escolha.
   ========================================================== */
const CHAVE_TEMA = "tema"; // mesma chave usada no mini-script do index.html
const metaCorTema = document.querySelector('meta[name="theme-color"]');

// Ícones do botão: uma lua e um sol. O CSS mostra só um dos dois,
// conforme o tema (lua no claro, sol no escuro).
// Aqui o innerHTML é seguro porque o texto é FIXO, escrito por nós.
// A regra "não usar innerHTML" vale para texto que vem do USUÁRIO
// (como o nome digitado), que é o que o textContent protege.
const ICONES_TEMA =
  '<svg class="icone-lua" viewBox="0 0 24 24" width="22" height="22" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
  '<svg class="icone-sol" viewBox="0 0 24 24" width="22" height="22" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="5"/>' +
    '<line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>' +
    '<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>' +
    '<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>' +
    '<line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>' +
    '<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>' +
    '<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

// Cria o botão e o coloca no cabeçalho (<header class="topo">).
// Por ser filho do cabeçalho, que é um flex com "space-between",
// ele fica sozinho no canto direito, sem precisar de CSS novo.
function criarBotaoTema() {
  const botao = document.createElement("button");
  botao.id = "botao-tema";
  botao.className = "botao-tema";
  botao.type = "button"; // garante que nunca seja tratado como botão de "enviar"
  botao.innerHTML = ICONES_TEMA;

  document.querySelector(".topo").appendChild(botao);
  return botao;
}

const botaoTema = criarBotaoTema();

// Lê o tema que está valendo agora direto do <html>.
// O HTML é a "fonte da verdade": não guardamos o tema numa variável
// separada, para não ter dois lugares que podem discordar.
function temaAtual() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

// Aplica o tema: o CSS reage sozinho ao atributo data-theme, então
// trocar de tema é só mudar este atributo.
function aplicarTema(tema) {
  document.documentElement.setAttribute("data-theme", tema);

  // O botão muda de função a cada clique, então o texto para
  // leitores de tela (e o balão ao passar o mouse) acompanha.
  const texto = tema === "dark" ? "Ativar modo claro" : "Ativar modo escuro";
  botaoTema.setAttribute("aria-label", texto);
  botaoTema.title = texto;

  // Pinta a barra do navegador do celular com a cor de fundo do tema.
  // Lemos a cor da variável do CSS, assim não repetimos hexadecimais aqui.
  if (metaCorTema) {
    const corFundo = getComputedStyle(document.documentElement).getPropertyValue("--fundo").trim();
    if (corFundo) {
      metaCorTema.setAttribute("content", corFundo);
    }
  }
}

botaoTema.addEventListener("click", function () {
  const novoTema = temaAtual() === "dark" ? "light" : "dark";
  aplicarTema(novoTema);

  // Salva a escolha neste aparelho. Na próxima visita (ou ao recarregar),
  // o mini-script do <head> lê isso e já abre no tema escolhido.
  try {
    localStorage.setItem(CHAVE_TEMA, novoTema);
  } catch (erro) {
    // localStorage bloqueado: o tema vale só até fechar a página.
  }
});

// Sincroniza o botão e a barra do navegador com o tema inicial.
aplicarTema(temaAtual());