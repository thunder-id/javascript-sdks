# ThunderID React Quickstart

A minimal React + Vite application demonstrating ThunderID authentication with OAuth 2.0, PKCE, and JWT support using the `@thunderid/react` SDK.

## Prerequisites

- Node.js 18+
- pnpm
- A ThunderID application (see [Import ThunderID Resources](#import-thunderid-resources) below)

## Import ThunderID Resources

This sample ships with a `thunderid-config/` directory containing a declarative YAML file that creates the required user type and application in one step.

1. Open `thunderid-config/thunderid.env` and set your preferred values:
   ```bash
   REACT_QUICKSTART_CLIENT_ID=REACT_QUICKSTART
   REACT_QUICKSTART_REDIRECT_URIS=["http://localhost:5173"]
   ```
2. Import via the ThunderID Console (https://localhost:8090/console):
   - **First-time login**: a welcome screen appears with an **Open** button to upload the YAML file directly.
   - **Later**: access the same welcome screen from the user profile menu in the top-right corner of the console.

This creates the `Customer` user type and the `react-quickstart` application under the default organization unit.

## Setup

1. Copy the environment template:
   ```sh
   cp .env.example .env
   ```

2. Fill in your ThunderID credentials in `.env`, using the values you set in `thunderid-config/thunderid.env`:
   ```
   VITE_THUNDERID_CLIENT_ID=REACT_QUICKSTART
   VITE_THUNDERID_BASE_URL=https://your-thunderid-instance
   ```

3. Install dependencies and start the dev server:
   ```sh
   pnpm install
   pnpm dev
   ```

The app will be available at `http://localhost:5173`.

## Docs

Full SDK reference: [thunderid.dev/docs](https://thunderid.dev/docs)
