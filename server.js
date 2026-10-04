/**
 * AstrahContent — Development & Local Production HTTP Server
 * Built with native Node.js (Zero external dependencies).
 * Supports ES Modules, proper MIME types, and .env configuration.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple native .env loader without third-party dependencies
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Dynamic API endpoint for environment variables
  if (pathname === '/api/config') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });
    res.end(JSON.stringify({
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
      OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b',
      PORT: PORT,
    }));
    return;
  }

  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  } else if (pathname === '/studio') {
    pathname = '/studio.html';
  }

  const safeSuffix = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(ROOT_DIR, safeSuffix);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html>
<head><title>404 Not Found - AstrahContent</title></head>
<body style="background:#070711;color:#f0f0ff;font-family:sans-serif;padding:40px;text-align:center;">
  <h2>404 — Page or Asset Not Found</h2>
  <p><a href="/" style="color:#a855f7;">Return to Landing Page</a> | <a href="/studio.html" style="color:#06b6d4;">Open Studio</a></p>
</body>
</html>`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('------------------------------------------------------------');
  console.log(`🚀 AstrahContent Studio is running!`);
  console.log(`   Landing:  http://localhost:${PORT}`);
  console.log(`   Studio:   http://localhost:${PORT}/studio.html`);
  console.log('------------------------------------------------------------');
});
