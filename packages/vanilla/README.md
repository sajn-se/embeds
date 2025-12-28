# @sajn/embed

Embed sajn's e-signature functionality directly into your applications using vanilla JavaScript.

## Installation

```bash
npm install @sajn/embed
```

Or via CDN:

```html
<script src="https://unpkg.com/@sajn/embed"></script>
```

## Quick Start

```html
<div id="signing"></div>
<script>
  sajn.embedSignDocument({
    element: '#signing',
    documentId: 'your-document-id',
    token: 'your-token',
    onSignerCompleted: (data) => console.log('Signed!', data),
    onSignerRejected: (data) => console.log('Rejected', data),
  });
</script>
```

Or as a Web Component:

```html
<sajn-sign-document
  document-id="your-document-id"
  token="your-token"
></sajn-sign-document>

<script>
  document.querySelector('sajn-sign-document')
    .addEventListener('signer-completed', (e) => console.log(e.detail));
</script>
```

## Documentation

For full documentation, events, and configuration options, see the [main README](https://github.com/sajn-se/embeds#readme).
