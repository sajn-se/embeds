# @sajn/embed-react

Show the sajn signing page in a React app. Your server creates an embed session through the sajn API, and `<SigningEmbed>` shows the signing page in an iframe. Works with React 18 and 19.

> **Beta.** 1.0 is in beta and published under the `beta` tag on npm. It can change in ways that break your integration before the first stable release, estimated for November 2026. Pin the exact version. For production, 0.x (embedding v1) is stable.

## Install

```bash
npm install @sajn/embed-react@1.0.0-beta.2
```

## Use

Your server calls `POST /api/v1/embed-sessions` and returns the `clientSecret`. In your app:

```tsx
"use client";

import { SigningEmbed } from "@sajn/embed-react";

const fetchClientSecret = async () => {
  const response = await fetch("/api/sajn/embed-session", { method: "POST" });
  if (!response.ok) throw new Error("Signing isn't available right now.");
  return (await response.json()).clientSecret;
};

export const SigningPage = () => (
  <SigningEmbed
    fetchClientSecret={fetchClientSecret}
    appearance={{ colors: { primary: "#0f766e" } }}
    style={{ height: "80vh" }}
    onSigned={({ documentId }) => console.log("Signed", documentId)}
    onError={({ code, message }) => console.error(code, message)}
  />
);
```

The component calls `fetchClientSecret` again each time a session ends, so your endpoint must create a new session on every call. `className` and `style` apply to the container, so give it a height there.

## Props

`fetchClientSecret` (required), `host`, `appearance`, `locale`, `title`, `fallbackHeight`, `bootstrapTimeoutMs`, `openUrl`, `className`, and `style`, plus the callbacks `onReady`, `onSigned`, `onRejected`, `onFieldsSubmitted`, `onFieldsProgress`, `onFieldsChanged`, `onVerified`, `onStateChange`, `onResize`, `onSessionExpired`, and `onError`.

A change to `appearance` or `locale` updates the open frame. A change to `host`, `title`, `fallbackHeight`, or `bootstrapTimeoutMs`, or adding or removing `openUrl`, mounts a new frame with a new session. Callbacks are read from the latest render, so inline functions never reload the frame.

## Ref

Pass a `ref` typed `SigningEmbedHandle` to call `requestState()`, which asks the frame for a new state. The state arrives in `onStateChange`.

## Documentation

[Embed signing with React](https://docs.sajn.se/guides/embedding-v2/react) has the server step, a Next.js example, the events, the appearance options, the error codes, and troubleshooting.
