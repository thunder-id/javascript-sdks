# ThunderID Nuxt Quickstart

A minimal Nuxt 3 application demonstrating ThunderID authentication with OAuth 2.0, PKCE, and JWT out of the box.

## Prerequisites

- Node.js 18+
- pnpm
- A ThunderID application (see [Import ThunderID Resources](#import-thunderid-resources) below)

## Import ThunderID Resources

This sample ships with a `thunderid-config/` directory containing a declarative YAML file that creates the required user type and application in one step.

1. Open `thunderid-config/thunderid.env` and set your preferred values:

   ```bash
   NUXT_QUICKSTART_APPLICATION_ID=<uuid, e.g. generate with: uuidgen>
   NUXT_QUICKSTART_CLIENT_ID=NUXT_QUICKSTART
   NUXT_QUICKSTART_CLIENT_SECRET=<a strong secret>
   NUXT_QUICKSTART_REDIRECT_URIS=["http://localhost:3000/api/auth/callback"]
   ```

2. Import via the ThunderID Console ([https://localhost:8090/console](https://localhost:8090/console)):
   - **First-time login**: a welcome screen appears with an **Open** button to upload the YAML file directly.
   - **Later**: access the same welcome screen from the user profile menu in the top-right corner of the console.

This creates the `Customer` user type and the `nuxt-quickstart` application under the default organization unit. Note the `NUXT_QUICKSTART_APPLICATION_ID` value — unlike the client ID, this is a fixed id (not server-assigned) because it also drives the embedded sign-in UI, so you'll copy it verbatim into `.env` below.

## Getting started

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Fill in your ThunderID credentials in `.env`, using the values you set in `thunderid-config/thunderid.env`:

   ```
   NUXT_PUBLIC_THUNDERID_BASE_URL=https://localhost:8090
   NUXT_PUBLIC_THUNDERID_CLIENT_ID=NUXT_QUICKSTART
   NUXT_PUBLIC_THUNDERID_APPLICATION_ID=<the NUXT_QUICKSTART_APPLICATION_ID value>
   THUNDERID_CLIENT_SECRET=<the NUXT_QUICKSTART_CLIENT_SECRET value>
   THUNDERID_SESSION_SECRET=<run: openssl rand -base64 32>
   ```

3. Start the development server:

   ```bash
   pnpm dev
   ```

   The app is now running at [http://localhost:3000](http://localhost:3000).
