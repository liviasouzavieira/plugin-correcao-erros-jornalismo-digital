# Error correction plugin — English version

This directory contains the English version of the plugin. The CSS class and HTML attribute namespace is `ec-*` (**e**rror **c**orrection).

## Files

| File | What it is |
|---|---|
| `ec.css` | Plugin styles — include in the `<head>` of your template |
| `ec.js` | Plugin behavior — include before `</body>` |
| `demo.html` | Full demo + inline documentation with examples of every pattern |

## Quick install

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="stylesheet" href="ec.css">
</head>
<body>
  <!-- ... story content ... -->
  <script src="ec.js"></script>
</body>
</html>
```

Once the files are loaded, the plugin scans the page automatically for `data-ec-*` attributes and turns each one into the matching visual component.

## Available attributes

### Inline correction marker

```html
<span data-ec-inline
      data-ec-before="Fifteen countries voted in favor"
      data-ec-reason="Correction: 14 votes, not 15.">
  Fourteen countries voted in favor
</span>
```

### Correction block

```html
<div data-ec-block
     data-ec-type="factual"
     data-ec-title="Correct number of votes"
     data-ec-reason="The initial version stated 15 countries; the correct number is 14."
     data-ec-before="Fifteen countries voted in favor."
     data-ec-after="Fourteen countries voted in favor."
     data-ec-date="2026-04-17T14:20:00-04:00">
</div>
```

Valid values for `data-ec-type`: `factual`, `spelling`, `imprecision`, `statement`, `other`.

### Right of reply (permanent)

```html
<div data-ec-reply
     data-ec-from="Senator X"
     data-ec-ruling="U.S. District Court for D.C. · case no. ..."
     data-ec-date="2026-04-17T16:45:00-04:00"
     data-ec-intro="In compliance with the court order..."
     data-ec-text="I want to make clear that my remarks were taken out of context..."
     data-ec-footer="Published in full, without editorial revision.">
</div>
```

### Removed passage (vanishes after 24h)

```html
<div data-ec-removed
     data-ec-reason="unverifiability"
     data-ec-flagged-by="World Desk Editor"
     data-ec-date="2026-04-17T15:10:00-04:00"
     data-ec-explanation="The first version attributed to anonymous sources..."
     data-ec-original="According to anonymous sources...">
</div>
```

### New content (marking vanishes after 24h, text stays)

```html
<div data-ec-new data-ec-date="2026-04-17T14:20:00-04:00">
  <p><strong>Update (2:20 p.m.):</strong> new content here...</p>
</div>
```

### Aggregated corrections archive

```html
<div data-ec-list
     data-ec-title="Corrections in this coverage"
     data-ec-subtitle="Auditable list of every correction applied.">
</div>
```

### Report-error button

```html
<button data-ec-open-form class="ec-report-button">
  Report an error
</button>
```

## Advanced configuration

See section 10 inside `demo.html` for all options of `ErrorCorrection.init()`.

## Support

Report issues or suggestions via *issues* on the main repository.
