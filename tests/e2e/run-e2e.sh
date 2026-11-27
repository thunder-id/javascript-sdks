#!/usr/bin/env bash
# Copyright 2025 The ThunderID Authors
# SPDX-License-Identifier: Apache-2.0
#
# run-e2e.sh - Local E2E test runner for javascript-sdks.
#
# Downloads the latest ThunderID release distribution (this repo can't build the backend from
# source — that lives in thunder-id/thunderid), bootstraps it, imports each sample app's OAuth2
# client declaratively, builds the SDK packages under test, fetches the quickstarts from
# thunder-id/samples and wires them to those packages (scripts/prepare-samples.ts), starts all six
# sample apps on their assigned ports, and runs the Playwright suite. Mirrors thunder-id/thunderid/tests/e2e/run-e2e.sh
# as closely as a cross-repo setup allows — same setup.sh/start.sh/health-check/import sequence.
#
# Usage:
#   ./run-e2e.sh [playwright-args...]
#
# Requirements: curl, jq, unzip, pnpm, lsof, git
#
# The quickstarts come from thunder-id/samples main by default. Set THUNDERID_SAMPLES_REF to test
# against another branch or tag, or THUNDERID_SAMPLES_DIR to use a local samples checkout.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DIST_HOME=""
SERVER_PORT=8090

ADMIN_USER="${ADMIN_USERNAME:-admin}"
ADMIN_PASS="${ADMIN_PASSWORD:-admin}"
ADMIN_TOKEN=""
SAMPLES_DIR="$SCRIPT_DIR/.samples"

kill_port() {
    lsof -ti tcp:"$1" | xargs kill -9 2>/dev/null || true
}

wait_for_url() {
    local url="$1" label="$2" i=0
    echo "Waiting for $label at $url..."
    while [ $i -lt 60 ]; do
        if curl -skf "$url" > /dev/null 2>&1; then
            echo "$label is ready."
            return 0
        fi
        i=$((i + 1))
        sleep 2
    done
    echo "ERROR: $label did not become ready after 120s."
    return 1
}

cleanup() {
    echo "Cleaning up..."
    kill_port "$SERVER_PORT"
    kill_port 5173
    kill_port 5174
    kill_port 5175
    kill_port 3000
    kill_port 3001
    kill_port 3002
    rm -rf "$SCRIPT_DIR/thunderid" "$SCRIPT_DIR/.npx-thunderid-home" "$SCRIPT_DIR/distribution"
}
trap cleanup EXIT

# Resolves the release asset name for the current platform, e.g. thunderid-1.0.0-beta2-macos-arm64.
# Only used by the THUNDERID_VERSION debug-pin fallback below: npx thunderid detects the platform
# itself for the normal, always-latest path.
resolve_platform() {
    local os arch
    case "$(uname -s)" in
        Darwin) os="macos" ;;
        Linux) os="linux" ;;
        *) echo "ERROR: Unsupported OS $(uname -s)"; exit 1 ;;
    esac
    case "$(uname -m)" in
        arm64|aarch64) arch="arm64" ;;
        x86_64) arch="x64" ;;
        *) echo "ERROR: Unsupported architecture $(uname -m)"; exit 1 ;;
    esac
    echo "${os}-${arch}"
}

# Installs, sets up, and starts a ThunderID server.
#
# The normal path delegates entirely to `npx thunderid`: it resolves the latest release itself, no
# GitHub API or thunderid.dev calls of our own and no version pinned in this repo, downloads it for
# the current platform, and runs setup.sh non-interactively (admin credentials passed through via
# THUNDERID_ADMIN_* env vars). It always finishes by trying to attach its interactive REPL, which
# needs a real TTY and fails in a script; that is expected, so its exit code is ignored below. npx
# thunderid already health-checked the server it started before that point, so we only start it
# ourselves with `start.sh` if it isn't actually reachable (e.g. the REPL failure tore it down)
# instead of racing a second instance onto the same port. A scratch HOME is used for that one
# invocation so it can't see, or reuse, a version already active from a developer's own separate
# `npx thunderid` use on this machine, guaranteeing a fresh "no active version" state and therefore
# the true latest release every run.
#
# THUNDERID_VERSION pins an exact version instead (e.g. to reproduce a specific nightly failure).
# npx thunderid has no flag to target an explicit non-latest version, so that path downloads the
# release zip directly.
download_and_start_server() {
    if [ -n "${THUNDERID_VERSION:-}" ]; then
        local platform dist_folder asset_name download_url

        platform=$(resolve_platform)
        dist_folder="thunderid-${THUNDERID_VERSION}-${platform}"
        asset_name="${dist_folder}.zip"
        download_url="https://github.com/thunder-id/thunderid/releases/download/v${THUNDERID_VERSION}/${asset_name}"

        DIST_HOME="$SCRIPT_DIR/distribution"
        rm -rf "$DIST_HOME"
        mkdir -p "$DIST_HOME"

        echo "Downloading ThunderID ${THUNDERID_VERSION} (${platform})..."
        curl -sL "$download_url" -o "$SCRIPT_DIR/${asset_name}"
        unzip -q "$SCRIPT_DIR/${asset_name}" -d "$SCRIPT_DIR/distribution-tmp"
        mv "$SCRIPT_DIR/distribution-tmp/${dist_folder}/"* "$DIST_HOME/"
        rm -rf "$SCRIPT_DIR/distribution-tmp" "$SCRIPT_DIR/${asset_name}"

        echo "Running setup..."
        (cd "$DIST_HOME" && chmod +x setup.sh start.sh && ./setup.sh --admin-username "$ADMIN_USER" --admin-password "$ADMIN_PASS")
    else
        echo "Installing and setting up the latest ThunderID release via npx..."
        rm -rf "$SCRIPT_DIR/thunderid" "$SCRIPT_DIR/.npx-thunderid-home"
        mkdir -p "$SCRIPT_DIR/.npx-thunderid-home"
        # Redirecting stdin to /dev/null isn't enough to stop npx thunderid's REPL from taking
        # over: bubbletea opens /dev/tty directly, which exists and is fully usable regardless of
        # this process's own stdin — so when this script is run from an actual interactive
        # terminal (the normal case), the REPL attaches for real and blocks forever waiting for
        # keystrokes nothing ever sends. `perl -MPOSIX -e 'setsid()'` detaches the child into a new
        # session with no controlling terminal at all, so /dev/tty has nothing to open and
        # bubbletea fails immediately instead — the same expected, ignored failure this function's
        # comment above describes. perl ships on both macOS and Linux, unlike setsid(1), which
        # macOS doesn't have.
        (cd "$SCRIPT_DIR" && \
            HOME="$SCRIPT_DIR/.npx-thunderid-home" \
            THUNDERID_ADMIN_USERNAME="$ADMIN_USER" THUNDERID_ADMIN_PASSWORD="$ADMIN_PASS" \
            perl -MPOSIX -e 'POSIX::setsid(); open(STDIN, "<", "/dev/null"); exec(@ARGV) or die $!' \
                -- npx --yes thunderid --verbose) || true

        DIST_HOME=$(find "$SCRIPT_DIR/thunderid" -maxdepth 1 -type d -name 'v*' 2>/dev/null | head -1)
        if [ -z "$DIST_HOME" ]; then
            echo "ERROR: npx thunderid did not produce an installed ThunderID release under $SCRIPT_DIR/thunderid."
            exit 1
        fi
        chmod +x "$DIST_HOME/start.sh"
        echo "Using ThunderID $(basename "$DIST_HOME") from $DIST_HOME"
    fi

    echo "Starting ThunderID server..."
    curl -sk "https://localhost:${SERVER_PORT}/health/liveness" > /dev/null 2>&1 || (cd "$DIST_HOME" && ./start.sh &)
    wait_for_url "https://localhost:${SERVER_PORT}/health/liveness" "ThunderID server"
}

# Mints an admin token via the CONSOLE app (OAuth2 authorization_code + PKCE) — same sequence as
# utils/authentication/index.ts, duplicated here in bash because config import (below) needs a
# token before Playwright (and its TypeScript admin-token helper) ever starts.
mint_admin_token() {
    echo "Obtaining admin token..."
    local redirect_uri="https://localhost:${SERVER_PORT}/console"
    local code_verifier code_challenge
    code_verifier=$(openssl rand -hex 32 | cut -c1-43)
    code_challenge=$(printf '%s' "$code_verifier" | openssl dgst -sha256 -binary | openssl base64 -A | tr '+/' '-_' | tr -d '=')

    local headers_file
    headers_file=$(mktemp)
    curl -sk -o /dev/null -D "$headers_file" \
        -G "https://localhost:${SERVER_PORT}/oauth2/authorize" \
        --data-urlencode "client_id=CONSOLE" \
        --data-urlencode "redirect_uri=$redirect_uri" \
        --data-urlencode "scope=system" \
        --data-urlencode "resource=https://localhost:${SERVER_PORT}/mcp" \
        --data-urlencode "response_type=code" \
        --data-urlencode "code_challenge=$code_challenge" \
        --data-urlencode "code_challenge_method=S256"

    local location auth_id exec_id
    location=$(grep -i "^location:" "$headers_file" | tr -d '\r' | sed 's/^[Ll]ocation: //')
    rm -f "$headers_file"
    auth_id=$(echo "$location" | sed -n 's/.*[?&]authId=\([^&]*\).*/\1/p')
    exec_id=$(echo "$location" | sed -n 's/.*[?&]executionId=\([^&]*\).*/\1/p')

    if [ -z "$auth_id" ] || [ -z "$exec_id" ]; then
        echo "ERROR: Failed to parse authId/executionId from authorize redirect."
        exit 1
    fi

    local prompt_resp challenge_token
    prompt_resp=$(curl -sk -X POST "https://localhost:${SERVER_PORT}/flow/execute" \
        -H "Content-Type: application/json" -d "{\"executionId\": \"$exec_id\"}")
    challenge_token=$(echo "$prompt_resp" | jq -r '.challengeToken // empty')
    [ -n "$challenge_token" ] || { echo "ERROR: Flow execution did not return a challenge token: $prompt_resp"; exit 1; }

    local flow_resp assertion
    flow_resp=$(curl -sk -X POST "https://localhost:${SERVER_PORT}/flow/execute" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg executionId "$exec_id" --arg challengeToken "$challenge_token" \
            --arg username "$ADMIN_USER" --arg password "$ADMIN_PASS" --arg action "action_001" \
            '{executionId: $executionId, challengeToken: $challengeToken, inputs: {username: $username, password: $password}, action: $action}')")
    assertion=$(echo "$flow_resp" | jq -r '.assertion // empty')
    [ -n "$assertion" ] || { echo "ERROR: Admin authentication failed: $flow_resp"; exit 1; }

    local callback_resp auth_code
    callback_resp=$(curl -sk -X POST "https://localhost:${SERVER_PORT}/oauth2/auth/callback" \
        -H "Content-Type: application/json" -d "{\"authId\": \"$auth_id\", \"assertion\": \"$assertion\"}")
    auth_code=$(echo "$callback_resp" | jq -r '.redirect_uri // empty' | sed 's/.*[?&]code=\([^&]*\).*/\1/')
    [ -n "$auth_code" ] || { echo "ERROR: OAuth2 callback did not return an authorization code: $callback_resp"; exit 1; }

    local token_resp
    token_resp=$(curl -sk -X POST "https://localhost:${SERVER_PORT}/oauth2/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        --data-urlencode "grant_type=authorization_code" \
        --data-urlencode "code=$auth_code" \
        --data-urlencode "redirect_uri=$redirect_uri" \
        --data-urlencode "client_id=CONSOLE" \
        --data-urlencode "resource=https://localhost:${SERVER_PORT}/mcp" \
        --data-urlencode "code_verifier=$code_verifier")
    ADMIN_TOKEN=$(echo "$token_resp" | jq -r '.access_token // empty')
    [ -n "$ADMIN_TOKEN" ] || { echo "ERROR: Failed to obtain admin access token: $token_resp"; exit 1; }
}

import_sample_apps_config() {
    echo "Importing sample app OAuth2 clients..."
    local content variables http_status response_file
    content=$(jq -Rs . < "$SCRIPT_DIR/thunderid-config/sample-apps.yaml")
    variables=$(jq -n '{
        BROWSER_CLIENT_ID: "JS_SDK_E2E_BROWSER", BROWSER_REDIRECT_URIS: ["http://localhost:5173"],
        REACT_CLIENT_ID: "JS_SDK_E2E_REACT", REACT_REDIRECT_URIS: ["http://localhost:5174"],
        VUE_CLIENT_ID: "JS_SDK_E2E_VUE", VUE_REDIRECT_URIS: ["http://localhost:5175"],
        NEXTJS_CLIENT_ID: "JS_SDK_E2E_NEXTJS", NEXTJS_CLIENT_SECRET: "e2e-nextjs-secret", NEXTJS_REDIRECT_URIS: ["http://localhost:3001"],
        NUXT_CLIENT_ID: "JS_SDK_E2E_NUXT", NUXT_CLIENT_SECRET: "e2e-nuxt-secret", NUXT_REDIRECT_URIS: ["http://localhost:3002/api/auth/callback"], NUXT_POST_LOGOUT_REDIRECT_URIS: ["http://localhost:3002/"],
        EXPRESS_CLIENT_ID: "JS_SDK_E2E_EXPRESS", EXPRESS_CLIENT_SECRET: "e2e-express-secret", EXPRESS_REDIRECT_URIS: ["http://localhost:3000/login"], EXPRESS_POST_LOGOUT_REDIRECT_URIS: ["http://localhost:3000/logout"],
        NODE_CLIENT_ID: "JS_SDK_E2E_NODE", NODE_CLIENT_SECRET: "e2e-node-secret",
        ALL_ORIGINS: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]
    }')
    response_file=$(mktemp)
    http_status=$(curl -sk -o "$response_file" -w "%{http_code}" \
        -X POST "https://localhost:${SERVER_PORT}/import" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "{\"content\": $content, \"variables\": $variables, \"options\": {\"upsert\": true}}")

    if [ "$http_status" != "200" ]; then
        echo "ERROR: import returned HTTP $http_status:"; cat "$response_file"; echo ""; rm -f "$response_file"; exit 1
    fi
    local failed_count
    failed_count=$(jq -r '.summary.failed // 0' "$response_file")
    if [ "$failed_count" != "0" ]; then
        echo "ERROR: import had $failed_count failed resource(s):"; cat "$response_file"; echo ""; rm -f "$response_file"; exit 1
    fi
    rm -f "$response_file"
    echo "  Imported sample app OAuth2 clients."
}

# Writes each sample app's own .env with the real OAuth2 client it was just imported with (see
# import_sample_apps_config). The apps' own `prepare-dev.cjs --flow=redirect` helper looks like
# the natural fit here, but it isn't: it blanks out any value that looks like one of its own
# placeholders — including the literal string `https://localhost:8090`, which happens to be our
# *real* server URL too. Writing each .env directly, with the exact variable names those scripts
# use for "redirect flow", sidesteps that. The apps are fresh copies under .samples/, so there is
# no developer .env to preserve.
write_app_envs() {
    echo "Writing sample app .env files..."
    local nextjs_secret nuxt_secret
    nextjs_secret=$(openssl rand -base64 32)
    nuxt_secret=$(openssl rand -base64 32)

    cat > "$SAMPLES_DIR/quickstarts/quickstart-browser/.env" <<EOF
VITE_THUNDERID_BASE_URL=https://localhost:${SERVER_PORT}
VITE_THUNDERID_CLIENT_ID=JS_SDK_E2E_BROWSER
EOF

    cat > "$SAMPLES_DIR/quickstarts/quickstart-react/.env" <<EOF
VITE_THUNDERID_BASE_URL=https://localhost:${SERVER_PORT}
VITE_THUNDERID_CLIENT_ID=JS_SDK_E2E_REACT
EOF

    cat > "$SAMPLES_DIR/quickstarts/quickstart-vue/.env" <<EOF
VITE_THUNDERID_BASE_URL=https://localhost:${SERVER_PORT}
VITE_THUNDERID_CLIENT_ID=JS_SDK_E2E_VUE
EOF

    cat > "$SAMPLES_DIR/quickstarts/quickstart-express/.env" <<EOF
THUNDERID_BASE_URL=https://localhost:${SERVER_PORT}
THUNDERID_CLIENT_ID=JS_SDK_E2E_EXPRESS
THUNDERID_CLIENT_SECRET=e2e-express-secret
NODE_TLS_REJECT_UNAUTHORIZED=0
EOF

    # Redirect-flow variable names per thunder-id/samples quickstarts/quickstart-nextjs/scripts/prepare-dev.cjs;
    # native-flow vars (APPLICATION_ID, SIGN_IN_URL, SIGN_UP_URL, FLOW_SECRET) are omitted entirely.
    cat > "$SAMPLES_DIR/quickstarts/quickstart-nextjs/.env" <<EOF
NEXT_PUBLIC_THUNDERID_BASE_URL=https://localhost:${SERVER_PORT}
NEXT_PUBLIC_THUNDERID_CLIENT_ID=JS_SDK_E2E_NEXTJS
THUNDERID_CLIENT_SECRET=e2e-nextjs-secret
THUNDERID_SESSION_SECRET=${nextjs_secret}
THUNDERID_SECRET=${nextjs_secret}
NODE_TLS_REJECT_UNAUTHORIZED=0
EOF

    # Same idea per quickstarts/quickstart-nuxt/scripts/prepare-dev.cjs.
    cat > "$SAMPLES_DIR/quickstarts/quickstart-nuxt/.env" <<EOF
NUXT_PUBLIC_THUNDERID_BASE_URL=https://localhost:${SERVER_PORT}
NUXT_PUBLIC_THUNDERID_CLIENT_ID=JS_SDK_E2E_NUXT
THUNDERID_CLIENT_SECRET=e2e-nuxt-secret
THUNDERID_SESSION_SECRET=${nuxt_secret}
NODE_TLS_REJECT_UNAUTHORIZED=0
EOF
}

start_sample_apps() {
    echo "Starting sample apps..."
    ( cd "$SAMPLES_DIR/quickstarts/quickstart-browser" && npx --no-install vite --port 5173 ) &
    ( cd "$SAMPLES_DIR/quickstarts/quickstart-react" && npx --no-install vite --port 5174 ) &
    ( cd "$SAMPLES_DIR/quickstarts/quickstart-vue" && npx --no-install vite --port 5175 ) &
    ( cd "$SAMPLES_DIR/quickstarts/quickstart-nextjs" && npx --no-install next dev -p 3001 ) &
    ( cd "$SAMPLES_DIR/quickstarts/quickstart-nuxt" && npx --no-install nuxt dev --port 3002 ) &
    ( cd "$SAMPLES_DIR/quickstarts/quickstart-express" && node --env-file-if-exists=.env index.mjs ) &

    wait_for_url "http://localhost:5173" "quickstarts/quickstart-browser"
    wait_for_url "http://localhost:5174" "quickstarts/quickstart-react"
    wait_for_url "http://localhost:5175" "quickstarts/quickstart-vue"
    wait_for_url "http://localhost:3001" "quickstarts/quickstart-nextjs"
    wait_for_url "http://localhost:3002" "quickstarts/quickstart-nuxt"
    wait_for_url "http://localhost:3000" "quickstarts/quickstart-express"
}

setup_env() {
    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        echo "Creating default .env for E2E tests..."
        cp "$SCRIPT_DIR/defaults.env" "$SCRIPT_DIR/.env"
    fi
    export SERVER_URL="https://localhost:${SERVER_PORT}"
    export ADMIN_USERNAME="$ADMIN_USER"
    export ADMIN_PASSWORD="$ADMIN_PASS"
    export ADMIN_TOKEN
    export BROWSER_APP_URL="http://localhost:5173"
    export REACT_APP_URL="http://localhost:5174"
    export VUE_APP_URL="http://localhost:5175"
    export NEXTJS_APP_URL="http://localhost:3001"
    export NUXT_APP_URL="http://localhost:3002"
    export EXPRESS_APP_URL="http://localhost:3000"
    # quickstarts/quickstart-node has no page to drive — client-credentials.spec.ts spawns it directly with
    # `env: process.env`, so its credentials just need to be in this process's environment, not a
    # .env file on disk.
    export THUNDERID_BASE_URL="https://localhost:${SERVER_PORT}"
    export THUNDERID_CLIENT_ID="JS_SDK_E2E_NODE"
    export THUNDERID_CLIENT_SECRET="e2e-node-secret"
    export NODE_TLS_REJECT_UNAUTHORIZED=0
}

if curl -sk "https://localhost:${SERVER_PORT}/health/liveness" > /dev/null 2>&1; then
    echo "A ThunderID server is already running at https://localhost:${SERVER_PORT}."
    echo "Stop it before running this script, which needs to manage the server lifecycle."
    exit 1
fi

download_and_start_server
mint_admin_token
import_sample_apps_config

echo "Building SDK packages..."
( cd "$PROJECT_ROOT" && pnpm install --frozen-lockfile && pnpm build )

echo "Preparing sample apps..."
node "$SCRIPT_DIR/scripts/prepare-samples.ts"

write_app_envs
start_sample_apps
setup_env

echo "Running Playwright E2E tests..."
( cd "$SCRIPT_DIR" && pnpm install --frozen-lockfile && npx playwright test "$@" )
