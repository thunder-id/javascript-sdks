# ThunderID Next.js Quickstart

A minimal Next.js 15 App Router application demonstrating ThunderID authentication with OAuth 2.0, PKCE, and JWT out of the box.

## Prerequisites

- Node.js 18+
- pnpm
- A ThunderID application (see [Import ThunderID Resources](#import-thunderid-resources) below)

## Import ThunderID Resources

This sample ships with a `thunderid-config/` directory containing a declarative YAML file that creates the required user type and application in one step.

1. Open `thunderid-config/thunderid.env` and set your preferred values:

   ```bash
   NEXTJS_QUICKSTART_APPLICATION_ID=<uuid, e.g. generate with: uuidgen>
   NEXTJS_QUICKSTART_CLIENT_ID=NEXTJS_QUICKSTART
   NEXTJS_QUICKSTART_CLIENT_SECRET=<a strong secret>
   NEXTJS_QUICKSTART_REDIRECT_URIS=["http://localhost:3000"]
   ```

2. Import via the ThunderID Console ([https://localhost:8090/console](https://localhost:8090/console)):
   - **First-time login**: a welcome screen appears with an **Open** button to upload the YAML file directly.
   - **Later**: access the same welcome screen from the user profile menu in the top-right corner of the console.

This creates the `Customer` user type and the `nextjs-quickstart` application under the default organization unit. Note the `NEXTJS_QUICKSTART_APPLICATION_ID` value — unlike the client ID, this is a fixed id (not server-assigned) because it also drives the embedded sign-in/sign-up UI, so you'll copy it verbatim into `.env.local` below.

## Getting started

1. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in your ThunderID credentials in `.env.local`, using the values you set in `thunderid-config/thunderid.env`:

   ```
   NEXT_PUBLIC_THUNDERID_BASE_URL=https://localhost:8090
   NEXT_PUBLIC_THUNDERID_CLIENT_ID=NEXTJS_QUICKSTART
   NEXT_PUBLIC_THUNDERID_APPLICATION_ID=<the NEXTJS_QUICKSTART_APPLICATION_ID value>
   THUNDERID_CLIENT_SECRET=<the NEXTJS_QUICKSTART_CLIENT_SECRET value>
   THUNDERID_SECRET=<run: openssl rand -base64 32>
   ```

3. Start the development server:

   ```bash
   pnpm dev
   ```

   The app is now running at [http://localhost:3000](http://localhost:3000).
