# Changelog

All four packages, `@sajn/embed-js`, `@sajn/embed-react`, `@sajn/embed-vue`, and `@sajn/embed-react-native`, share one version.

## 1.0.0-beta.2

1.0 is still in beta and published under the `beta` tag on npm. 0.x stays on `latest` and is the stable embed.

### Breaking changes

- `appearance.signIntro` and `appearance.labels` are removed. The heading, the attestation, the instruction, and the sign button's wording are the same as on the sajn signing page, and a host can't change them. The frame ignores both keys, so a host that still sends them keeps working, but the types no longer accept them.
- `EmbedReady.loadMs` is always present. Every v2 frame sends it.

### Added

- `bootstrapTimeoutMs` and `openUrl` props in `@sajn/embed-react` and `@sajn/embed-vue`.
- `requestState()` in `@sajn/embed-react`, through a ref typed `SigningEmbedHandle`, and in `@sajn/embed-vue`, through a template ref.
- `EmbedReady` is exported from `@sajn/embed-react` and `@sajn/embed-vue`.

### Fixed

- `bootstrap_timeout` also fires when `fetchClientSecret` doesn't resolve, and when the frame doesn't load. Before, the timer started at the frame's `load` event.

## 1.0.0-beta.1

1.0 is in beta and published under the `beta` tag on npm, so `latest` stays on 0.x. It can change in ways that break your integration before the first stable release, estimated for November 2026.

1.0 is a new, session-based API for embedded signing. It talks to the v2 frame (`/embed/v2/{sessionId}`) and needs embed sessions from `POST /api/v1/embed-sessions`, API version `2026-10`.

0.x keeps working against the v1 frame routes until sajn retires them, 12 months after v2 is generally available. sajn announces the date. If you load 0.x from a CDN, pin it, such as `https://unpkg.com/@sajn/embed-js@0.1.8`, because once 1.0 is stable, a URL without a version loads 1.0.

Migration guide: [Migrate from embed v1](https://docs.sajn.se/guides/embedding-v2/migrate-from-v1).

### Breaking changes

- The party's signing token no longer reaches the browser. Your server creates an embed session and returns its `clientSecret`, and the SDK takes a `fetchClientSecret` function instead of the `token` and `documentId` options.
- `embedSignDocument` is replaced by `createSigningEmbed({ container, fetchClientSecret })`. `container` takes an `HTMLElement`, not a CSS selector. In React and Vue, `EmbedSignDocument` is replaced by `SigningEmbed`.
- Features move to the server. `allowDocumentRejection` is now `features.rejection` on the session, and `signatureInputModes` is a session field with uppercase values (`DRAW`, `TYPE`, `UPLOAD`).
- `cssVars` is replaced by `appearance.colors`, with hex colors only. `appearance` also takes `radius`, `fontFamily`, `colorScheme`, `mode`, and `signIntro`. Color pairs must meet a 4.5:1 contrast ratio.
- `language` is renamed to `locale`, and the default is now the document's language.
- Callbacks are renamed: `onDocumentReady` to `onReady`, `onSignerCompleted` to `onSigned`, `onVariablesSubmitted` to `onFieldsSubmitted`, `onSignerRejected` to `onRejected`, and `onDocumentError` to `onError`. Vue events change the same way, such as `@signer-completed` to `@signed`.
- Event data uses API names: `signerId` is now `partyId`, `token` is removed, and `externalId` is added. `onRejected` carries `reasonGiven` instead of the reason text, and `onSigned` has no `failed` field.
- Renamed: `embedViewDocument` and `EmbedViewDocument` are `createViewingEmbed` and `ViewingEmbed`. The Web Components `<sajn-sign-document>` and `<sajn-view-document>` are `<sajn-signing-embed>` and `<sajn-viewing-embed>`. `showScrollIndicator` and `showDocumentId` are `appearance.scrollIndicator` and `appearance.documentId`.
- Removed: `className` in `@sajn/embed-js` (style the container) and `additionalProps` (every option is typed).

### Added

- `onVerified`, `onStateChange`, `onResize`, and `onSessionExpired` callbacks.
- `update({ appearance, locale })` and `requestState()` on the object that `createSigningEmbed` returns. `update` merges `appearance.colors` per key, so setting one color keeps the others.
- `appearance.mode`: `fixed` (default) fills the container and scrolls inside, and `inline` grows the frame to its content.
- `onReady` fires when the first page is on screen, and carries `loadMs`: the time from the frame's navigation to that first page.
- The SDK opens the connection to sajn while `fetchClientSecret` runs, so the frame starts loading sooner.
- Automatic session renewal: when a session ends, the SDK calls `fetchClientSecret` again. When the frame reloads, the SDK handshakes again and resends its overrides.
- `@sajn/embed-react-native`: a `SigningEmbed` for iOS and Android apps, on `react-native-webview`. eID pages and the BankID app open through `Linking`, or your own `openUrl`.
- `openUrl` option: opens eID pages and the BankID app link yourself, where the frame can't open a window.
- Read-only viewing: `ViewingEmbed` in React and Vue, and `createViewingEmbed`, for a session created with `type: "viewing"`.
- Web Components: `<sajn-signing-embed>` and `<sajn-viewing-embed>`, with a `client-secret-url` attribute and DOM events.
- `onFieldsProgress` and `onFieldsChanged`. `onFieldsChanged` carries typed values only, never eID-verified ones.
- `appearance.header`, `appearance.scrollIndicator`, `appearance.documentId`, and `appearance.labels.signButton`.
- Typed error codes in `onError`, including `bootstrap_timeout` when the frame doesn't answer and `client_secret_failed` when `fetchClientSecret` fails.
- Every message is checked against the sajn origin and the session ID, and the SDK posts only to the sajn origin.
