// POST /api/live  { action: 'create' | 'respond' | 'go' | 'cancel', ... }  live challenges between people who are online
import { db } from './_lib/db.js';
import { authedEmpId, json } from './_lib/auth.js';
import { GAMES, ONLINE_SECONDS } from './_lib/profile.js';
import { LIVE_MAX, WALK_SECONDS, loadLive, type LivePlayer } from './_lib/live.js';

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export async function POST(req: Request): Promise<Response> {
  const me = authedEmpId(req);
  if (!me) return json({ ok: false, error: 'আবার লগইন করুন।' }, 401);
  const b = await req.json().catch(() => null);
  if (!b) return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);
  const sql = db();

  if (b.action === 'create') {
    const game = GAMES.find(g => g === b.game);
    const inv = [...new Set(strings(b.invitees))].filter(x => x !== me);
    const sims = [...new Set(strings(b.sims))].filter(x => x !== me && !inv.includes(x));
    const table = Number.isInteger(b.table) ? b.table : -1;
    if (!game || !inv.length || 1 + inv.length + sims.length > LIVE_MAX[game]) return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);
    const dine = game === 'uno' || game === 'chess' || game === 'ludo';
    if (dine ? table < 0 || table > 5 : table !== -1) return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);
    const online = await sql`select emp_id from presence where emp_id = any(${inv}) and updated_at > now() - make_interval(secs => ${ONLINE_SECONDS})`;
    if (online.length !== inv.length) return json({ ok: false, error: 'যাকে ডেকেছেন তিনি এইমাত্র অফলাইন হয়ে গেছেন।' }, 409);
    const known = await sql`select emp_id from employees where emp_id = any(${[...inv, ...sims]})`;
    if (known.length !== inv.length + sims.length) return json({ ok: false, error: 'এই কর্মীকে খুঁজে পাওয়া যায়নি।' }, 404);
    await sql`update live_matches set status = 'cancel' where host_id = ${me} and status in ('invite', 'go')`;
    const players: LivePlayer[] = inv.map(id => ({ id, state: 'invited' }));
    const rows = await sql`insert into live_matches (game, host_id, table_idx, players, sim_ids)
      values (${game}, ${me}, ${table}, ${JSON.stringify(players)}::jsonb, ${JSON.stringify(sims)}::jsonb) returning id`;
    return json({ ok: true, id: Number(rows[0].id) });
  }

  const id = Number(b.id);
  if (!Number.isInteger(id)) return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);
  const cur = await sql`select host_id, status, players, sim_ids from live_matches where id = ${id} and created_at > now() - interval '3 minutes'`;
  const m = cur[0];
  if (!m) return json({ ok: false, error: 'এই চ্যালেঞ্জের সময় পেরিয়ে গেছে।' }, 404);
  const players = m.players as LivePlayer[];

  if (b.action === 'respond') {
    const p = players.find(x => x.id === me);
    if (!p || m.status !== 'invite') return json({ ok: false, error: 'এই চ্যালেঞ্জ আর চালু নেই।' }, 409);
    p.state = b.accept === true ? 'accepted' : 'declined';
    await sql`update live_matches set players = ${JSON.stringify(players)}::jsonb where id = ${id}`;
    return json({ ok: true });
  }

  if (m.host_id !== me) return json({ ok: false, error: 'শুধু যিনি ডেকেছেন তিনিই এটা করতে পারেন।' }, 403);

  if (b.action === 'cancel') {
    await sql`update live_matches set status = 'cancel' where id = ${id}`;
    return json({ ok: true });
  }

  if (b.action === 'go') {
    if (m.status !== 'invite') return json({ ok: false, error: 'এই চ্যালেঞ্জ আর চালু নেই।' }, 409);
    const accepted = players.filter(p => p.state === 'accepted').map(p => p.id);
    if (!accepted.length) return json({ ok: false, error: 'কেউ রাজি হয়নি।' }, 409);
    const order = [me, ...accepted, ...(m.sim_ids as string[])];
    const seed = Math.floor(Math.random() * 2147483646) + 1;
    await sql`update live_matches set status = 'go', order_ids = ${JSON.stringify(order)}::jsonb, seed = ${seed},
      start_at = now() + make_interval(secs => ${WALK_SECONDS}) where id = ${id}`;
    const [live] = await loadLive(sql, me, id);
    return json({ ok: true, live, serverNow: Date.now() });
  }

  return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);
}
