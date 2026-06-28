# ThunderID Next.js Quickstart

A minimal Next.js 15 App Router application demonstrating ThunderID authentication with OAuth 2.0, PKCE, and JWT out of the box.

## Prerequisites

- Node.js 18+
- pnpm
- A ThunderID application (create one at [thunderid.dev](https://thunderid.dev))

## Getting started

1. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in your ThunderID credentials in `.env.local`:

   ```
   NEXT_PUBLIC_THUNDERID_BASE_URL=https://localhost:8090
   NEXT_PUBLIC_THUNDERID_CLIENT_ID=<your-client-id>
   THUNDERID_CLIENT_SECRET=<your-client-secret>
   THUNDERID_SECRET=<run: openssl rand -base64 32>
   ```

3. In your ThunderID application settings, add the following as an authorized redirect URL:

   ```
   http://localhost:3000
   ```

4. Start the development server:

   ```bash
   pnpm dev
   ```

   The app is now running at [http://localhost:3000](http://localhost:3000).
