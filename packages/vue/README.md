# @sajn/embed-vue

Vue component for embedding sajn's e-signature functionality directly into your applications.

## Installation

```bash
npm install @sajn/embed-vue
```

## Quick Start

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

## Documentation

For full documentation, events, and configuration options, see the [main README](https://github.com/sajn-se/embeds#readme).
