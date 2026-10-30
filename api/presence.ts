// POST /api/presence { x, z, yaw, walking, inOffice, pose, zone, act } -> saves where you are and returns everyone else who is online
// POST /api/presence { leave: true } -> you are offline right away (otherwise you drop off after ONLINE_SECONDS of silence)
import { db } from './_lib/db.js';
import { authedEmpId, json } from './_lib/auth.js';
import { ONLINE_SECONDS } from './_lib/profile.js';
import { loadLive } from './_lib/live.js';

const num = (v: unknown, lim: number): number => (typeof v === 'number' && isFinite(v) ? Math.max(-lim, Math.min(lim, v)) : 0);
const txt = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');

export async function POST(req: Request): Promise<Response> {
  const id = authedEmpId(req);
  if (!id) return json({ ok: false, error: 'আবার লগইন করুন।' }, 401);
  const b = await req.json().catch(() => null);
  const sql = db();
  if (b?.leave === true) {
    await sql`delete from presence where emp_id = ${id}`;
    return json({ ok: true });
  }
  if (!b) return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);
  const pose = b.pose === 'sit' ? 'sit' : 'stand';
  await sql`insert into presence (emp_id, x, z, yaw, walking, in_office, pose, zone, act, updated_at)
    values (${id}, ${num(b.x, 100)}, ${num(b.z, 100)}, ${num(b.yaw, 10)}, ${b.walking === true}, ${b.inOffice === true}, ${pose}, ${txt(b.zone, 16)}, ${txt(b.act, 120)}, now())
    on conflict (emp_id) do update set x = excluded.x, z = excluded.z, yaw = excluded.yaw, walking = excluded.walking, in_office = excluded.in_office,
      pose = excluded.pose, zone = excluded.zone, act = excluded.act, updated_at = now()`;
  const rows = await sql`select p.emp_id, p.x, p.z, p.yaw, p.walking, p.in_office, p.pose, p.zone, p.act, e.name, e.gender, e.model, e.nickname
    from presence p join employees e on e.emp_id = p.emp_id
    where p.emp_id <> ${id} and p.updated_at > now() - make_interval(secs => ${ONLINE_SECONDS})`;
  const live = await loadLive(sql, id);
  return json({
    ok: true,
    live,
    serverNow: Date.now(),
    players: rows.map(r => ({
      empId: r.emp_id, name: r.name, nickname: r.nickname || '', gender: r.gender === 'female' ? 'f' : r.gender === 'male' ? 'm' : '', model: r.model == null ? 0 : Number(r.model),
      x: Number(r.x), z: Number(r.z), yaw: Number(r.yaw), walking: r.walking === true, inOffice: r.in_office === true, pose: r.pose, zone: r.zone, act: r.act,
    })),
  });
}
