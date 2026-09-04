![ThunderID Browser SDK](https://raw.githubusercontent.com/thunder-id/thunderid/refs/heads/main/docs/static/assets/images/readme/repo-banner-better-auth.png)

ThunderID provider helper for the [Better Auth](https://better-auth.com)
[Generic OAuth plugin](https://better-auth.com/docs/plugins/generic-oauth).

This is a
[community provider helper](https://better-auth.com/docs/authentication/other-social-providers#community-provider-helpers):
it returns a typed `GenericOAuthConfig` for a ThunderID issuer. All OAuth 2.0 / OIDC handling is performed by Better
Auth itself — this package only supplies configuration, so there is no ThunderID SDK dependency and no protocol logic to
keep in sync.

## Pre-requisites

- Requires `better-auth` >= 1.7.0 as a peer dependency.
- A running ThunderID instance with an OAuth 2.0 / OIDC application registered. See the
  [ThunderID documentation](https://thunderid.dev/) for details.

## Installation

```bash
npm install @thunderid/better-auth
```

## Usage

```ts
import {thunderid} from '@thunderid/better-auth';
import {betterAuth} from 'better-auth';
import {genericOAuth} from 'better-auth/plugins';

export const auth = betterAuth({
  plugins: [
    genericOAuth({
      config: [
        thunderid({
          clientId: process.env.THUNDERID_CLIENT_ID!,
          clientSecret: process.env.THUNDERID_CLIENT_SECRET!,
          issuer: process.env.THUNDERID_ISSUER!,
        }),
      ],
    }),
  ],
});
```

Use your existing Better Auth client, or create one. No client plugin is required, since the generic OAuth plugin
exposes sign-in through the standard social-provider API:

```ts
import {createAuthClient} from 'better-auth/react';

export const authClient = createAuthClient();
```

Sign in from the client with the `thunderid` provider ID:

```ts
await authClient.signIn.social({
  provider: 'thunderid',
  callbackURL: '/dashboard',
});
```

## Callback URL

Register this redirect URI on your ThunderID application:

```
{baseURL}/api/auth/callback/thunderid
```

For example, `http://localhost:3000/api/auth/callback/thunderid` in development.

## Options

| Option                  | Type       | Default                          | Description                                                                                                                                                                                                                                 |
| ----------------------- | ---------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `issuer`                | `string`   | —                                | **Required.** ThunderID issuer URL, e.g. `https://thunderid.example.com`. A trailing slash is trimmed. The OIDC discovery URL is derived as `{issuer}/.well-known/openid-configuration`, so all endpoints come from the discovery document. |
| `clientId`              | `string`   | —                                | **Required.** OAuth client ID.                                                                                                                                                                                                              |
| `clientSecret`          | `string`   | —                                | OAuth client secret. Omit for public clients using `tokenEndpointAuth: {method: 'none'}`.                                                                                                                                                   |
| `scopes`                | `string[]` | `['openid', 'profile', 'email']` | Requested scopes.                                                                                                                                                                                                                           |
| `tokenEndpointAuth`     | `object`   | provider default                 | Token endpoint authentication method, e.g. `{method: 'client_secret_post'}`.                                                                                                                                                                |
| `pkce`                  | `boolean`  | discovery default                | Force PKCE on or off.                                                                                                                                                                                                                       |
| `redirectURI`           | `string`   | Better Auth default              | Override the callback URL.                                                                                                                                                                                                                  |
| `endSessionEndpoint`    | `string`   | discovery default                | RP-initiated logout endpoint.                                                                                                                                                                                                               |
| `postLogoutRedirectURI` | `string`   | —                                | Where ThunderID returns the user after logout.                                                                                                                                                                                              |
| `disableProviderLogout` | `boolean`  | `false`                          | Skip provider logout on sign-out.                                                                                                                                                                                                           |
| `disableImplicitSignUp` | `boolean`  | `false`                          | Require an explicit sign-up request before creating a user.                                                                                                                                                                                 |
| `disableSignUp`         | `boolean`  | `false`                          | Reject sign-in for users who do not already exist.                                                                                                                                                                                          |
| `overrideUserInfo`      | `boolean`  | `false`                          | Refresh the stored user profile from ThunderID on every sign-in.                                                                                                                                                                            |

Every option other than `issuer` is passed through from Better Auth's
[`BaseOAuthProviderOptions`](https://better-auth.com/docs/authentication/other-social-providers#built-in-provider-helpers)
and behaves exactly as it does for the built-in provider helpers.

## License

This project is licensed under the [Apache License 2.0](https://github.com/thunder-id/thunderid/blob/main/LICENSE).
