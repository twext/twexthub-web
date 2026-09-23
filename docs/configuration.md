# Configuration

The web UI is a static frontend with one real setting — which TwextHub API instance it talks to — plus a few knobs on the bundled `server.js`. This reference covers all of them.

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

The base URL is resolved in this order; the first valid value wins:

1. Runtime, from `server.js`: the `TWEXTHUB_API_URL` environment variable, or `apiBaseUrl` in a config file (see below). `server.js` injects the result into the served HTML as `window.TWEXTHUB_CONFIG.apiBaseUrl`.
2. Build time: `VITE_TWEXTHUB_API_URL`, baked into the bundle by Vite.
3. Default: `https://twexts.sdisk.us/api/v1`.

So a `server.js` deploy can retarget an existing build at startup, while a static deploy must pick the URL before building.

## Build time

| Variable                | Purpose                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `VITE_TWEXTHUB_API_URL` | API base URL compiled into the bundle by `vite build`. Ignored if runtime config is present. |

## Server time

`server.js` reads configuration from the environment or a small YAML file. A config file is looked up at the path given as the first CLI argument, otherwise `config.yml` then `config.yaml` in the working directory.

| Key                | Default                          | Source                       | Purpose                                                                                   |
| ------------------ | -------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------- |
| `apiBaseUrl`       | `https://twexts.sdisk.us/api/v1` | `config.yml` / `config.yaml` | API base URL the UI calls; must be an `https` URL, or `http` on localhost for development |
| `TWEXTHUB_API_URL` | —                                | environment                  | API base URL; overrides `apiBaseUrl` from the config file                                 |
| `TWEXTHUB_PORT`    | `3000`                           | environment                  | TCP port to listen on; values that are not positive integers fall back to `3000`          |
| `WEB_ROOT`         | `dist`                           | environment                  | Directory of static files to serve                                                        |

Example, passed explicitly as the first argument:

```sh
node server.js /etc/twexthub-web.yaml
```

A config file needs only `apiBaseUrl`; values absent from it use the defaults above:

```yaml
apiBaseUrl: https://registry.example.com/api/v1
```

The UI never reads `config.yml` itself — the bundle cannot, it is static. A purely static deploy uses `VITE_TWEXTHUB_API_URL` instead.

## Behavior notes

- An `apiBaseUrl` value is accepted only if it uses `https`, or `http` with a localhost/loopback host for development (`http://localhost:8080/api/v1` works, `http://registry.example.com/api/v1` does not). Anything else is logged and skipped in favor of the next candidate. Remote APIs must use HTTPS so session tokens never travel in cleartext.
- Values are normalized by stripping trailing slashes, so `https://hub.example/api/v1/` becomes `https://hub.example/api/v1`.
- The UI stores its session token and profile in the browser's `localStorage`, so it is per-browser, not per-server. Sessions expire on the registry after 7 days; automation tokens do not expire unless they were created with a lifetime.
- `server.js` serves content-addressed (hashed) assets with immutable year-long cache headers and other files with short revalidating headers; `index.html` gets `no-cache`.

## Not runtime configuration

Everything else in the repo — the registry it talks to, moderation policy, rate limits — belongs to the backend server and is covered by the [TwextHub configuration reference](https://github.com/twext/twexthub/tree/main/docs/configuration.md).
