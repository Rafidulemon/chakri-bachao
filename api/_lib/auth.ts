import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'cb_auth';

function sign(value: string): string {
  return createHmac('sha256', process.env.COOKIE_SECRET || 'dev-secret').update(value).digest('hex');
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// "ELX 002", "elx002" and "ELX-002" are all the same ID
export function normId(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function authCookie(empId: string): string {
  const v = encodeURIComponent(empId);
  return `${COOKIE}=${v}.${sign(empId)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 90}`;
}

// Returns the logged-in employee's ELX ID, or null
export function authedEmpId(req: Request): string | null {
  const raw = req.headers.get('cookie') || '';
  const match = raw.split(';').map(c => c.trim()).find(c => c.startsWith(COOKIE + '='));
  if (!match) return null;
  const val = match.slice(COOKIE.length + 1);
  const dot = val.lastIndexOf('.');
  if (dot < 0) return null;
  let empId: string;
  try { empId = decodeURIComponent(val.slice(0, dot)); } catch { return null; }
  return same(val.slice(dot + 1), sign(empId)) ? empId : null;
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
}
