# ThunderID Express Quickstart

<a href="https://stackblitz.com/fork/github/thunder-id/javascript-sdks/tree/main/samples/express/quickstart?file=.env" target="_blank"><img src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>

A minimal Express.js **API** protected by ThunderID access tokens, using the ThunderID JavaScript
SDK (`@thunderid/express`). Unlike the browser-focused quickstarts, this sample doesn't have a
sign-in button — it's a resource server. Open [http://localhost:3000](http://localhost:3000) and
you'll get API documentation (endpoints, curl examples, a downloadable Postman collection) instead
of a login screen.

Protected routes validate the `Authorization: Bearer <token>` header against ThunderID's OIDC
`/oauth2/userinfo` endpoint — the same check any OAuth 2.0 resource server performs. A `/login` →
`/token` helper is included purely so you have a fast way to mint a demo access token to test with.

## Prerequisites

- Node.js 18+
- A running ThunderID instance (default: `https://localhost:8090`)
- A configured application with `http://localhost:3000/login` added as an authorized redirect URI

## Getting started

1. Copy the environment file and fill in your values:
   ```sh
   cp .env.example .env
   ```

2. Edit `.env` with your application's credentials:
   ```
   THUNDERID_CLIENT_ID=<your-client-id>
   THUNDERID_CLIENT_SECRET=<your-client-secret>
   THUNDERID_BASE_URL=https://localhost:8090
   ```

3. Install dependencies and start the server:
   ```sh
   pnpm install
   pnpm start
   ```

Open [http://localhost:3000](http://localhost:3000) for the API documentation page.

## Trying the API

- `GET /api/public` — no auth required.
- `GET /api/protected`, `GET /api/me`, and `PATCH /api/me/credentials` — require `Authorization: Bearer <access_token>`.

To get a token to test with, open [http://localhost:3000/login](http://localhost:3000/login),
sign in once, and your access token (decoded claims included) will be shown at
[http://localhost:3000/token](http://localhost:3000/token). Then:

```sh
curl http://localhost:3000/api/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Prefer a GUI? Download the Postman collection from the API docs page (or directly at
`/postman-collection.json`), paste your token into the `accessToken` collection variable, and run
the requests from there.

## Learn more

- [ThunderID Docs](https://thunderid.dev/docs)
- [`@thunderid/express` SDK reference](https://thunderid.dev/docs/sdks/javascript/express)
