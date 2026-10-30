// POST /api/login  { email, empId }  -> checks the employee list, sets a 90-day cookie
import { db } from './_lib/db';
import { authCookie, json, normId } from './_lib/auth';
import { loadRatings, shape } from './_lib/profile';

const BAD = 'ইমেইল বা এমপ্লয়ি আইডি মেলেনি। এইচআর আপাকে জিজ্ঞেস করুন।';

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase().slice(0, 120) : '';
  const empId = typeof body?.empId === 'string' ? normId(body.empId).slice(0, 40) : '';
  if (!email || !empId) return json({ ok: false, error: BAD }, 401);

  const rows = await db()`select * from employees where lower(email) = ${email}`;
  const e = rows[0];
  // same answer for "no such email" and "wrong ID" so emails can't be probed
  if (!e || normId(e.emp_id) !== empId) return json({ ok: false, error: BAD }, 401);

  return json({ ok: true, employee: shape(e as Record<string, string | null>, (await loadRatings(db(), [e.emp_id as string]))[e.emp_id as string]) },
    200, { 'set-cookie': authCookie(e.emp_id) });
}
