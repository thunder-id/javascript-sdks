# ThunderID Express Quickstart

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
- A configured application with `http://localhost:3000/login` added as an authorized redirect URI (see [Import ThunderID Resources](#import-thunderid-resources) below)

## Import ThunderID Resources

This sample ships with a `thunderid-config/` directory containing a declarative YAML file that creates the required user type and application in one step.

1. Open `thunderid-config/thunderid.env` and set your preferred values:
   ```bash
   EXPRESS_QUICKSTART_CLIENT_ID=EXPRESS_QUICKSTART
   EXPRESS_QUICKSTART_CLIENT_SECRET=<a strong secret>
   EXPRESS_QUICKSTART_REDIRECT_URIS=["http://localhost:3000/login"]
   ```
2. Import via the ThunderID Console (https://localhost:8090/console):
   - **First-time login**: a welcome screen appears with an **Open** button to upload the YAML file directly.
   - **Later**: access the same welcome screen from the user profile menu in the top-right corner of the console.

This creates the `Customer` user type and the `express-quickstart` application under the default organization unit.

## Getting started

1. Copy the environment file and fill in your values:
   ```sh
   cp .env.example .env
   ```

2. Edit `.env` with the credentials you set in `thunderid-config/thunderid.env`:
   ```
   THUNDERID_CLIENT_ID=EXPRESS_QUICKSTART
   THUNDERID_CLIENT_SECRET=<the EXPRESS_QUICKSTART_CLIENT_SECRET value>
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
- `GET /api/protected` and `GET /api/me` — require `Authorization: Bearer <access_token>`.

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
