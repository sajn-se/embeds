# sajn embed SDK

Show the sajn signing page inside your own web application. Your server creates an embed session through the sajn API, and the SDK shows the signing page in an iframe on your page.

> **Beta.** 1.0 is in beta and published under the `beta` tag on npm. It can change in ways that break your integration before the first stable release, estimated for November 2026. Pin the exact version. For production, 0.x (embedding v1) is stable.

Full guide: [Embedded signing](https://docs.sajn.se/guides/embedding-v2/overview).

## Packages

| Package | Version | For |
|---------|---------|-----|
| [`@sajn/embed-js`](packages/vanilla) | 1.0.0-beta.1 | Any web page. Exports `createSigningEmbed`. |
| [`@sajn/embed-react`](packages/react) | 1.0.0-beta.1 | React 18 and 19. Exports `<SigningEmbed>`. |
| [`@sajn/embed-vue`](packages/vue) | 1.0.0-beta.1 | Vue 3.3 and later. Exports `<SigningEmbed>`. |
| [`@sajn/embed-react-native`](packages/react-native) | 1.0.0-beta.1 | React Native apps on iOS and Android. Exports `<SigningEmbed>`. |

The React and Vue packages wrap `@sajn/embed-js`.

## Before you begin

- sajn turns on embedded signing for each organization. Contact [hej@sajn.se](mailto:hej@sajn.se).
- Add the domains that show the signing page in the sajn app, under **Inställningar** > **Utvecklare** > **Inbäddning** (Settings > Developer > Embedding). `*.example.com` covers subdomains, not `example.com` itself.
- Create and send the document through the API, with the party's `delivery` set to `[]`.

## Create a session on your server

Call `POST /api/v1/embed-sessions` with your API key and API version `2026-10`, and return only the `clientSecret` to the browser:

```javascript
app.post("/api/sajn/embed-session", requireSignedInUser, async (req, res) => {
  const { documentId, partyId } = await findSigningForUser(req.user.id);

  const response = await fetch("https://app.sajn.se/api/v1/embed-sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SAJN_API_KEY}`,
      "Sajn-Version": "2026-10",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      documentId,
      partyId,
      origins: ["https://app.example.com"],
      features: { rejection: true },
    }),
  });
  const session = await response.json();
  if (!response.ok) return res.status(502).json({ message: session.userMessage });

  res.json({ clientSecret: session.clientSecret });
});
```

The SDK calls your endpoint again each time a session ends, so create a new session on every call. A client secret is redeemable for 10 minutes. A session ends after an hour without activity, and after 24 hours at most.

## Show the signing page

### JavaScript

```javascript
import { createSigningEmbed } from "@sajn/embed-js";

const embed = createSigningEmbed({
  container: document.getElementById("signing"),
  fetchClientSecret: async () => {
    const response = await fetch("/api/sajn/embed-session", { method: "POST" });
    if (!response.ok) throw new Error("Signing isn't available right now.");
    return (await response.json()).clientSecret;
  },
  onSigned: ({ documentId, partyId }) => console.log("Signed", documentId, partyId),
  onError: ({ code, message }) => console.error(code, message),
});

// Later
embed.destroy();
```

The React, Vue, and CDN examples use the same `fetchClientSecret` function.

### React

```tsx
import { SigningEmbed } from "@sajn/embed-react";

export const SigningPage = () => (
  <SigningEmbed
    fetchClientSecret={fetchClientSecret}
    style={{ height: "80vh" }}
    onSigned={(ids) => console.log("Signed", ids)}
  />
);
```

### Vue

```vue
<script setup lang="ts">
import { SigningEmbed } from "@sajn/embed-vue";
</script>

<template>
  <SigningEmbed
    :fetch-client-secret="fetchClientSecret"
    style="height: 80vh"
    @signed="(ids) => console.log('Signed', ids)"
  />
</template>
```

### CDN

Always pin the version:

```html
<script src="https://unpkg.com/@sajn/embed-js@1.0.0-beta.1/dist/index.umd.js"></script>
<script>
  sajn.createSigningEmbed({ container: document.getElementById("signing"), fetchClientSecret });
</script>
```

## Events

Events are hints. Confirm outcomes on your server with the `document.party.signed` webhook.

| Callback | Vue event | When |
|----------|-----------|------|
| `onReady` | `@ready` | The document rendered, and the party can act. |
| `onSigned` | `@signed` | The party signed. |
| `onRejected` | `@rejected` | The party rejected the document. Carries `reasonGiven`. |
| `onFieldsSubmitted` | `@fields-submitted` | The party submitted their form fields. |
| `onVerified` | `@verified` | The party passed the access check. |
| `onStateChange` | `@state-change` | The signing state changed. |
| `onResize` | `@resize` | The content height changed, in `inline` mode. |
| `onSessionExpired` | `@session-expired` | The session ended, and the SDK is fetching a new one. |
| `onError` | `@error` | An error occurred, with a `code` and a `message`. |

Every event except `onResize`, `onSessionExpired`, and `onError` carries `documentId`, `partyId`, and `externalId`. For the error codes, the appearance options, and troubleshooting, see the [full guide](https://docs.sajn.se/guides/embedding-v2/overview).

## Versions

1.0 is a new, session-based API. 0.x used the party's signing token and the v1 frame routes, and keeps working until sajn retires them, 12 months after v2 is generally available. To move from 0.x, see [Migrate from embed v1](https://docs.sajn.se/guides/embedding-v2/migrate-from-v1) and [CHANGELOG.md](CHANGELOG.md).

## Get help

Open an issue on GitHub for bugs or questions. Enterprise customers can also write to [dev@sajn.se](mailto:dev@sajn.se).
