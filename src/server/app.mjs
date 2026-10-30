import { createServer as createHttpServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { Store } from '../core/db.mjs';
import { handleApi } from './routes.mjs';
import { ReminderScheduler } from './desktop.mjs';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

export async function createApp({ dataRoot, clientRoot, port = 4123, host = '127.0.0.1', scheduler = true, notifier, schedulerIntervalMs = 15000, persistDataRoot = true, nativeActions = true } = {}) {
  const store = new Store(dataRoot).open();
  const reminderScheduler = new ReminderScheduler(store, { intervalMs: schedulerIntervalMs, notifier, checkOnStart: scheduler });
  if (scheduler) reminderScheduler.start();
  const resolvedClientRoot = resolve(clientRoot || join(process.cwd(), 'src', 'client'));
  const server = createHttpServer(async (req, res) => {
    try {
      await routeRequest(req, res, { store, clientRoot: resolvedClientRoot, scheduler: reminderScheduler, options: { persistDataRoot, nativeActions } });
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  });
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolvePromise());
  });
  return {
    store,
    server,
    scheduler: reminderScheduler,
    port: server.address().port,
    host,
    async close() {
      reminderScheduler.stop();
      await new Promise((resolvePromise) => server.close(resolvePromise));
      store.close();
    },
  };
}

async function routeRequest(req, res, context) {
  const url = new URL(req.url || '/', 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    const handled = await handleApi(req, res, url, context.store, sendJson, context.scheduler, context.options);
    if (!handled) sendJson(res, 404, { error: 'API 不存在' });
    return;
  }
  serveStatic(url.pathname, res, context.clientRoot);
}

export function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function serveStatic(pathname, res, clientRoot) {
  const safePath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(clientRoot, safePath === '/' ? 'index.html' : safePath);
  if (!resolve(filePath).startsWith(resolve(clientRoot))) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) filePath = join(clientRoot, 'index.html');
  if (!existsSync(filePath)) {
    res.writeHead(404); res.end('Not found'); return;
  }
  const body = readFileSync(filePath);
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[extname(filePath)] || 'application/octet-stream',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}


