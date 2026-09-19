# Plugin de correção de erros no jornalismo digital

**Uma biblioteca leve, autocontida e sem dependências para tornar visíveis, rastreáveis e classificadas as alterações feitas em matérias jornalísticas após a publicação.**

Disponível em português (`pt/`) e inglês (`en/`), com o mesmo comportamento e diferentes namespaces (`cde-*` / `ec-*`).

---

## Sobre a pesquisa

Este plugin de correção de erros é resultado da pesquisa **"Protocolo de gestão para correção de erros no jornalismo digital"** (nº PPP0014/2024 — Edital Fapesb/CNPq — Programa Primeiros Projetos 004/2023). Está em estado de protótipo funcional.

**Pesquisadora responsável:** Lívia de Souza Vieira ([livia.vieira@ufba.br](mailto:livia.vieira@ufba.br))

Contribuições, dúvidas e relatos de uso são bem-vindos via *issues* e *pull requests*. Para questões urgentes, prefira contato por e-mail.

---

## O que o plugin faz

O plugin oferece à redação um vocabulário visual e operacional pronto para lidar com oito situações editoriais recorrentes em jornalismo digital:

**Cinco tipos de erro** (todos exibidos como blocos colapsáveis, com diff antes/depois, permanentes no arquivo público):

| Tipo | Cor do selo | Situação típica |
|---|---|---|
| Erro factual | vermelho | Dado, número, atribuição ou local incorretos |
| Erro de grafia | índigo | Typo, ortografia, nome mal escrito |
| Correção por imprecisão | laranja | Formulação vaga ou número genérico substituído por cifra exata |
| Retificação em declaração | roxo | Fala transcrita mal capturada, corrigida a pedido da fonte |
| Outro | cinza | Catch-all para casos que não se encaixam acima |

**Três padrões além dos erros** (com comportamentos temporais específicos):

| Padrão | Cor | Comportamento |
|---|---|---|
| Direito de resposta | teal | Bloco permanente, com texto integral concedido judicialmente |
| Trecho excluído | cinza tracejado | Bloco visível por 24h; depois some por completo |
| Conteúdo novo | amarelo | Caixa amarela; após 24h, marcação some e texto fica no fluxo |

Além desses padrões, o plugin oferece:

- **Marcação inline** de trechos corrigidos no corpo da matéria, com tooltip;
- **Arquivo de correções** por cobertura, com filtros por tipo e recência;
- **Modal de comunicação de erro** pelo leitor, com formulário completo;
- **Botão flutuante opcional** para reportar erros;
- **Indicador automático "Nova"** nas primeiras 24 horas;
- **API programática** para integração com CMS que já mantém banco de correções;
- **Configuração e tradução completas** via `init()`.

---

## Instalação em três passos

### 1. Baixe os arquivos

Escolha o idioma:

- **Português:** `pt/cde.css` e `pt/cde.js`
- **Inglês:** `en/ec.css` e `en/ec.js`

### 2. Inclua no seu template

```html
<link rel="stylesheet" href="cde.css">
<!-- ... o conteúdo da página ... -->
<script src="cde.js"></script>
```

### 3. Use os atributos nas matérias

Exemplo mínimo de errata visível ao leitor:

```html
<div data-cde-bloco
     data-cde-tipo="factual"
     data-cde-titulo="Número de países que votaram a resolução"
     data-cde-motivo="A versão inicial informava 15 países; o correto é 14."
     data-cde-antes="Quinze países votaram a favor."
     data-cde-depois="Quatorze países votaram a favor."
     data-cde-data="2026-04-17T14:20:00-03:00">
</div>
```

Para todos os outros padrões (direito de resposta, trecho excluído, conteúdo novo, marcação inline, arquivo de correções, modal de comunicação de erro), abra o arquivo `pt/demo.html` (ou `en/demo.html`) — é ao mesmo tempo a demonstração visual e o manual de instalação, com exemplos completos.

---

## Configuração opcional

O plugin funciona automaticamente ao carregar. Para customizar, chame `CorrecaoDeErros.init()` (ou `ErrorCorrection.init()` na versão em inglês) antes do fim do `<body>`:

```html
<script>
  CorrecaoDeErros.init({
    endpoint: "/api/reportar-erro",     // URL para receber os comunicados
    janelaRecenteHoras: 24,             // Janela de "Nova" (padrão: 24h)
    botaoFlutuante: true,               // Botão flutuante de reportar erro
    posicaoBotao: "bottom-right",
    aoReportar: function(dados) {
      console.log("Erro reportado:", dados);
    },
    rotulos: {
      botaoReportar: "Comunicar erro",
      // ...demais rótulos, ver CorrecaoDeErros.rotulosPadrao
    }
  });
</script>
```

---

## Como o plugin foi feito

O plugin foi desenvolvido em parceria com **Claude Opus 4.7** (modelo de linguagem da Anthropic), a partir de prompts detalhados e iterações conversacionais. Cada decisão de design — a taxonomia dos tipos de erro, a lógica de expiração de 24 horas, a distinção entre correções permanentes e sinalizações transitórias — foi construída no diálogo, revisada e ajustada até chegar ao formato atual. O código-fonte é aberto, autocontido e sem dependências externas.

O uso de inteligência artificial na construção não é neutro nem oculto: a autoria intelectual do protocolo é da pesquisa; a ferramenta ajudou a materializá-lo em código funcional e portável.

---

## Compatibilidade

Testado nos navegadores modernos Chrome, Safari, Firefox e Edge (duas últimas versões), em desktop e mobile. Não requer bibliotecas externas — nem jQuery, nem qualquer framework.

---

## Como citar

Se você usar este plugin ou o protocolo em produção editorial, em pesquisa acadêmica, ou em material didático, cite a pesquisa que o originou:

```
VIEIRA, Lívia de Souza. Protocolo de gestão para correção de erros no
jornalismo digital. Salvador: Fapesb/CNPq, 2026. (Programa Primeiros
Projetos, Edital 004/2023, nº PPP0014/2024).
```

---

## Licença

Distribuído sob a licença **MIT** — veja [LICENSE](LICENSE) para os termos completos. Uso comercial e adaptação são permitidos, com atribuição.

---

## Instruções por idioma

- 🇧🇷 [Documentação em português](pt/README-pt.md)
- 🇺🇸 [English documentation](en/README-en.md)
