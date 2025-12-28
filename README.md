# sajn Embed

Embed sajn's e-signature functionality directly into your applications.

## Packages

| Package | Install |
|---------|---------|
| Vanilla JS | `npm install @sajn/embed` |
| React | `npm install @sajn/embed-react` |
| Vue | `npm install @sajn/embed-vue` |

## Usage

### Vanilla JS

```html
<script src="https://unpkg.com/@sajn/embed"></script>
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

### React

```tsx
import { EmbedSignDocument } from '@sajn/embed-react';

function App() {
  return (
    <EmbedSignDocument
      documentId="your-document-id"
      token="your-token"
      onSignerCompleted={(data) => console.log('Signed!', data)}
      onSignerRejected={(data) => console.log('Rejected', data)}
    />
  );
}
```

### Vue

```vue
<script setup>
import { EmbedSignDocument } from '@sajn/embed-vue';

function handleComplete(data) {
  console.log('Signed!', data);
}
</script>

<template>
  <EmbedSignDocument
    document-id="your-document-id"
    token="your-token"
    @signer-completed="handleComplete"
    @signer-rejected="(data) => console.log('Rejected', data)"
  />
</template>
```

## Events

| Event | Description |
|-------|-------------|
| `documentReady` | Iframe has loaded and is ready |
| `signerCompleted` | Signer has completed signing. Data includes `token`, `documentId`, `signerId`, and optionally `failed` (failure reason if signing failed) |
| `signerRejected` | Signer has rejected the document. Data includes `token`, `documentId`, `signerId`, and `reason` |
| `documentError` | An error occurred |

## Getting Help

Open an issue on GitHub for bugs or questions. Enterprise customers can contact us directly at dev@sajn.se