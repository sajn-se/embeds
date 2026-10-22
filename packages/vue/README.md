# @sajn/embed-vue

Show the sajn signing page in a Vue app. Your server creates an embed session through the sajn API, and `<SigningEmbed>` shows the signing page in an iframe. Works with Vue 3.3 and later.

> **Beta.** 1.0 is in beta and published under the `beta` tag on npm. It can change in ways that break your integration before the first stable release, estimated for November 2026. Pin the exact version. For production, 0.x (embedding v1) is stable.

## Install

```bash
npm install @sajn/embed-vue@1.0.0-beta.1
```

## Use

Your server calls `POST /api/v1/embed-sessions` and returns the `clientSecret`. In your app:

```vue
<script setup lang="ts">
import { SigningEmbed } from "@sajn/embed-vue";
import type { EmbedIds, SigningEmbedError } from "@sajn/embed-vue";

async function fetchClientSecret() {
  const response = await fetch("/api/sajn/embed-session", { method: "POST" });
  if (!response.ok) throw new Error("Signing isn't available right now.");
  return (await response.json()).clientSecret;
}

const onSigned = ({ documentId }: EmbedIds) => console.log("Signed", documentId);
const onError = ({ code, message }: SigningEmbedError) => console.error(code, message);
</script>

<template>
  <SigningEmbed
    :fetch-client-secret="fetchClientSecret"
    :appearance="{ colors: { primary: '#0f766e' } }"
    style="height: 80vh"
    @signed="onSigned"
    @error="onError"
  />
</template>
```

The component calls `fetchClientSecret` again each time a session ends, so your endpoint must create a new session on every call. A `class` or `style` attribute applies to the container, so give it a height there.

## Props and events

Props: `fetch-client-secret` (required), `host`, `appearance`, `locale`, `title`, and `fallback-height`.

Events: `@ready`, `@signed`, `@rejected`, `@fields-submitted`, `@verified`, `@state-change`, `@resize`, `@session-expired`, and `@error`.

A change to `appearance` or `locale` updates the open frame. `host`, `title`, and `fallback-height` are read when the component mounts. To apply a change to one of them, change the component's `key`.

## Documentation

[Embed signing with Vue](https://docs.sajn.se/guides/embedding-v2/vue) has the server step, a Nuxt example, the events, the appearance options, the error codes, and troubleshooting.
