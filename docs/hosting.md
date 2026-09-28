# Hosting the web UI

The web UI is a static app that talks to a TwextHub registry over its [API](https://github.com/twext/twexthub). This guide is for people deploying a copy of the UI. Registry-side setup and moderation are covered in the backend repository's docs; this repo only serves the frontend.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [What you need](#what-you-need)
- [Run with server.js](#run-with-serverjs)
- [Run with Docker](#run-with-docker)
- [Configuration](#configuration)
- [Behind a reverse proxy](#behind-a-reverse-proxy)
- [Browser access and CORS](#browser-access-and-cors)
- [Serve it from any static host](#serve-it-from-any-static-host)
- [Upgrades](#upgrades)
- [Next steps](#next-steps)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## What you need

- A TwextHub API instance to talk to, or the public registry at `https://twexts.sdisk.us/api/v1`. `server.js` proxies it; a static deploy with no proxy bakes the API's URL into the build instead.
- To run `server.js`: Node.js 24 or newer. The server is dependency-free ESM, so no install step beyond building the app.
- To run the Docker image: nothing on the host besides Docker.

There is no database and no local storage on the server. The UI is stateless; browser-only state (saved extensions, theme, the logged-in session) lives in each visitor's `localStorage`.

## Run with server.js

```sh
npm ci
npm run build
node server.js
```

`node server.js` serves `dist/` (override with `WEB_ROOT`) and listens on `0.0.0.0:3000` (`TWEXTHUB_PORT`). At startup it resolves the upstream API base URL, forwards every `/api/v1/…` request there for any HTTP method, and on each page request writes `window.TWEXTHUB_CONFIG.apiBaseUrl = '/api/v1'` into the served HTML. The browser only talks to its own origin, so a `localhost` API value means the server's loopback — retargeting an existing build at startup is a server-side affair. See [configuration.md](configuration.md).

For everything outside `/api/v1`, `server.js` answers only GET and HEAD. It serves hashed assets with immutable, one-year cache headers and `index.html` with `no-cache`, then falls back to `index.html` for unknown paths so client-side routes keep working.

## Run with Docker

Prebuilt images are published to `ghcr.io/twext/twexthub-web`. Builds on `main` are tagged `latest`; version tags get semver tags. The image builds `dist/` in a multi-stage build and runs `server.js` as the `node` user on port 3000.

```sh
docker pull ghcr.io/twext/twexthub-web:latest

docker run --rm -p 8080:3000 \
  -e TWEXTHUB_API_URL=https://registry.example.com/api/v1 \
  ghcr.io/twext/twexthub-web:latest
```

**Build from source:**

```sh
docker build -t twexthub-web .
docker run --rm -p 8080:3000 -e TWEXTHUB_API_URL=https://registry.example.com/api/v1 twexthub-web
```

**Compose:**

```sh
docker compose -f compose.example.yml up -d
```

`compose.example.yml` builds the image locally and exposes it on `http://localhost:8080`, with `TWEXTHUB_API_URL` set from the environment.

## Configuration

Everything configurable fits on one page: [configuration.md](configuration.md). The short version is two variables:

- `TWEXTHUB_API_URL` — the upstream registry `server.js` proxies `/api/v1` to (overrides a build-time value).
- `VITE_TWEXTHUB_API_URL` — the API the bundle calls directly, for static hosts that have no proxy.

## Behind a reverse proxy

Routing is path-based (`/ext/…`), so the app needs unknown paths to fall back to `index.html`. `server.js` does this already; point a reverse proxy at the UI's port. If you front a plain static file server instead, make it fall back to `index.html` for non-asset paths, and proxy `/api/v1` to the registry like `server.js` does. Publishes go from the `twext` CLI straight to the registry, never through the UI's host, so the proxy in front of the UI needs no raised request-body limit either.

## Browser access and CORS

With `server.js` the page calls `/api/v1/…` on its own origin, and the server relays to the registry — so there is no browser CORS at all. CORS only becomes a factor on a static host with no proxy: the client then calls an absolute API URL directly, and that API must allow the UI's origin. The public registry defaults to CORS `*`, but if you point a static build at a registry with a restricted CORS list, that list must include the origin the UI is served from, or every registry call fails in the browser. See backend docs for how to set `cors.allowedOrigins`.

## Serve it from any static host

The build output in `dist/` is plain static files, so the app also runs on GitHub Pages, a CDN, or any file host. The difference from `server.js` is that a static host has no `/api/v1` relay, so the API URL must be absolute and baked in at build time:

```sh
VITE_TWEXTHUB_API_URL=https://registry.example.com/api/v1 npm run build
```

Deploy the contents of `dist/`. Without `VITE_TWEXTHUB_API_URL`, a static build calls its own origin's `/api/v1`, which only works when that host proxies `/api/v1` to a registry. The app relies on an `index.html` fallback for unknown paths (for example GitHub Pages has no such fallback; use a host that supports one, or a 404 page that rewrites to `index.html`).

## Upgrades

Redeploys are stateless: there is nothing to migrate, and the container holds no data. Pull the new image or rebuild `dist/` and restart. API compatibility is the backend's concern; a UI release only needs a registry it can reach.

## Next steps

- [configuration.md](configuration.md) — every setting and how the API base URL is resolved.
- Backend hosting and moderation guides live in the [TwextHub repository](https://github.com/twext/twexthub/tree/main/docs).
