import { createReadStream, statSync, existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const DEFAULT_API_BASE_URL = 'https://twexts.sdisk.us/api/v1';
const WEB_ROOT = resolve(process.env.WEB_ROOT ?? 'dist');

const rawPort = Number(process.env.TWEXTHUB_PORT ?? 3000);
const PORT = Number.isInteger(rawPort) && rawPort > 0 ? rawPort : 3000;

const INDEX_NAME = 'index.html';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.woff2': 'font/woff2',
};

function isLoopbackHost(hostname) {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1'
  );
}

// Remote APIs must use HTTPS so injected credentials never travel in
// cleartext; plain HTTP is accepted only for loopback development URLs.
function isValidApiBaseUrl(raw) {
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol === 'https:') return true;
    return parsed.protocol === 'http:' && isLoopbackHost(parsed.hostname);
  } catch {
    return false;
  }
}

function normalizeApiBaseUrl(raw) {
  return raw.trim().replace(/\/+$/, '');
}

function unquoteYamlScalar(value) {
  if (value.length < 2) return value;
  const quote = value[0];
  if (quote !== '"' && quote !== "'") return value;
  if (value.at(-1) !== quote) return null;
  return value.slice(1, -1);
}

function readApiBaseUrlFromYaml(text) {
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line === '---') continue;
    const match = line.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/);
    if (!match || match[1] !== 'apiBaseUrl') continue;
    const value = unquoteYamlScalar(match[2].replace(/\s+#.*$/, '').trim());
    if (!value) return null;
    return value;
  }
  return null;
}

export { readApiBaseUrlFromYaml };

function resolveConfigPath() {
  const cliPath = process.argv[2];
  if (cliPath && existsSync(cliPath)) return cliPath;
  for (const candidate of ['config.yml', 'config.yaml']) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function resolveApiBaseUrl() {
  let url = DEFAULT_API_BASE_URL;
  const configPath = resolveConfigPath();
  if (configPath) {
    const fromFile = readApiBaseUrlFromYaml(readFileSync(configPath, 'utf8'));
    if (fromFile && isValidApiBaseUrl(fromFile)) {
      url = normalizeApiBaseUrl(fromFile);
    } else {
      console.warn(`Ignoring invalid apiBaseUrl in ${configPath}.`);
    }
  }
  const fromEnv = process.env.TWEXTHUB_API_URL;
  if (fromEnv) {
    if (isValidApiBaseUrl(fromEnv)) {
      url = normalizeApiBaseUrl(fromEnv);
    } else {
      console.warn(`Ignoring invalid TWEXTHUB_API_URL "${fromEnv}".`);
    }
  }
  return url;
}

const apiBaseUrl = resolveApiBaseUrl();

function injectConfig(html) {
  const config = JSON.stringify({ apiBaseUrl }).replace(/</g, '\\u003c');
  return html.replace(
    /<head([^>]*)>/,
    (match) => `${match}<script>window.TWEXTHUB_CONFIG = ${config};</script>`,
  );
}

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

const IMMUTABLE_ASSET_CACHE = 'public, max-age=31536000, immutable';
const REVALIDATED_ASSET_CACHE = 'public, max-age=300, stale-while-revalidate=600';

// Vite content-addresses emitted assets as `name-[hash].ext`; hashed names are
// safe to cache forever, stable names (e.g. regularLogoSquare.svg) are not.
function isContentAddressed(filePath) {
  return /[-.][0-9a-f]{8,}\.\w+$/i.test(filePath);
}

function serveFile(req, res, filePath) {
  const stream = createReadStream(filePath);
  let opened = false;
  stream.on('open', () => {
    opened = true;
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': isContentAddressed(filePath)
        ? IMMUTABLE_ASSET_CACHE
        : REVALIDATED_ASSET_CACHE,
    });
    stream.pipe(res);
  });
  stream.on('error', (err) => {
    if (!opened) {
      if (err.code === 'ENOENT') {
        res.writeHead(404).end('Not Found');
      } else {
        res.writeHead(500).end('Internal Server Error');
      }
    } else {
      // Headers are already sent; abort the response instead of committing
      // another status code.
      res.destroy();
    }
  });
}

function serveIndex(req, res, indexFile) {
  if (!existsSync(indexFile)) {
    sendStatus(res, 404, 'Not Found');
    return;
  }
  const html = injectConfig(readFileSync(indexFile, 'utf8'));
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(html);
}

function sendStatus(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' }).end(message);
}

const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendStatus(res, 405, 'Method Not Allowed');
    return;
  }

  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  } catch {
    sendStatus(res, 400, 'Bad Request');
    return;
  }

  if (urlPath.includes('\0')) {
    sendStatus(res, 400, 'Bad Request');
    return;
  }

  const segments = urlPath.split('/').filter(Boolean);
  if (segments.some((segment) => segment.startsWith('.'))) {
    sendStatus(res, 403, 'Forbidden');
    return;
  }

  const filePath = resolve(join(WEB_ROOT, urlPath));
  const insideRoot = filePath === WEB_ROOT || filePath.startsWith(WEB_ROOT + sep);
  if (!insideRoot) {
    sendStatus(res, 403, 'Forbidden');
    return;
  }

  const indexFile = join(WEB_ROOT, INDEX_NAME);
  if (filePath === indexFile) {
    serveIndex(req, res, indexFile);
    return;
  }

  if (isFile(filePath)) {
    serveFile(req, res, filePath);
    return;
  }

  serveIndex(req, res, indexFile);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`TwextHub Web UI listening on http://localhost:${PORT}`);
  console.log(`Serving ${WEB_ROOT} — TwextHub API base URL: ${apiBaseUrl}`);
});
