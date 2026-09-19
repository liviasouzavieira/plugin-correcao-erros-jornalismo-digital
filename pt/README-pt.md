# Plugin de correção de erros — versão em português

Este diretório contém a versão em português do plugin. O namespace de classes CSS e atributos HTML é `cde-*` (**c**orreção **d**e **e**rros).

## Arquivos

| Arquivo | O que é |
|---|---|
| `cde.css` | Estilos do plugin — inclua no `<head>` do template |
| `cde.js` | Comportamento do plugin — inclua antes do `</body>` |
| `demo.html` | Demonstração completa + documentação interna com exemplos de todos os padrões |

## Instalação rápida

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <link rel="stylesheet" href="cde.css">
</head>
<body>
  <!-- ... conteúdo da matéria ... -->
  <script src="cde.js"></script>
</body>
</html>
```

Assim que os arquivos estiverem carregados, o plugin varre a página automaticamente à procura dos atributos `data-cde-*` e transforma cada um deles no componente visual correspondente.

## Atributos disponíveis

### Marcação inline de trecho corrigido

```html
<span data-cde-inline
      data-cde-antes="Quinze países votaram a favor"
      data-cde-motivo="Correção: eram 14 votos, não 15.">
  Quatorze países votaram a favor
</span>
```

### Bloco de errata

```html
<div data-cde-bloco
     data-cde-tipo="factual"
     data-cde-titulo="Título curto da correção"
     data-cde-motivo="Explicação do que foi corrigido"
     data-cde-antes="Trecho original"
     data-cde-depois="Trecho corrigido"
     data-cde-data="2026-04-17T14:20:00-03:00">
</div>
```

Valores válidos de `data-cde-tipo`: `factual`, `grafia`, `imprecisao`, `declaracao`, `outro`.

### Direito de resposta (permanente)

```html
<div data-cde-resposta
     data-cde-de="Senador X"
     data-cde-decisao="8ª Vara Cível · proc. nº ..."
     data-cde-data="2026-04-17T16:45:00-03:00"
     data-cde-introducao="Em cumprimento à decisão..."
     data-cde-texto="Esclareço que minha fala foi extraída de contexto..."
     data-cde-rodape="Texto publicado em sua íntegra, sem edição editorial.">
</div>
```

### Trecho excluído (some após 24h)

```html
<div data-cde-excluido
     data-cde-motivo="inverificabilidade"
     data-cde-marcado-por="Editor de Internacional"
     data-cde-data="2026-04-17T15:10:00-03:00"
     data-cde-explicacao="A primeira versão atribuía a fontes anônimas..."
     data-cde-original="Segundo fontes anônimas...">
</div>
```

### Conteúdo novo (marcação some após 24h, texto fica)

```html
<div data-cde-novo data-cde-data="2026-04-17T14:20:00-03:00">
  <p><strong>Atualização (14:20):</strong> conteúdo novo aqui...</p>
</div>
```

### Arquivo agregado de correções

```html
<div data-cde-lista
     data-cde-titulo="Correções desta cobertura"
     data-cde-subtitulo="Lista auditável de todas as correções.">
</div>
```

### Botão de comunicar erro

```html
<button data-cde-abrir-form class="cde-botao-reportar">
  Comunicar erro
</button>
```

## Configuração avançada

Ver a seção 10 dentro de `demo.html` para todas as opções de `CorrecaoDeErros.init()`.

## Suporte

Reporte problemas ou sugestões via *issues* no repositório principal.
