// POST /api/social { action: 'send', target, kind: 'smoke' }   -> invite a colleague who is online
// POST /api/social { action: 'respond', id, accept }            -> answer an invitation you received
import { db } from './_lib/db.js';
import { authedEmpId, json } from './_lib/auth.js';
import { ONLINE_SECONDS } from './_lib/profile.js';

const COOLDOWN_SECONDS = 8;

export async function POST(req: Request): Promise<Response> {
  const me = authedEmpId(req);
  if (!me) return json({ ok: false, error: 'আবার লগইন করুন।' }, 401);
  const b = await req.json().catch(() => null);
  if (!b) return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);
  const sql = db();

  if (b.action === 'send') {
    const target = typeof b.target === 'string' ? b.target : '';
    if (!target || target === me || b.kind !== 'smoke') return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);
    const online = await sql`select 1 from presence where emp_id = ${target} and in_office and zone = 'bal' and updated_at > now() - make_interval(secs => ${ONLINE_SECONDS})`;
    if (!online[0]) return json({ ok: false, error: 'উনি এখন বারান্দায় নেই।' }, 409);
    const recent = await sql`select 1 from socials where from_id = ${me} and created_at > now() - make_interval(secs => ${COOLDOWN_SECONDS})`;
    if (recent[0]) return json({ ok: false, error: 'একটু দম নিন, এত তাড়াতাড়ি আরেকবার ডাকা যায় না।' }, 429);
    const rows = await sql`insert into socials (from_id, to_id, kind) values (${me}, ${target}, 'smoke') returning id`;
    return json({ ok: true, id: Number(rows[0].id) });
  }

  if (b.action === 'respond') {
    const id = Number(b.id);
    if (!Number.isInteger(id)) return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);
    const rows = await sql`update socials set status = ${b.accept === true ? 'accepted' : 'declined'}
      where id = ${id} and to_id = ${me} and status = 'sent' and created_at > now() - interval '60 seconds' returning from_id`;
    if (!rows[0]) return json({ ok: false, error: 'এই ডাকের সময় পেরিয়ে গেছে।' }, 404);
    return json({ ok: true, fromId: rows[0].from_id });
  }

  return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);
}
