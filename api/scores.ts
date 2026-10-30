// POST /api/scores { role, score, title, survived }  (name comes from the login) -> saves one finished workday
import { db } from './_lib/db.js';
import { authedEmpId, json } from './_lib/auth.js';

const ROLES = new Set(['se', 'qa', 'des', 'hr', 'peon', 'ceo']);

export async function POST(req: Request): Promise<Response> {
  const empId = authedEmpId(req);
  if (!empId) return json({ ok: false, error: 'login required' }, 401);
  const b = await req.json().catch(() => null);
  const role = typeof b?.role === 'string' && ROLES.has(b.role) ? b.role : null;
  const score = Number.isInteger(b?.score) ? Math.max(0, Math.min(b.score, 1_000_000)) : null;
  if (!role || score === null) return json({ ok: false, error: 'invalid score' }, 400);
  const title = typeof b?.title === 'string' ? b.title.slice(0, 60) : null;
  const survived = b?.survived !== false;
  const sql = db();
  const who = await sql`select name from employees where emp_id = ${empId}`;
  if (!who[0]) return json({ ok: false, error: 'unknown employee' }, 401);
  const name = String(who[0].name).slice(0, 24);
  const rows = await sql`insert into scores (player_name, role, score, title, survived, emp_id)
                         values (${name}, ${role}, ${score}, ${title}, ${survived}, ${empId})
                         returning id, played_at`;
  return json({ ok: true, saved: rows[0] });
}
