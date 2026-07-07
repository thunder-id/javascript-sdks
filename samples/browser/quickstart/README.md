# ThunderID Browser Quickstart

A minimal Vite + vanilla JS app demonstrating sign-in and sign-out with the ThunderID JavaScript SDK (`@thunderid/browser`).

## Prerequisites

- Node.js 18+
- A running ThunderID instance (default: `https://localhost:8090`)
- A configured application with an authorized redirect URI set to your app's origin (see [Import ThunderID Resources](#import-thunderid-resources) below)

## Import ThunderID Resources

This sample ships with a `thunderid-config/` directory containing a declarative YAML file that creates the required user type and application in one step.

1. Open `thunderid-config/thunderid.env` and set your preferred values:
   ```bash
   BROWSER_QUICKSTART_CLIENT_ID=BROWSER_QUICKSTART
   BROWSER_QUICKSTART_REDIRECT_URIS=["http://localhost:5173"]
   ```
2. Import via the ThunderID Console (https://localhost:8090/console):
   - **First-time login**: a welcome screen appears with an **Open** button to upload the YAML file directly.
   - **Later**: access the same welcome screen from the user profile menu in the top-right corner of the console.

This creates the `Customer` user type and the `browser-quickstart` application under the default organization unit.

## Getting started

1. Copy the environment file and fill in your values:
   ```sh
   cp .env.example .env
   ```

2. Edit `.env` with the credentials you set in `thunderid-config/thunderid.env`:
   ```
   VITE_THUNDERID_CLIENT_ID=BROWSER_QUICKSTART
   VITE_THUNDERID_BASE_URL=https://localhost:8090
   ```

3. Install dependencies and start the dev server:
   ```sh
   pnpm install
   pnpm dev
   ```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Learn more

- [ThunderID Docs](https://thunderid.dev/docs)
- [`@thunderid/browser` SDK reference](https://thunderid.dev/docs/sdks/javascript/browser)
