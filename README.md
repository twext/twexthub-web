# TwextHub (web app)

> The web UI for [TwextHub](https://github.com/twext/twexthub)

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Highlights](#highlights)
- [Overview](#overview)
  - [Authors](#authors)
- [Usage](#usage)
  - [Publish](#publish)
  - [Install](#install)
  - [Manage your account](#manage-your-account)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Local development](#local-development)
  - [Pointing the UI at another backend](#pointing-the-ui-at-another-backend)
  - [Docker](#docker)
- [Editor setup](#editor-setup)
- [Feedback and Contributing](#feedback-and-contributing)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Highlights

- Browse and search the registry by name, namespace, author, or keyword, with grid/list views, sorting, and pagination.
- Per-version extension pages with TurboWarp install URLs, source review, version diffing, and yanking.
- Save extensions locally (bookmarks) and recently-viewed history.
- Accounts with 7-day logins and scoped automation tokens (`publish` / `yank`) meant for CI use.
- Admin surface for moderating submissions, managing users and roles, editing the Terms and Privacy docs, and maintenance tasks.
- The API base URL is configurable at build time or at runtime; the app runs on any static host.

## Overview

TwextHub is the registry of Twext-compiled TurboWarp extensions. This repo is its official web frontend: a React + TypeScript single-page app bundled with Vite and styled with Tailwind CSS. It talks to the TwextHub API and uses hash-based routing, so deep links work on a static host without server rewrites.

Packages are namespaced to their publishing account (`@namespace/id`) and versioned with SemVer. Publishing happens with the Twext CLI, not the UI; the first version from a new publisher sits in a moderation queue until an administrator approves or rejects it.

### Authors

TwextHub is maintained by the [Twext Team](https://github.com/twext).

## Usage

The public registry default is `https://twexts.sdisk.us/api/v1`. The UI points at it unless an operator overrides the API base URL (see [Installation](#installation)).

### Publish

Publishing is done with the Twext CLI on your compiled project:

```sh
twext login
twext publish
```

Create the account first at `#/signup`. New publishers' first submissions are reviewed by an administrator before they appear publicly.

### Install

In the TurboWarp editor: **Add Extension → Custom Extension**, then paste a version's download URL from its extension page in the registry. The URL takes the form:

```
${apiBaseUrl}/@${namespace}/${id}/versions/${version}/download
```

### Manage your account

`#/settings` holds your profile, open sessions, and automation tokens. Sessions expire after 7 days; automation tokens never expire unless you set a lifetime when creating them. Tokens are scoped to `publish` and/or `yank`, for CI workflows (for example a `twext publish` GitHub Action) rather than interactive use.

## Installation

### Prerequisites

- Node.js 24 or newer

### Local development

```sh
npm ci
npm run dev
```

The dev server runs at `http://localhost:3000`.

| Script                            | What it does                             |
| --------------------------------- | ---------------------------------------- |
| `npm run build`                   | Bundle the app into `dist/`              |
| `npm run preview`                 | Preview the production build             |
| `npm run lint`                    | ESLint across the repo                   |
| `npm run typecheck`               | `tsc --noEmit`                           |
| `npm test`                        | Run the vitest suite                     |
| `npm run format` / `format:check` | Prettier write / check                   |
| `npm run doctoc`                  | Regenerate the table-of-contents markers |

### Pointing the UI at another backend

The API base URL is resolved in this order:

1. Runtime `window.TWEXTHUB_CONFIG.apiBaseUrl`, injected by `server.js` into `index.html`.
2. Build-time env `VITE_TWEXTHUB_API_URL` (baked into the bundle).
3. Default: `https://twexts.sdisk.us/api/v1`.

So a static deploy pins the URL at build time, while a `server.js` deploy can switch it at startup:

```sh
npm run build
TWEXTHUB_API_URL=https://registry.example.com/api/v1 node server.js
```

`server.js` also reads `apiBaseUrl` from a `config.yml` / `config.yaml` in the working directory, or from the file given as its first CLI argument. It serves `dist/`, injects the resolved URL into the served HTML, and falls back to `index.html` for unknown paths, so client-side routes keep working.

### Docker

```sh
docker build -t twexthub-web .
docker run --rm -p 8080:3000 -e TWEXTHUB_API_URL=https://registry.example.com/api/v1 twexthub-web
```

`compose.example.yml` shows the same setup under Docker Compose. The image builds `dist/` in a multi-stage build and runs `server.js` as the `node` user, listening on port 3000.

## Editor setup

The repo carries Prettier and ESLint configs, exercised by the npm scripts above (and in CI). Run `npm run format` before submitting, or set your editor to format on save with Prettier. The table-of-contents blocks at the top of this file and `AGENT.md` are maintained with `npm run doctoc`.

## Feedback and Contributing

Bug reports and feature requests go in [issues](https://github.com/twext/twext/issues); questions and ideas for the project are welcome in [discussions](https://github.com/twext/twext/discussions).

Contributions are welcome — open an issue first if the change is bigger than a typo fix.
