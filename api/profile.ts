// GET /api/profile -> the logged-in employee's profile
// POST /api/profile { nickname, avatar, avatarBg, bio, snack, phone } -> saves the editable fields
import { db } from './_lib/db.js';
import { authedEmpId, json } from './_lib/auth.js';
import { AVATARS, cleanLook, loadRatings, shape, type Row } from './_lib/profile.js';

const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

export async function GET(req: Request): Promise<Response> {
  const id = authedEmpId(req);
  if (!id) return json({ ok: false, error: 'আবার লগইন করুন।' }, 401);
  const rows = await db()`select * from employees where emp_id = ${id}`;
  if (!rows[0]) return json({ ok: false, error: 'আবার লগইন করুন।' }, 401);
  return json({ ok: true, profile: shape(rows[0] as Row, (await loadRatings(db(), [id]))[id]) });
}

export async function POST(req: Request): Promise<Response> {
  const id = authedEmpId(req);
  if (!id) return json({ ok: false, error: 'আবার লগইন করুন।' }, 401);
  const b = await req.json().catch(() => null);
  if (!b) return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);
  const nickname = clean(b.nickname, 20);
  const bio = clean(b.bio, 80);
  const snack = clean(b.snack, 30);
  const phone = clean(b.phone, 20);
  const g = await db()`select gender from employees where emp_id = ${id}`;
  const look = cleanLook(b.look, (g[0]?.gender as string) || '');
  const model = Number.isInteger(b.model) && b.model >= 0 && b.model < 10 ? b.model : 0;
  const avatar = AVATARS.includes(b.avatar) ? b.avatar : AVATARS[0];
  const avatarBg = typeof b.avatarBg === 'string' && /^#[0-9a-fA-F]{6}$/.test(b.avatarBg) ? b.avatarBg : '#ffd9a8';
  if (phone && !/^[0-9+\-\s()]{5,20}$/.test(phone)) return json({ ok: false, error: 'ফোন নম্বরে শুধু সংখ্যা, + আর - চলবে।' }, 400);
  const rows = await db()`update employees set nickname = ${nickname}, avatar = ${avatar}, avatar_bg = ${avatarBg}, bio = ${bio}, snack = ${snack}, phone = ${phone}, model = ${model}, look = ${JSON.stringify(look)}
    where emp_id = ${id} returning *`;
  if (!rows[0]) return json({ ok: false, error: 'আবার লগইন করুন।' }, 401);
  return json({ ok: true, profile: shape(rows[0] as Row, (await loadRatings(db(), [id]))[id]) });
}
