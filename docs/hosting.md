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

- A TwextHub API instance to talk to, or the public registry at `https://twexts.sdisk.us/api/v1`. The UI does not bundle or proxy the registry; it points at one.
- To run `server.js`: Node.js 24 or newer. The server is dependency-free ESM, so no install step beyond building the app.
- To run the Docker image: nothing on the host besides Docker.

There is no database and no local storage on the server. The UI is stateless; browser-only state (saved extensions, theme, the logged-in session) lives in each visitor's `localStorage`.

## Run with server.js

```sh
npm ci
npm run build
node server.js
```

`node server.js` serves `dist/` (override with `WEB_ROOT`) and listens on `0.0.0.0:3000` (`TWEXTHUB_PORT`). On each request for the page it resolves the API base URL and writes it into the served HTML as `window.TWEXTHUB_CONFIG.apiBaseUrl`, which takes precedence over any URL baked in at build time. See [configuration.md](configuration.md).

`server.js` answers only GET and HEAD. It serves hashed assets with immutable, one-year cache headers and `index.html` with `no-cache`, then falls back to `index.html` for unknown paths so client-side routes keep working.

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

- `TWEXTHUB_API_URL` — runtime API base URL for `server.js` deploys (overrides a build-time value).
- `VITE_TWEXTHUB_API_URL` — build-time API base URL for static deploys.

## Behind a reverse proxy

Routing is hash-based (`/#/ext/…`), so a proxy needs no rewrite rules for the app's links. Point the proxy at the UI's port. `server.js` already handles unknown paths by serving `index.html`, so there is nothing else to configure; if you front a plain static file server instead, make it fall back to `index.html` for non-asset paths. Publishes go from the `twext` CLI straight to the registry, never through the UI's host, so the proxy in front of the UI needs no raised request-body limit either.

## Browser access and CORS

The page calls `${apiBaseUrl}/…` directly from the browser. The API instance must allow the UI's origin: the public registry defaults to CORS `*`, but if you point the UI at a registry with a restricted CORS list, that list must include the origin the UI is served from, or every registry call fails in the browser. See backend docs for how to set `cors.allowedOrigins`.

## Serve it from any static host

The build output in `dist/` is plain static files, so the app also runs on GitHub Pages, a CDN, or any file host. The difference from `server.js` is that the API URL is then baked in at build time and cannot be changed at runtime:

```sh
VITE_TWEXTHUB_API_URL=https://registry.example.com/api/v1 npm run build
```

Deploy the contents of `dist/`. Without `VITE_TWEXTHUB_API_URL`, the build points at the default public registry. Because links are hash-based, hosting under a subpath works without configuration.

## Upgrades

Redeploys are stateless: there is nothing to migrate, and the container holds no data. Pull the new image or rebuild `dist/` and restart. API compatibility is the backend's concern; a UI release only needs a registry it can reach.

## Next steps

- [configuration.md](configuration.md) — every setting and how the API base URL is resolved.
- Backend hosting and moderation guides live in the [TwextHub repository](https://github.com/twext/twexthub/tree/main/docs).
