// POST /api/slap { action: 'slap', target }    -> you slapped a colleague who is online
// POST /api/slap { action: 'complain', id }    -> the slapped colleague has filed the complaint with HR: the slapper is cut
// POST /api/slap { action: 'boss', boss, kind }    -> you hit the CEO, HR or your manager: very serious trouble
// POST /api/slap { action: 'npc' }             -> you slapped a simulated colleague: HR sends you a (smaller) show-cause too
import { db } from './_lib/db.js';
import { authedEmpId, json } from './_lib/auth.js';
import { ONLINE_SECONDS } from './_lib/profile.js';

const CUT_USER: Record<string, number> = { slap: 15, kick: 12, desk: 10 };
const CUT_NPC: Record<string, number> = { slap: 8, kick: 6, desk: 5 };
const CUT_BOSS: Record<string, number> = { ceo: 40, hr: 30, mgr: 25 };   // hitting a superior is serious
const XP_BOSS = 40;
const CUT_DEFY = 5;   // refusing to apologise after a show-cause letter
const SLAP_COOLDOWN = 10;   // seconds between slaps per person

export async function POST(req: Request): Promise<Response> {
  const me = authedEmpId(req);
  if (!me) return json({ ok: false, error: 'আবার লগইন করুন।' }, 401);
  const b = await req.json().catch(() => null);
  if (!b) return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);
  const sql = db();

  if (b.action === 'slap') {
    const target = typeof b.target === 'string' ? b.target : '';
    if (!target || target === me) return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);
    const online = await sql`select 1 from presence where emp_id = ${target} and updated_at > now() - make_interval(secs => ${ONLINE_SECONDS})`;
    if (!online[0]) return json({ ok: false, error: 'উনি এইমাত্র অফলাইন হয়ে গেছেন।' }, 409);
    const recent = await sql`select 1 from slaps where from_id = ${me} and created_at > now() - make_interval(secs => ${SLAP_COOLDOWN})`;
    if (recent[0]) return json({ ok: false, error: 'হাত একটু বিশ্রাম নিক, এত তাড়াতাড়ি আরেকটা চড় নয়।' }, 429);
    const kind = b.kind === 'kick' || b.kind === 'desk' ? b.kind : 'slap';
    const rows = await sql`insert into slaps (from_id, to_id, kind) values (${me}, ${target}, ${kind}) returning id`;
    return json({ ok: true, id: Number(rows[0].id) });
  }

  if (b.action === 'complain') {
    const id = Number(b.id);
    if (!Number.isInteger(id)) return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);
    const rows = await sql`select from_id, kind from slaps where id = ${id} and to_id = ${me} and status = 'slapped' and created_at > now() - interval '5 minutes'`;
    if (!rows[0]) return json({ ok: false, error: 'এই অভিযোগ আর নেওয়া যাচ্ছে না।' }, 404);
    const from = rows[0].from_id as string;
    const cut = CUT_USER[rows[0].kind as string] ?? 15;
    const cur = await sql`select employment from employees where emp_id = ${from}`;
    const before = Number(cur[0].employment);
    const upd = await sql`update employees set employment = greatest(0, employment - ${cut}) where emp_id = ${from} returning employment`;
    const after = Number(upd[0].employment);
    await sql`insert into warnings (emp_id, boss, delta) values (${from}, 'slap', ${before - after})`;
    await sql`update slaps set status = 'complained', delta = ${before - after}, rating_before = ${before}, rating_after = ${after}, complained_at = now() where id = ${id}`;
    return json({ ok: true });
  }

  if (b.action === 'defy') {
    const letter = await sql`select 1 from warnings where emp_id = ${me} and boss <> 'defy' and created_at > now() - interval '3 minutes'`;
    if (!letter[0]) return json({ ok: false, error: 'এখন ক্ষমা না চাওয়ার মতো কোনো চিঠি নেই।' }, 404);
    const again = await sql`select 1 from warnings where emp_id = ${me} and boss = 'defy' and created_at > now() - interval '3 minutes'`;
    if (again[0]) return json({ ok: false, error: 'একবার জেদ দেখানোই যথেষ্ট!' }, 429);
    const cur = await sql`select employment from employees where emp_id = ${me}`;
    const before = Number(cur[0].employment);
    const upd = await sql`update employees set employment = greatest(0, employment - ${CUT_DEFY}) where emp_id = ${me} returning employment`;
    const after = Number(upd[0].employment);
    await sql`insert into warnings (emp_id, boss, delta) values (${me}, 'defy', ${before - after})`;
    return json({ ok: true, before, employment: after, delta: before - after });
  }

  if (b.action === 'boss') {
    const boss = typeof b.boss === 'string' && b.boss in CUT_BOSS ? b.boss : '';
    if (!boss) return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);
    const recent = await sql`select 1 from warnings where emp_id = ${me} and boss = 'trouble' and created_at > now() - interval '30 seconds'`;
    if (recent[0]) return json({ ok: false, error: 'এইমাত্র একবার ধরা খেয়েছেন, এবার ছাড় পেলেন!' }, 429);
    const cur = await sql`select employment from employees where emp_id = ${me}`;
    if (!cur[0]) return json({ ok: false, error: 'আবার লগইন করুন।' }, 401);
    const before = Number(cur[0].employment);
    const upd = await sql`update employees set employment = greatest(0, employment - ${CUT_BOSS[boss]}), xp = greatest(0, xp - ${XP_BOSS}) where emp_id = ${me} returning employment, xp`;
    const after = Number(upd[0].employment);
    await sql`insert into warnings (emp_id, boss, delta) values (${me}, 'trouble', ${before - after})`;
    return json({ ok: true, before, employment: after, delta: before - after, xp: Number(upd[0].xp) });
  }

  if (b.action === 'npc') {
    const recent = await sql`select 1 from warnings where emp_id = ${me} and boss = 'slapnpc' and created_at > now() - interval '20 seconds'`;
    if (recent[0]) return json({ ok: false, error: 'আবার? এইচআর আপাকে একটু দম নিতে দিন।' }, 429);
    const cur = await sql`select employment from employees where emp_id = ${me}`;
    if (!cur[0]) return json({ ok: false, error: 'আবার লগইন করুন।' }, 401);
    const before = Number(cur[0].employment);
    const nk = b.kind === 'kick' || b.kind === 'desk' ? b.kind : 'slap';
    const upd = await sql`update employees set employment = greatest(0, employment - ${CUT_NPC[nk]}) where emp_id = ${me} returning employment`;
    const after = Number(upd[0].employment);
    await sql`insert into warnings (emp_id, boss, delta) values (${me}, 'slapnpc', ${before - after})`;
    return json({ ok: true, before, employment: after, delta: before - after });
  }

  return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);
}
