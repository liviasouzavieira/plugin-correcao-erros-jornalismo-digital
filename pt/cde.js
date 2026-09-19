/*
 * ================================================================
 *  Plugin de Correção de Erros — JavaScript
 *  API global: window.CorrecaoDeErros
 *
 *  Este arquivo contém somente o comportamento do plugin.
 *  Inclua-o via <script src="cde.js"></script> antes do </body>
 *  do seu template. O plugin inicia automaticamente ao carregar
 *  o DOM; para customizar, chame CorrecaoDeErros.init({ ... }).
 *
 *  Versão: 1.0
 *  Origem: pesquisa "Protocolo de gestão para correção de erros
 *  no jornalismo digital" (nº PPP0014/2024 — Fapesb/CNPq).
 * ================================================================
 */

(function(global) {
  "use strict";

  // ---- Rótulos padrão (pt-BR). Podem ser sobrescritos em init({ rotulos }) ----
  var rotulosPadrao = {
    botaoReportar: "Comunicar erro",
    botaoFlutuante: "Comunicar erro",
    modalTitulo: "Comunique um erro",
    modalSubtitulo: "Ajude a melhorar a precisão desta matéria. Sua mensagem será revisada pela editoria.",
    formTipo: "Tipo do erro",
    formDescricao: "Descrição",
    formDescricaoPlaceholder: "Descreva o que está incorreto e, se possível, indique a fonte.",
    formEmail: "E-mail (opcional)",
    formEmailPlaceholder: "voce@email.com",
    formEnviar: "Enviar comunicação",
    formEnviando: "Enviando...",
    formFechar: "Fechar",
    sucessoTitulo: "Recebemos sua comunicação",
    sucessoTexto: "A editoria vai avaliar e retornar se precisar de mais informações.",
    tipoFactual: "Erro factual",
    tipoGrafia: "Erro de grafia",
    tipoImprecisao: "Imprecisão (número ou informação vaga)",
    tipoDeclaracao: "Erro em declaração ou citação",
    tipoOutro: "Outro",
    listaVazio: "Nenhuma correção registrada nesta matéria.",
    filtroTodas: "Todas",
    filtroRecentes: "Recentes (24h)",
    filtroFactual: "Factual",
    filtroGrafia: "Grafia",
    filtroImprecisao: "Imprecisão",
    filtroDeclaracao: "Declaração",
    badgeRecente: "Nova"
  };

  // ---- Configuração global ----
  var config = {
    endpoint: null,
    janelaRecenteHoras: 24,
    botaoFlutuante: false,
    posicaoBotao: "bottom-right",
    aoReportar: null,
    rotulos: {}
  };

  // Registro de correções (de data-attributes + adicionadas via API)
  var registro = [];
  var elementoFocoAntes = null;

  // ---------- Utilitários ----------
  function rotulo(chave) {
    return (config.rotulos && config.rotulos[chave]) || rotulosPadrao[chave] || chave;
  }
  function htmlEscape(txt) {
    if (txt == null) return "";
    return String(txt)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function formatarData(isoOuString) {
    if (!isoOuString) return "";
    var d = new Date(isoOuString);
    if (isNaN(d.getTime())) return isoOuString;
    try {
      return d.toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    } catch (e) { return d.toISOString(); }
  }
  function eRecente(isoOuString) {
    if (!isoOuString) return false;
    var d = new Date(isoOuString);
    if (isNaN(d.getTime())) return false;
    var agora = Date.now();
    var limite = config.janelaRecenteHoras * 60 * 60 * 1000;
    return (agora - d.getTime()) <= limite && (agora - d.getTime()) >= 0;
  }
  function criarEl(tag, classes, htmlInterno) {
    var el = document.createElement(tag);
    if (classes) el.className = classes;
    if (htmlInterno != null) el.innerHTML = htmlInterno;
    return el;
  }

  // ---------- Transformação de correções inline ----------
  function transformarInline() {
    var spans = document.querySelectorAll("[data-cde-inline]:not([data-cde-pronto])");
    spans.forEach(function(span) {
      span.classList.add("cde-inline");
      span.setAttribute("data-cde-pronto", "true");
      span.setAttribute("tabindex", "0");
      var antes = span.getAttribute("data-cde-antes") || "";
      var motivo = span.getAttribute("data-cde-motivo") || "";
      var tooltipHTML = "";
      if (motivo) tooltipHTML += "<strong>Correção.</strong> " + htmlEscape(motivo);
      if (antes) tooltipHTML += "<span class=\"cde-tooltip-antes\">Antes: " + htmlEscape(antes) + "</span>";
      if (tooltipHTML) {
        span.setAttribute("aria-label", "Correção. Antes: " + antes + (motivo ? ". Motivo: " + motivo : ""));
        var mostrarTooltip = function() {
          esconderTodosTooltips();
          var tip = criarEl("span", "cde-inline-tooltip", tooltipHTML);
          span.appendChild(tip);
        };
        span.addEventListener("mouseenter", mostrarTooltip);
        span.addEventListener("focus", mostrarTooltip);
        span.addEventListener("mouseleave", esconderTodosTooltips);
        span.addEventListener("blur", esconderTodosTooltips);
      }
    });
  }
  function esconderTodosTooltips() {
    document.querySelectorAll(".cde-inline-tooltip").forEach(function(t) { t.remove(); });
  }

  // ---------- Transformação de blocos de errata ----------
  function transformarBlocos() {
    var blocos = document.querySelectorAll("[data-cde-bloco]:not([data-cde-pronto])");
    blocos.forEach(function(bloco) {
      var dados = lerDadosDoElemento(bloco);
      bloco.setAttribute("data-cde-pronto", "true");
      registro.push(dados);
      renderizarBlocoEm(bloco, dados);
    });
  }
  function lerDadosDoElemento(el) {
    return {
      tipo: el.getAttribute("data-cde-tipo") || "outro",
      titulo: el.getAttribute("data-cde-titulo") || "",
      motivo: el.getAttribute("data-cde-motivo") || "",
      antes: el.getAttribute("data-cde-antes") || "",
      depois: el.getAttribute("data-cde-depois") || "",
      data: el.getAttribute("data-cde-data") || ""
    };
  }
  function rotuloTipo(tipo) {
    var mapa = {
      factual: "tipoFactual",
      grafia: "tipoGrafia",
      imprecisao: "tipoImprecisao",
      declaracao: "tipoDeclaracao",
      outro: "tipoOutro"
    };
    return rotulo(mapa[tipo] || "tipoOutro");
  }
  function renderizarBlocoEm(elemento, dados) {
    var recente = eRecente(dados.data);
    elemento.className = "cde-bloco" + (recente ? " cde-recente" : "");
    elemento.innerHTML = [
      '<div class="cde-bloco-header">',
        '<span class="cde-badge cde-tipo-' + htmlEscape(dados.tipo) + '">' + htmlEscape(rotuloTipo(dados.tipo)) + '</span>',
        recente ? '<span class="cde-badge cde-badge-recente">' + htmlEscape(rotulo("badgeRecente")) + '</span>' : '',
        dados.data ? '<span class="cde-bloco-data">' + htmlEscape(formatarData(dados.data)) + '</span>' : '',
      '</div>',
      dados.titulo ? '<div class="cde-bloco-titulo">' + htmlEscape(dados.titulo) + '</div>' : '',
      dados.motivo ? '<p class="cde-bloco-motivo">' + htmlEscape(dados.motivo) + '</p>' : '',
      (dados.antes || dados.depois) ? (
        '<div class="cde-diff">' +
          (dados.antes ? '<div class="cde-diff-antes">' + htmlEscape(dados.antes) + '</div>' : '') +
          (dados.depois ? '<div class="cde-diff-depois">' + htmlEscape(dados.depois) + '</div>' : '') +
        '</div>'
      ) : ''
    ].join("");
  }

  // ---------- Renderização de lista/arquivo ----------
  var filtroAtual = "todas";
  function transformarListas() {
    var listas = document.querySelectorAll("[data-cde-lista]:not([data-cde-pronto])");
    listas.forEach(function(container) {
      container.setAttribute("data-cde-pronto", "true");
      renderLista(container);
    });
  }
  function renderLista(container) {
    var titulo = container.getAttribute("data-cde-titulo") || "Correções";
    var subtitulo = container.getAttribute("data-cde-subtitulo") || "";
    container.classList.add("cde-lista");
    container.innerHTML = [
      '<div class="cde-lista-header">',
        '<div>',
          '<h3 class="cde-lista-titulo">' + htmlEscape(titulo) + '</h3>',
          subtitulo ? '<p class="cde-lista-subtitulo">' + htmlEscape(subtitulo) + '</p>' : '',
        '</div>',
        '<span class="cde-lista-subtitulo">' + registro.length + ' registrada(s)</span>',
      '</div>',
      '<div class="cde-lista-filtros" role="tablist">',
        botaoFiltro("todas", rotulo("filtroTodas")),
        botaoFiltro("recentes", rotulo("filtroRecentes")),
        botaoFiltro("factual", rotulo("filtroFactual")),
        botaoFiltro("grafia", rotulo("filtroGrafia")),
        botaoFiltro("imprecisao", rotulo("filtroImprecisao")),
        botaoFiltro("declaracao", rotulo("filtroDeclaracao")),
      '</div>',
      '<div class="cde-lista-itens"></div>'
    ].join("");

    // Ligar filtros
    container.querySelectorAll(".cde-filtro").forEach(function(btn) {
      btn.addEventListener("click", function() {
        filtroAtual = btn.getAttribute("data-cde-filtro-valor");
        container.querySelectorAll(".cde-filtro").forEach(function(b) {
          b.classList.toggle("cde-filtro-ativo", b === btn);
        });
        renderItens(container);
      });
    });
    renderItens(container);
  }
  function botaoFiltro(valor, texto) {
    var ativo = filtroAtual === valor ? " cde-filtro-ativo" : "";
    return '<button type="button" class="cde-filtro' + ativo + '" data-cde-filtro-valor="' + valor + '">' + htmlEscape(texto) + '</button>';
  }
  function renderItens(container) {
    var itensWrap = container.querySelector(".cde-lista-itens");
    if (!itensWrap) return;
    var filtrados = registro.filter(function(c) {
      if (filtroAtual === "todas") return true;
      if (filtroAtual === "recentes") return eRecente(c.data);
      return c.tipo === filtroAtual;
    });
    if (filtrados.length === 0) {
      itensWrap.innerHTML = '<div class="cde-lista-vazio">' + htmlEscape(rotulo("listaVazio")) + '</div>';
      return;
    }
    // Ordenar mais recentes primeiro
    filtrados.sort(function(a, b) {
      return new Date(b.data || 0) - new Date(a.data || 0);
    });
    itensWrap.innerHTML = "";
    filtrados.forEach(function(dados) {
      var item = criarEl("div", "cde-lista-item");
      renderizarBlocoEm(item, dados);
      itensWrap.appendChild(item);
    });
  }

  // ---------- Modal de reportar erro ----------
  var overlay = null;

  function construirModal() {
    if (overlay) return overlay;
    overlay = criarEl("div", "cde-modal-overlay");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = [
      '<div class="cde-modal">',
        '<div class="cde-modal-header">',
          '<div>',
            '<h3 class="cde-modal-titulo">' + htmlEscape(rotulo("modalTitulo")) + '</h3>',
            '<p class="cde-modal-subtitulo">' + htmlEscape(rotulo("modalSubtitulo")) + '</p>',
          '</div>',
          '<button type="button" class="cde-modal-fechar" aria-label="' + htmlEscape(rotulo("formFechar")) + '">×</button>',
        '</div>',
        '<form class="cde-form" novalidate>',
          '<div class="cde-form-grupo">',
            '<label class="cde-form-label">' + htmlEscape(rotulo("formTipo")) + '</label>',
            '<div class="cde-form-radio-grupo">',
              radio("tipo", "factual", rotulo("tipoFactual"), true),
              radio("tipo", "grafia", rotulo("tipoGrafia")),
              radio("tipo", "imprecisao", rotulo("tipoImprecisao")),
              radio("tipo", "declaracao", rotulo("tipoDeclaracao")),
              radio("tipo", "outro", rotulo("tipoOutro")),
            '</div>',
          '</div>',
          '<div class="cde-form-grupo">',
            '<label class="cde-form-label" for="cde-descricao">' + htmlEscape(rotulo("formDescricao")) + '</label>',
            '<textarea id="cde-descricao" name="descricao" class="cde-form-textarea" required placeholder="' + htmlEscape(rotulo("formDescricaoPlaceholder")) + '"></textarea>',
          '</div>',
          '<div class="cde-form-grupo">',
            '<label class="cde-form-label" for="cde-email">' + htmlEscape(rotulo("formEmail")) + '</label>',
            '<input id="cde-email" name="email" type="email" class="cde-form-input" placeholder="' + htmlEscape(rotulo("formEmailPlaceholder")) + '">',
          '</div>',
          '<button type="submit" class="cde-form-submit">' + htmlEscape(rotulo("formEnviar")) + '</button>',
        '</form>',
      '</div>'
    ].join("");
    document.body.appendChild(overlay);

    // Eventos
    overlay.addEventListener("click", function(e) {
      if (e.target === overlay) fecharModal();
    });
    overlay.querySelector(".cde-modal-fechar").addEventListener("click", fecharModal);
    overlay.querySelectorAll(".cde-form-radio input").forEach(function(inp) {
      inp.addEventListener("change", atualizarEstiloRadio);
    });
    atualizarEstiloRadio();
    overlay.querySelector(".cde-form").addEventListener("submit", tratarEnvio);
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape" && overlay.classList.contains("cde-aberto")) fecharModal();
    });
    return overlay;
  }
  function radio(nome, valor, rotuloTexto, checked) {
    return (
      '<label class="cde-form-radio">' +
        '<input type="radio" name="' + nome + '" value="' + valor + '"' + (checked ? ' checked' : '') + '>' +
        '<span>' + htmlEscape(rotuloTexto) + '</span>' +
      '</label>'
    );
  }
  function atualizarEstiloRadio() {
    overlay.querySelectorAll(".cde-form-radio").forEach(function(lbl) {
      var inp = lbl.querySelector("input");
      lbl.classList.toggle("cde-selecionado", inp && inp.checked);
    });
  }
  function abrirModal() {
    construirModal();
    elementoFocoAntes = document.activeElement;
    overlay.classList.add("cde-aberto");
    var primeiro = overlay.querySelector(".cde-form-textarea");
    if (primeiro) setTimeout(function() { primeiro.focus(); }, 50);
  }
  function fecharModal() {
    if (!overlay) return;
    overlay.classList.remove("cde-aberto");
    // Limpar estado de sucesso para próxima abertura
    setTimeout(function() {
      var form = overlay.querySelector(".cde-form");
      var sucesso = overlay.querySelector(".cde-form-sucesso");
      if (sucesso) {
        sucesso.remove();
        form.style.display = "";
        form.reset();
        atualizarEstiloRadio();
      }
    }, 300);
    if (elementoFocoAntes && elementoFocoAntes.focus) elementoFocoAntes.focus();
  }
  function tratarEnvio(e) {
    e.preventDefault();
    var form = e.target;
    var submit = form.querySelector(".cde-form-submit");
    var dados = {
      tipo: (form.querySelector("input[name=tipo]:checked") || {}).value || "outro",
      descricao: form.querySelector("[name=descricao]").value.trim(),
      email: form.querySelector("[name=email]").value.trim(),
      url: location.href,
      dataEnvio: new Date().toISOString()
    };
    if (!dados.descricao) {
      form.querySelector("[name=descricao]").focus();
      return;
    }
    submit.disabled = true;
    submit.textContent = rotulo("formEnviando");

    var promessa;
    if (typeof config.aoReportar === "function") {
      try {
        var r = config.aoReportar(dados);
        promessa = (r && typeof r.then === "function") ? r : Promise.resolve(r);
      } catch (err) { promessa = Promise.reject(err); }
    } else if (config.endpoint) {
      promessa = fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
      });
    } else {
      // Sem endpoint nem callback: apenas simula sucesso (modo demo).
      promessa = Promise.resolve();
    }

    Promise.resolve(promessa).then(function() {
      mostrarSucesso(form);
    }).catch(function() {
      submit.disabled = false;
      submit.textContent = rotulo("formEnviar");
      alert("Não foi possível enviar agora. Tente novamente em instantes.");
    });
  }
  function mostrarSucesso(form) {
    form.style.display = "none";
    var sucesso = criarEl("div", "cde-form-sucesso",
      '<div class="cde-form-sucesso-icone">✓</div>' +
      '<p class="cde-form-sucesso-titulo">' + htmlEscape(rotulo("sucessoTitulo")) + '</p>' +
      '<p class="cde-form-sucesso-texto">' + htmlEscape(rotulo("sucessoTexto")) + '</p>'
    );
    form.parentNode.appendChild(sucesso);
    setTimeout(fecharModal, 2600);
  }

  // ---------- Botão flutuante ----------
  function montarBotaoFlutuante() {
    if (!config.botaoFlutuante) return;
    if (document.querySelector(".cde-botao-flutuante")) return;
    var btn = criarEl("button", "cde-botao-reportar cde-botao-flutuante cde-pos-" + config.posicaoBotao,
      htmlEscape(rotulo("botaoFlutuante")));
    btn.type = "button";
    btn.addEventListener("click", abrirModal);
    document.body.appendChild(btn);
  }

  // ---------- Ligar botões data-cde-abrir-form ----------
  function ligarBotoes() {
    document.querySelectorAll("[data-cde-abrir-form]:not([data-cde-pronto])").forEach(function(btn) {
      btn.setAttribute("data-cde-pronto", "true");
      if (!btn.textContent.trim()) btn.textContent = rotulo("botaoReportar");
      if (!btn.classList.contains("cde-botao-reportar")) btn.classList.add("cde-botao-reportar");
      btn.addEventListener("click", function(e) {
        e.preventDefault();
        abrirModal();
      });
    });
  }

  // ---------- Direito de resposta ----------
  function transformarRespostas() {
    document.querySelectorAll("[data-cde-resposta]:not([data-cde-pronto])").forEach(function(el) {
      el.setAttribute("data-cde-pronto", "true");
      el.classList.add("cde-resposta");
      var de = el.getAttribute("data-cde-de") || "";
      var decisao = el.getAttribute("data-cde-decisao") || "";
      var dataAttr = el.getAttribute("data-cde-data") || "";
      var introducao = el.getAttribute("data-cde-introducao") || "";
      var texto = el.getAttribute("data-cde-texto") || "";
      var rodape = el.getAttribute("data-cde-rodape") || "";
      var partesMeta = [];
      if (de) partesMeta.push("<strong>" + htmlEscape(de) + "</strong>");
      if (dataAttr) partesMeta.push("publicado em <strong>" + htmlEscape(formatarData(dataAttr)) + "</strong>");
      if (decisao) partesMeta.push("em cumprimento à decisão: <strong>" + htmlEscape(decisao) + "</strong>");
      el.innerHTML = [
        partesMeta.length ? '<div class="cde-resposta-meta">' + partesMeta.join(" · ") + '</div>' : '',
        introducao ? '<p class="cde-resposta-introducao">' + htmlEscape(introducao) + '</p>' : '',
        texto ? '<blockquote class="cde-resposta-corpo">' + htmlEscape(texto) + '</blockquote>' : '',
        rodape ? '<div class="cde-resposta-rodape">' + htmlEscape(rodape) + '</div>' : ''
      ].join("");
    });
  }

  // ---------- Trecho excluído (some por completo após 24h) ----------
  function transformarExcluidos() {
    document.querySelectorAll("[data-cde-excluido]:not([data-cde-pronto])").forEach(function(el) {
      el.setAttribute("data-cde-pronto", "true");
      el.classList.add("cde-excluido");
      var motivo = el.getAttribute("data-cde-motivo") || "não informado";
      var marcadoPor = el.getAttribute("data-cde-marcado-por") || "";
      var dataAttr = el.getAttribute("data-cde-data") || "";
      var explicacao = el.getAttribute("data-cde-explicacao") || "";
      var original = el.getAttribute("data-cde-original") || "";
      var partesMeta = [];
      if (dataAttr) partesMeta.push("<strong>" + htmlEscape(formatarData(dataAttr)) + "</strong>");
      partesMeta.push("motivo: <strong>" + htmlEscape(motivo) + "</strong>");
      if (marcadoPor) partesMeta.push("marcado por <strong>" + htmlEscape(marcadoPor) + "</strong>");
      el.innerHTML = [
        '<div class="cde-excluido-cabecalho">',
          '<span class="cde-excluido-selo">⊘ Trecho excluído</span>',
          '<span class="cde-excluido-meta">' + partesMeta.join(" · ") + '</span>',
        '</div>',
        explicacao ? '<p class="cde-excluido-explicacao">' + htmlEscape(explicacao) + '</p>' : '',
        original ? (
          '<details class="cde-excluido-toggle">' +
            '<summary>Ver trecho excluído (texto original)</summary>' +
            '<blockquote class="cde-excluido-original">' + htmlEscape(original) + '</blockquote>' +
          '</details>'
        ) : ''
      ].join("");
    });
  }

  // ---------- Conteúdo novo (caixa amarela; marcação some 24h, texto fica) ----------
  function transformarNovos() {
    document.querySelectorAll("[data-cde-novo]:not([data-cde-pronto])").forEach(function(el) {
      el.setAttribute("data-cde-pronto", "true");
      el.classList.add("cde-novo");
      var dataAttr = el.getAttribute("data-cde-data") || "";
      var horas = horasDesde(dataAttr);
      var rotuloTopo;
      if (horas == null) {
        rotuloTopo = "Novo";
      } else if (horas < 1) {
        rotuloTopo = "Novo · acrescentado há " + Math.max(1, Math.round(horas * 60)) + "min";
      } else if (horas < 2) {
        rotuloTopo = "Novo · acrescentado há 1h";
      } else {
        rotuloTopo = "Novo · acrescentado há " + Math.round(horas) + "h";
      }
      el.setAttribute("data-cde-rotulo", rotuloTopo);
    });
  }

  // ---------- Lógica de 24h embutida ----------
  function horasDesde(isoOuString) {
    if (!isoOuString) return null;
    var d = new Date(isoOuString);
    if (isNaN(d.getTime())) return null;
    return (Date.now() - d.getTime()) / 3600000;
  }

  function aplicarRegrasDe24h() {
    var janela = config.janelaRecenteHoras;

    // Trecho excluído: bloco inteiro some
    document.querySelectorAll(".cde-excluido[data-cde-data]").forEach(function(el) {
      var h = horasDesde(el.getAttribute("data-cde-data"));
      if (h != null && h > janela) el.style.display = "none";
    });

    // Conteúdo novo: marcação some, texto e <strong>...:</strong> são removidos
    document.querySelectorAll(".cde-novo[data-cde-data]").forEach(function(el) {
      var h = horasDesde(el.getAttribute("data-cde-data"));
      if (h != null && h > janela) {
        el.classList.remove("cde-novo");
        el.removeAttribute("data-cde-rotulo");
        el.querySelectorAll("p").forEach(function(p) {
          var limpo = p.innerHTML.replace(/^\s*<strong>[^<]*:\s*<\/strong>\s*/i, '');
          if (limpo !== p.innerHTML) {
            p.innerHTML = limpo.charAt(0).toUpperCase() + limpo.slice(1);
          }
        });
      }
    });
  }

  // ---------- Boot ----------
  function processarPagina() {
    transformarInline();
    transformarBlocos();
    transformarRespostas();
    transformarExcluidos();
    transformarNovos();
    transformarListas();
    aplicarRegrasDe24h();
    ligarBotoes();
  }

  function init(opcoes) {
    opcoes = opcoes || {};
    Object.keys(opcoes).forEach(function(k) {
      if (k === "rotulos" && opcoes.rotulos) {
        config.rotulos = Object.assign({}, config.rotulos, opcoes.rotulos);
      } else {
        config[k] = opcoes[k];
      }
    });
    montarBotaoFlutuante();
    processarPagina();
  }

  // API pública
  var API = {
    init: init,
    config: config,
    rotulosPadrao: rotulosPadrao,
    registrar: function(correcoes) {
      if (!Array.isArray(correcoes)) correcoes = [correcoes];
      correcoes.forEach(function(c) { registro.push(c); });
      // Atualiza listas já renderizadas
      document.querySelectorAll("[data-cde-lista][data-cde-pronto]").forEach(function(c) {
        renderLista(c);
      });
    },
    renderLista: function(container) { renderLista(container); },
    abrirFormulario: abrirModal,
    fecharFormulario: fecharModal,
    reprocessar: processarPagina,
    definirEndpoint: function(url) { config.endpoint = url; },
    aoReportar: function(cb) { config.aoReportar = cb; }
  };
  global.CorrecaoDeErros = API;

  // Auto-init quando o DOM estiver pronto
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", processarPagina);
  } else {
    processarPagina();
  }
})(window);
