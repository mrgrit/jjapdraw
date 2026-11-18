// Minimal static file server for the built JjapDraw app (dist/).
// No dependencies: `npm run build && node server.js`
// Env: PORT (default 8100), HOST (default 0.0.0.0)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const PORT = Number(process.env.PORT) || 8100;
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt']);

function resolveFile(urlPath) {
  let rel;
  try {
    rel = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }
  const file = path.normalize(path.join(ROOT, rel));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return null; // path traversal
  try {
    const st = fs.statSync(file);
    if (st.isFile()) return file;
    if (st.isDirectory()) {
      const index = path.join(file, 'index.html');
      if (fs.existsSync(index)) return index;
    }
  } catch {
    /* not found */
  }
  return undefined;
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let file = resolveFile(req.url || '/');
  if (file === null) {
    res.writeHead(400).end('Bad request');
    return;
  }
  // Single-page app: unknown paths without an extension fall back to index.html.
  if (file === undefined) {
    if (path.extname(req.url.split('?')[0])) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    file = path.join(ROOT, 'index.html');
  }

  const ext = path.extname(file);
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    // Hashed build assets never change; index.html must always be revalidated.
    'Cache-Control': file.includes(`${path.sep}assets${path.sep}`)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
  };
  const gzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  if (gzip) {
    headers['Content-Encoding'] = 'gzip';
    headers['Vary'] = 'Accept-Encoding';
  }
  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  const stream = fs.createReadStream(file);
  stream.on('error', () => res.destroy());
  (gzip ? stream.pipe(zlib.createGzip()) : stream).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`JjapDraw serving ${ROOT} at http://${HOST}:${PORT}/`);
});
