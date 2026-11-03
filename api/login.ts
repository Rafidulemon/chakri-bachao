// POST /api/login  { email, empId }  -> checks the employee list, sets a 90-day cookie
// GET  /api/login                    -> who is signed in on this browser (so a reload keeps you in)
import { db } from './_lib/db.js';
import { authCookie, authedEmpId, json, normId } from './_lib/auth.js';
import { DESK_COUNT, loadRatings, shape } from './_lib/profile.js';

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

  // first login: the employee gets the lowest free desk, for good
  if (e.desk == null) {
    for (let tries = 0; tries < 4 && e.desk == null; tries++) {
      try {
        const got = await db()`update employees set desk = (select s from generate_series(0, ${DESK_COUNT - 1}) s where s not in (select desk from employees where desk is not null) order by s limit 1)
          where emp_id = ${e.emp_id} and desk is null returning desk`;
        if (got[0]) e.desk = got[0].desk;
        else break;   // every desk is taken: this employee shares
      } catch { /* somebody took the same desk a moment ago: try the next free one */ }
    }
  }
  return json({ ok: true, serverNow: Date.now(), employee: shape(e as Record<string, string | null>, (await loadRatings(db(), [e.emp_id as string]))[e.emp_id as string]) },
    200, { 'set-cookie': authCookie(e.emp_id) });
}

export async function GET(req: Request): Promise<Response> {
  const id = authedEmpId(req);
  if (!id) return json({ ok: false }, 401);
  const rows = await db()`select * from employees where emp_id = ${id}`;
  const e = rows[0];
  if (!e) return json({ ok: false }, 401);
  return json({ ok: true, serverNow: Date.now(), employee: shape(e as Record<string, string | null>, (await loadRatings(db(), [e.emp_id as string]))[e.emp_id as string]) });
}
