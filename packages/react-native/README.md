# @sajn/embed-react-native

Embed sajn e-signing in an iOS or Android app. The package runs the signing page in a web view and opens eID pages and the BankID app for you.

> **Beta.** 1.0 is in beta and published under the `beta` tag on npm. It can change in ways that break your integration before the first stable release, estimated for November 2026. Pin the exact version. For production, 0.x (embedding v1) is stable.

```bash
npm install @sajn/embed-react-native@1.0.0-beta.2 react-native-webview
```

```tsx
import { SigningEmbed } from "@sajn/embed-react-native";

<SigningEmbed
  origin="https://app.example.com"
  fetchClientSecret={async () => (await fetch("https://api.example.com/sajn/embed-session", { method: "POST" }).then((r) => r.json())).clientSecret}
  onSigned={() => {}}
/>;
```

`origin` must match one of your organization's embed domains and the session's `origins`. Nothing is loaded from it.

Guide: [docs.sajn.se/guides/embedding-v2/react-native](https://docs.sajn.se/guides/embedding-v2/react-native)
