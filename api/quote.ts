import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import nodemailer from 'nodemailer';

const CSRF_SECRET =
  process.env.CSRF_SECRET && process.env.CSRF_SECRET !== 'CHANGE_THIS_TO_A_RANDOM_SERVER_SECRET'
    ? process.env.CSRF_SECRET
    : 'corona-plumbers-vercel-default-csrf-key-change-in-env';

const CONFIRMED_SERVICES = new Set([
  'Burst Pipe Repairs',
  'Leaking Tap & Valve Fixes',
  'Kitchen Plumbing',
  'Bathroom Plumbing',
  'Appliance Replacement',
  'Pipework Maintenance',
  'General Plumbing Enquiry',
]);

const PREFERRED_CONTACT_METHODS = new Set([
  'WhatsApp Voice Call',
  'Telephone',
  'Email',
]);

function verifyCsrfToken(token: string | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [nonce, issuedAtStr, providedSig] = parts;
  if (!nonce || !issuedAtStr || !providedSig) return false;

  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt)) return false;
  const ageMs = Date.now() - issuedAt;
  if (ageMs < 0 || ageMs > 2 * 60 * 60 * 1000) return false;

  const expectedSig = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(`${nonce}.${issuedAtStr}`)
    .digest('hex');

  const providedBuf = Buffer.from(providedSig, 'hex');
  const expectedBuf = Buffer.from(expectedSig, 'hex');
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

function sendJson(res: ServerResponse, status: number, payload: Record<string, unknown>): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function parseJsonBody(req: IncomingMessage & { body?: unknown }): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: Buffer | string) => {
      raw += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      if (raw.length > 65536) raw = raw.slice(0, 65536);
    });
    req.on('end', () => {
      try {
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
    return;
  }

  const body = await parseJsonBody(req);
  const headerToken = req.headers['x-csrf-token'];
  const csrfToken =
    typeof headerToken === 'string'
      ? headerToken
      : typeof body._csrf === 'string'
        ? body._csrf
        : undefined;

  if (!verifyCsrfToken(csrfToken)) {
    sendJson(res, 403, {
      ok: false,
      error: 'Security token expired. Please refresh the page and submit your request again.',
    });
    return;
  }

  const honeypot = sanitizeText(body.website_url, 100);
  if (honeypot.length > 0) {
    sendJson(res, 200, {
      ok: true,
      referenceId: 'CPL-RECEIVED',
      message: 'Thank you. Your enquiry has been received.',
    });
    return;
  }

  const name = sanitizeText(body.name, 100);
  const phone = sanitizeText(body.phone, 30);
  const email = sanitizeText(body.email, 140).toLowerCase();
  const postcode = sanitizeText(body.postcode, 16).toUpperCase();
  const service = sanitizeText(body.service, 80);
  const preferredContact = sanitizeText(body.preferredContact, 40);
  const message = sanitizeText(body.message, 2000);

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = 'Please enter your full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    fieldErrors.email = 'Please enter a valid email address.';
  }
  if (phone && !/^[+\d\s()-]{7,20}$/.test(phone)) {
    fieldErrors.phone = 'Please enter a valid UK or international phone number.';
  }
  if (preferredContact === 'Telephone' && phone.length < 7) {
    fieldErrors.phone = 'Please provide a telephone number for a return call.';
  }
  if (!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(postcode.trim())) {
    fieldErrors.postcode = 'Please enter a valid UK property postcode (e.g. SW1V 1AA).';
  }
  if (!CONFIRMED_SERVICES.has(service)) {
    fieldErrors.service = 'Please select a plumbing service from the list.';
  }
  if (!PREFERRED_CONTACT_METHODS.has(preferredContact)) {
    fieldErrors.preferredContact = 'Please select how you prefer to be contacted.';
  }
  if (message.length < 10) {
    fieldErrors.message = 'Please briefly describe the plumbing work or issue (at least 10 characters).';
  }

  if (Object.keys(fieldErrors).length > 0) {
    sendJson(res, 400, {
      ok: false,
      error: 'Please check the highlighted fields below.',
      fieldErrors,
    });
    return;
  }

  const referenceId = `CPL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const submittedAt = new Date().toISOString();

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const recipient = process.env.QUOTE_RECIPIENT_EMAIL?.trim();

  let sentViaSmtp = false;

  try {
    if (host && user && pass && recipient) {
      const port = Number(process.env.SMTP_PORT) || 587;
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM?.trim() || user,
        to: recipient,
        replyTo: email,
        subject: `Quote Request [${referenceId}] — ${service} (${postcode})`,
        text: [
          `CORONA PLUMBERS LTD — Website Quote Request`,
          `Reference: ${referenceId}`,
          `Submitted: ${submittedAt}`,
          ``,
          `Name: ${name}`,
          `Email: ${email}`,
          `Telephone: ${phone || 'Not provided'}`,
          `Property Postcode: ${postcode}`,
          `Service Requested: ${service}`,
          `Preferred Contact: ${preferredContact}`,
          ``,
          `Message:`,
          message,
        ].join('\n'),
      });
      sentViaSmtp = true;
    }

    sendJson(res, 200, {
      ok: true,
      referenceId,
      deliveryMode: sentViaSmtp ? 'smtp' : 'recorded',
      message: `Thank you, ${name}. Your quote request (${referenceId}) has been logged for review.`,
    });
  } catch (err) {
    console.error('Vercel quote submission error:', err);
    sendJson(res, 500, {
      ok: false,
      error:
        'We could not process your form submission right now. Please connect directly via our WhatsApp voice invitation.',
    });
  }
}
