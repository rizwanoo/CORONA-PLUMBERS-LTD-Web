import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const CSRF_SECRET =
  process.env.CSRF_SECRET && process.env.CSRF_SECRET !== 'CHANGE_THIS_TO_A_RANDOM_SERVER_SECRET'
    ? process.env.CSRF_SECRET
    : 'corona-plumbers-vercel-default-csrf-key-change-in-env';

function createCsrfToken(): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const issuedAt = Date.now().toString();
  const payload = `${nonce}.${issuedAt}`;
  const sig = crypto.createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed.' }));
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ csrfToken: createCsrfToken() }));
}
