// POST /api/presence { x, z, y, yaw, fx, walking, inOffice, pose, zone, act } -> saves where you are and returns everyone else who is online
// POST /api/presence { leave: true } -> you are offline right away (otherwise you drop off after ONLINE_SECONDS of silence)
import { db } from './_lib/db.js';
import { authedEmpId, json } from './_lib/auth.js';
import { ONLINE_SECONDS, parseLook } from './_lib/profile.js';
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
  const pose = typeof b.pose === 'string' && /^(sit|smoke|stand|e:[a-z]{2,10})$/.test(b.pose) ? b.pose : 'stand';
  await sql`insert into presence (emp_id, x, z, y, yaw, walking, in_office, pose, zone, act, fx, updated_at)
    values (${id}, ${num(b.x, 100)}, ${num(b.z, 100)}, ${num(b.y, 5)}, ${num(b.yaw, 10)}, ${b.walking === true}, ${b.inOffice === true}, ${pose}, ${txt(b.zone, 16)}, ${txt(b.act, 120)}, ${txt(b.fx, 24)}, now())
    on conflict (emp_id) do update set x = excluded.x, z = excluded.z, y = excluded.y, yaw = excluded.yaw, walking = excluded.walking, in_office = excluded.in_office,
      pose = excluded.pose, zone = excluded.zone, act = excluded.act, fx = excluded.fx, updated_at = now()`;
  const rows = await sql`select p.emp_id, p.x, p.z, p.y, p.fx, p.yaw, p.walking, p.in_office, p.pose, p.zone, p.act, e.name, e.gender, e.model, e.look, e.nickname
    from presence p join employees e on e.emp_id = p.emp_id
    where p.emp_id <> ${id} and p.updated_at > now() - make_interval(secs => ${ONLINE_SECONDS})`;
  const live = await loadLive(sql, id);
  // someone slapped you and you haven't complained yet / someone you slapped has complained and you haven't been told yet
  const slapped = await sql`select s.id, s.from_id, s.kind, e.name from slaps s join employees e on e.emp_id = s.from_id
    where s.to_id = ${id} and s.status = 'slapped' and s.created_at > now() - interval '2 minutes'`;
  const notices = await sql`select s.id, s.kind, e.name as victim, s.delta, s.rating_before, s.rating_after from slaps s join employees e on e.emp_id = s.to_id
    where s.from_id = ${id} and s.status = 'complained' and s.delivered = false`;
  const socialIn = await sql`select s.id, s.from_id, e.name from socials s join employees e on e.emp_id = s.from_id
    where s.to_id = ${id} and s.status = 'sent' and s.created_at > now() - interval '45 seconds'`;
  const socialOut = await sql`select s.id, s.status, e.name from socials s join employees e on e.emp_id = s.to_id
    where s.from_id = ${id} and s.status in ('accepted', 'declined') and s.seen = false`;
  if (socialOut.length) await sql`update socials set seen = true where id = any(${socialOut.map(n => Number(n.id))})`;
  if (notices.length) await sql`update slaps set delivered = true where id = any(${notices.map(n => Number(n.id))})`;
  return json({
    ok: true,
    live,
    slapped: slapped.map(s => ({ id: Number(s.id), fromId: s.from_id, kind: s.kind, name: s.name })),
    socialIn: socialIn.map(s => ({ id: Number(s.id), fromId: s.from_id, name: s.name })),
    socialOut: socialOut.map(s => ({ id: Number(s.id), status: s.status, name: s.name })),
    notices: notices.map(n => ({ id: Number(n.id), kind: n.kind, victim: n.victim, delta: Number(n.delta), before: Number(n.rating_before), after: Number(n.rating_after) })),
    serverNow: Date.now(),
    players: rows.map(r => ({
      empId: r.emp_id, name: r.name, nickname: r.nickname || '', gender: r.gender === 'female' ? 'f' : r.gender === 'male' ? 'm' : '', model: r.model == null ? 0 : Number(r.model), look: parseLook(r.look),
      x: Number(r.x), z: Number(r.z), y: Number(r.y), fx: r.fx || '', yaw: Number(r.yaw), walking: r.walking === true, inOffice: r.in_office === true, pose: r.pose, zone: r.zone, act: r.act,
    })),
  });
}
