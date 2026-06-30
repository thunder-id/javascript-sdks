![ThunderID JavaScript SDK](https://raw.githubusercontent.com/thunder-id/thunderid/refs/heads/main/docs/static/assets/images/readme/repo-banner-javascript-sdk.png)

JavaScript ecosystem SDK for ThunderID. Framework-agnostic core library that powers the browser, Node.js, and other
platform-specific SDKs.

## Installation

```bash
npm install @thunderid/javascript
```

```bash
pnpm add @thunderid/javascript
```

```bash
yarn add @thunderid/javascript
```

## Browser SPAs and the sign-in flow

Initiating a sign-in flow directly from a **browser SPA** via `POST /flow/execute` — i.e. calling
`executeEmbeddedSignInFlow` with `applicationId` and `flowType` — is **not supported**. When this is attempted in a
browser, the SDK throws a `ThunderIDRuntimeError`.

Browser SPAs must use the redirect-based OAuth2 `authorization_code` + PKCE flow instead: configure your application for
the `authorization_code` grant with a registered `redirect_uri` and sign in via the redirect-based flow (for example
using `@thunderid/browser`'s `signIn()` or `@thunderid/react`'s `SignInButton`). See
[Register an application](https://thunderid.dev/guides/getting-started/register-an-application).

This does **not** affect:

- continuing an existing flow with an `executionId` (the path the hosted sign-in/Gate UI uses after the OAuth
  `/authorize` handler initiates the flow server-side), or
- server-side (confidential client) usage, where the flow may still be initiated directly.

## License

This project is licensed under the [Apache License 2.0](https://github.com/thunder-id/thunderid/blob/main/LICENSE).
