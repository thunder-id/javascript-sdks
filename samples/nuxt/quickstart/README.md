# ThunderID Nuxt Quickstart

A minimal Nuxt 3 application demonstrating ThunderID authentication with OAuth 2.0, PKCE, and JWT out of the box.

## Prerequisites

- Node.js 18+
- pnpm
- A ThunderID application (create one at [thunderid.dev](https://thunderid.dev))

## Getting started

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Fill in your ThunderID credentials in `.env`:

   ```
   NUXT_PUBLIC_THUNDERID_BASE_URL=https://localhost:8090
   NUXT_PUBLIC_THUNDERID_CLIENT_ID=<your-client-id>
   THUNDERID_CLIENT_SECRET=<your-client-secret>
   THUNDERID_SESSION_SECRET=<run: openssl rand -base64 32>
   ```

3. In your ThunderID application settings, add the following as an authorized redirect URL:

   ```
   http://localhost:3000/api/auth/callback
   ```

4. Start the development server:

   ```bash
   pnpm dev
   ```

   The app is now running at [http://localhost:3000](http://localhost:3000).
