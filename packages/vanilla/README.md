# @sajn/embed-js

Show the sajn signing page in any web page. Your server creates an embed session through the sajn API, and `createSigningEmbed` shows the signing page in an iframe.

> **Beta.** 1.0 is in beta and published under the `beta` tag on npm. It can change in ways that break your integration before the first stable release, estimated for November 2026. Pin the exact version. For production, 0.x (embedding v1) is stable.

## Install

```bash
npm install @sajn/embed-js@1.0.0-beta.1
```

Or load the UMD bundle, which exposes the `sajn` global. Always pin the version:

```html
<script src="https://unpkg.com/@sajn/embed-js@1.0.0-beta.1/dist/index.umd.js"></script>
```

## Use

Your server calls `POST /api/v1/embed-sessions` and returns the `clientSecret`. In the page:

```javascript
import { createSigningEmbed } from "@sajn/embed-js";

const embed = createSigningEmbed({
  container: document.getElementById("signing"),
  fetchClientSecret: async () => {
    const response = await fetch("/api/sajn/embed-session", { method: "POST" });
    if (!response.ok) throw new Error("Signing isn't available right now.");
    return (await response.json()).clientSecret;
  },
  appearance: { colors: { primary: "#0f766e" }, radius: 8 },
  locale: "en",
  onSigned: ({ documentId, partyId }) => console.log("Signed", documentId, partyId),
  onError: ({ code, message }) => console.error(code, message),
});
```

The SDK calls `fetchClientSecret` again each time a session ends, so your endpoint must create a new session on every call. In `fixed` mode, the default, give the container a height.

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `container` | Required | The `HTMLElement` the frame fills. |
| `fetchClientSecret` | Required | Returns a new `clientSecret` from your server. |
| `host` | `https://app.sajn.se` | The sajn host. |
| `appearance` | None | Cosmetic values on top of the session's appearance. |
| `locale` | The session's locale | `sv`, `en`, `no`, `da`, `fi`, `de`, `is`, `es`, `fr`, or `it`. |
| `title` | `Signera dokument` | The frame's accessible name. |
| `fallbackHeight` | `600px` | The frame's height in `fixed` mode when the container has no height. |
| `bootstrapTimeoutMs` | `10000` | How long to wait for the frame before `bootstrap_timeout`. |

Callbacks: `onReady`, `onSigned`, `onRejected`, `onFieldsSubmitted`, `onVerified`, `onStateChange`, `onResize`, `onSessionExpired`, and `onError`.

## Methods

`createSigningEmbed` returns:

- `update({ appearance, locale })`: changes the appearance or the language without reloading the frame.
- `requestState()`: asks the frame for a new state, which arrives in `onStateChange`.
- `destroy()`: removes the frame.

## Documentation

[Embed signing with JavaScript](https://docs.sajn.se/guides/embedding-v2/vanilla-js) has the server step, the events, the appearance options, the error codes, and troubleshooting.
