# Configuration

The web UI is a static frontend with one real setting — which TwextHub API instance it talks to — plus a few knobs on the bundled `server.js`. This reference covers all of them.

The browser only ever calls its own origin: the page requests `/api/v1/…`, and `server.js` (or the Vite dev server) forwards those requests to the API the operator configured. The client never sees the API's host, so operator `localhost` values mean the _server's_ loopback, never a visitor's.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [How the API base URL is resolved](#how-the-api-base-url-is-resolved)
- [Build time](#build-time)
- [Server time](#server-time)
- [Behavior notes](#behavior-notes)
- [Not runtime configuration](#not-runtime-configuration)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## How the API base URL is resolved

There are two URLs, kept deliberately apart:

- **What the browser calls:** always the same origin as the page — `/api/v1`. `server.js` injects `window.TWEXTHUB_CONFIG.apiBaseUrl = '/api/v1'` into the served HTML, and proxies that prefix to the upstream below. A purely static host has no proxy, so it bakes in whatever `VITE_TWEXTHUB_API_URL` says at build time.
- **The upstream the server forwards to:** `TWEXTHUB_API_URL`, or `apiBaseUrl` in a config file, or the public registry default `https://twexts.sdisk.us/api/v1`.

So a `server.js` deploy can retarget an existing build at startup (the URL is resolved on the server), while a static deploy must pick the URL before building.

## Build time

| Variable                | Purpose                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_TWEXTHUB_API_URL` | API base URL for a static deploy with no proxy, compiled into the bundle by `vite build`. Ignored when `server.js` serves the page. |

## Server time

`server.js` reads configuration from the environment or a small YAML file. A config file is looked up at the path given as the first CLI argument, otherwise `config.yml` then `config.yaml` in the working directory. These describe the _upstream_; the browser keeps calling its own origin's `/api/v1`.

| Key                | Default                          | Source                       | Purpose                                                                                                     |
| ------------------ | -------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `apiBaseUrl`       | `https://twexts.sdisk.us/api/v1` | `config.yml` / `config.yaml` | Upstream API server.js proxies `/api/v1` to; must be an `https` URL, or `http` on localhost for development |
| `TWEXTHUB_API_URL` | —                                | environment                  | Upstream API; overrides `apiBaseUrl` from the config file                                                   |
| `TWEXTHUB_PORT`    | `3000`                           | environment                  | TCP port to listen on; values that are not positive integers fall back to `3000`                            |
| `WEB_ROOT`         | `dist`                           | environment                  | Directory of static files to serve                                                                          |

Example, passed explicitly as the first argument:

```sh
node server.js /etc/twexthub-web.yaml
```

A config file needs only `apiBaseUrl`; values absent from it use the defaults above:

```yaml
# The registry this server forwards /api/v1 to.
apiBaseUrl: https://registry.example.com/api/v1
```

The UI never reads `config.yml` itself — the bundle cannot, it is static, and with `server.js` it does not need to. A purely static deploy (no proxy) uses `VITE_TWEXTHUB_API_URL` instead.

## Behavior notes

- An `apiBaseUrl` / `TWEXTHUB_API_URL` value is accepted only if it uses `https`, or `http` with a localhost/loopback host for development (`http://localhost:8080/api/v1` works, `http://registry.example.com/api/v1` does not). Anything else is logged and skipped in favor of the default. Remote APIs must use HTTPS so session tokens never travel in cleartext.
- The _client_'s own check additionally accepts a root-relative path (`/api/v1`), which is the default when the page is served with a proxy behind it.
- Values are normalized by stripping trailing slashes, so `https://hub.example/api/v1/` becomes `https://hub.example/api/v1`.
- The UI stores its session token and profile in the browser's `localStorage`, so it is per-browser, not per-server. Sessions expire on the registry after 7 days; automation tokens do not expire unless they were created with a lifetime.
- `server.js` serves content-addressed (hashed) assets with immutable year-long cache headers and other files with short revalidating headers; `index.html` gets `no-cache`.

## Not runtime configuration

Everything else in the repo — the registry it talks to, moderation policy, rate limits — belongs to the backend server and is covered by the [TwextHub configuration reference](https://github.com/twext/twexthub/tree/main/docs/configuration.md).
