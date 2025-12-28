# @sajn/embed-react

React component for embedding sajn's e-signature functionality directly into your applications.

## Installation

```bash
npm install @sajn/embed-react
```

## Quick Start

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

## Documentation

For full documentation, events, and configuration options, see the [main README](https://github.com/sajn-se/embeds#readme).
