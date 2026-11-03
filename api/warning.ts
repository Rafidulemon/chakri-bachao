// POST /api/warning { boss: 'ceo' | 'hr' | 'mgr' } -> a boss caught you in the game room: your employment rating goes down
import { db } from './_lib/db.js';
import { authedEmpId, json } from './_lib/auth.js';

const CUT: Record<string, number> = { ceo: 10, hr: 7, mgr: 5 };
const COOLDOWN_SECONDS = 45;   // one letter at a time, so a stuck client can't wipe someone's rating

export async function POST(req: Request): Promise<Response> {
  const id = authedEmpId(req);
  if (!id) return json({ ok: false, error: 'আবার লগইন করুন।' }, 401);
  const b = await req.json().catch(() => null);
  const boss = typeof b?.boss === 'string' && b.boss in CUT ? b.boss : '';
  if (!boss) return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);
  const sql = db();
  const recent = await sql`select 1 from warnings where emp_id = ${id} and boss <> 'couple' and created_at > now() - make_interval(secs => ${COOLDOWN_SECONDS})`;
  if (recent[0]) return json({ ok: false, error: 'এইমাত্র একটা চিঠি পেয়েছেন, এবার রেটিং কাটা হলো না। ভাগ্য ভালো!' }, 429);
  const cur = await sql`select employment from employees where emp_id = ${id}`;
  if (!cur[0]) return json({ ok: false, error: 'আবার লগইন করুন।' }, 401);
  const before = Number(cur[0].employment);
  const rows = await sql`update employees set employment = greatest(0, employment - ${CUT[boss]}) where emp_id = ${id} returning employment`;
  const after = Number(rows[0].employment);
  await sql`insert into warnings (emp_id, boss, delta) values (${id}, ${boss}, ${before - after})`;
  return json({ ok: true, before, employment: after, delta: before - after });
}
