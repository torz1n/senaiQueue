/* ==========================================================
   1) ESTADO DO APP
   A fila é só um array por enquanto. Quando você trocar por uma
   API, o "estado" passa a viver no servidor, e o resto do código
   quase não muda.
   ========================================================== */
const LIMITE_NOME = 30;

let fila = [];        // cada item: { id, nome }
let proximoId = 1;    // contador que SÓ AUMENTA

// Por que não usar fila.length + 1 para o id?
// Porque o id precisa ser único. Se um dia você remover alguém do meio
// da fila (ou o primeiro for atendido), o length diminui e o próximo id
// repetiria um que já existiu. Um contador que só cresce nunca repete.
// (Num banco de dados, essa é exatamente a função do AUTO_INCREMENT/IDENTITY.)

// Guarda o id do card que acabou de entrar, só para animar ELE.
// Como renderizar() redesenha tudo, sem isso todos os cards
// animariam de novo a cada inclusão.
let idRecemAdicionado = null;

/* ==========================================================
   2) REFERÊNCIAS AO HTML
   Buscamos os elementos uma vez só, no início, em vez de
   procurar no DOM toda hora.
   ========================================================== */
const formulario = document.getElementById("formulario");
const campoNome = document.getElementById("campo-nome");
const mensagemErro = document.getElementById("mensagem-erro");
const listaFila = document.getElementById("lista-fila");
const contador = document.getElementById("contador");
const mensagemVazia = document.getElementById("mensagem-vazia");

/* ==========================================================
   3) LÓGICA (não mexe na tela, só nos dados)
   ========================================================== */

// Valida o nome já "limpo". Devolve uma mensagem de erro,
// ou null se estiver tudo certo.
function validarNome(nome) {
  if (nome === "") {
    return "Digite um nome para entrar na fila.";
  }
  if (nome.length > LIMITE_NOME) {
    return "O nome pode ter no máximo " + LIMITE_NOME + " caracteres.";
  }
  return null;
}

// Cria a pessoa e coloca no FINAL do array (quem chega primeiro fica
// na frente). Recebe só o nome: o id é responsabilidade desta função.
//
// PONTO DE TROCA PARA A API: depois você pode transformar em
//   async function adicionarNaFila(nome) {
//     const resposta = await fetch("/api/fila", { method: "POST", ... });
//     const pessoa = await resposta.json();
//     ...
//   }
// e o resto do código (validação, renderizar) continua igual.
function adicionarNaFila(nome) {
  const pessoa = { id: proximoId, nome: nome };
  proximoId++;                  // incrementa DEPOIS de usar
  fila.push(pessoa);
  idRecemAdicionado = pessoa.id;
  renderizar();                 // fila mudou -> redesenha
}

/* ==========================================================
   4) TELA
   ========================================================== */

// Apaga a lista e redesenha tudo a partir do array.
// Ideia central: a TELA é um reflexo do ARRAY. Nunca editamos o HTML
// "na mão" para adicionar um card; mudamos os dados e chamamos
// renderizar(). Isso evita telas e dados fora de sincronia, e é o
// mesmo princípio que frameworks como React usam.
function renderizar() {
  listaFila.innerHTML = ""; // aqui innerHTML só LIMPA (sem texto do usuário), então é seguro

  fila.forEach(function (pessoa, indice) {
    const card = document.createElement("li");
    card.className = "card";

    // A posição vem do ÍNDICE no array, não do id.
    // O id é identidade (nunca muda); a posição é ordem (pode mudar).
    // Se o #1 sair da fila, todo mundo sobe uma posição, mas os ids ficam.
    if (indice === 0) {
      card.classList.add("primeiro");
    }
    if (pessoa.id === idRecemAdicionado) {
      card.classList.add("novo");
    }

    const posicao = document.createElement("span");
    posicao.className = "posicao";
    posicao.textContent = "#" + (indice + 1);

    const nome = document.createElement("span");
    nome.className = "nome";
    // textContent trata o conteúdo como TEXTO PURO. Se alguém digitar
    // <script>..., aparece escrito na tela e não é executado.
    // Com innerHTML, o navegador interpretaria como HTML (risco de XSS).
    nome.textContent = pessoa.nome;

    card.appendChild(posicao);
    card.appendChild(nome);
    listaFila.appendChild(card);
  });

  atualizarContador();
}

// Atualiza o contador e alterna entre lista e mensagem de "vazia".
function atualizarContador() {
  const total = fila.length;

  if (total === 1) {
    contador.textContent = "1 pessoa na fila";
  } else {
    contador.textContent = total + " pessoas na fila";
  }

  // classList.toggle(classe, true) adiciona; (classe, false) remove.
  mensagemVazia.classList.toggle("escondido", total > 0);
}

/* ==========================================================
   5) EVENTOS (liga a tela à lógica)
   ========================================================== */

function mostrarErro(texto) {
  mensagemErro.textContent = texto;
  campoNome.classList.add("invalido");
}

function limparErro() {
  mensagemErro.textContent = "";
  campoNome.classList.remove("invalido");
}

// Escutamos o "submit" do formulário (e não o "click" do botão):
// assim o clique no botão e o Enter caem no mesmo código.
formulario.addEventListener("submit", function (evento) {
  evento.preventDefault(); // impede o navegador de recarregar a página

  // trim() remove espaços das pontas: "  Ana  " vira "Ana".
  const nome = campoNome.value.trim();

  const erro = validarNome(nome);
  if (erro) {
    mostrarErro(erro);
    campoNome.focus();
    return; // para aqui: nada entra na fila
  }

  limparErro();
  adicionarNaFila(nome);

  campoNome.value = "";
  campoNome.focus(); // pronto para o próximo nome (bom no celular)
});

// Some com o erro assim que a pessoa volta a digitar.
campoNome.addEventListener("input", limparErro);

// Primeira renderização: mostra "0 pessoas" e a mensagem de fila vazia.
renderizar();
