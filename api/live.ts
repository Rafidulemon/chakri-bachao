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
    if (dine ? table < 0 || table > 5 : table !== -1 && table !== -2) return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);
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
  const cur = await sql`select host_id, status, players, sim_ids, order_ids from live_matches where id = ${id} and created_at > now() - interval '3 minutes'`;
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

  if (b.action === 'move') {
    // a choice in a turn-based game: it must be added at exactly the next position of the log, so two copies of the same move can't both land
    const order = (m.order_ids as string[] | null) || [];
    const p = Number(b.p), seq = Number(b.seq);
    const a = b.a && typeof b.a === 'object' ? b.a : null;
    if (m.status !== 'go' || !order.includes(me) || !a || !Number.isInteger(p) || p < 0 || p >= order.length || !Number.isInteger(seq) || seq < 0 || seq > 5000)
      return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);
    const auto = a.auto === 1;
    if (!auto && order[p] !== me) return json({ ok: false, error: 'এটা আপনার চাল নয়।' }, 403);
    const entry: Record<string, unknown> = { p };
    if (Number.isInteger(a.t)) entry.t = a.t;
    if (Number.isInteger(a.c)) entry.c = a.c;
    if (typeof a.col === 'string' && /^[RYGB]$/.test(a.col)) entry.col = a.col;
    if (a.draw === 1) entry.draw = 1;
    if (auto) entry.auto = 1;
    if (a.quit === 1) entry.quit = 1;
    // a pool shot: the angle, the power (0 to 1) and, after a foul, where the cue ball was placed
    const num = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
    if (num(a.ang, -10, 10)) entry.ang = a.ang;
    if (num(a.pw, 0, 1)) entry.pw = a.pw;
    if (num(a.sx, -1, 1)) entry.sx = a.sx;
    if (num(a.sy, -1, 1)) entry.sy = a.sy;
    if (num(a.cx, -5, 5) && num(a.cz, -5, 5)) { entry.cx = a.cx; entry.cz = a.cz; }
    const rows = await sql`update live_matches set moves = moves || ${JSON.stringify([entry])}::jsonb
      where id = ${id} and status = 'go' and jsonb_array_length(moves) = ${seq} returning jsonb_array_length(moves) as n`;
    if (!rows[0]) return json({ ok: false, error: 'এই চাল আগেই পড়ে গেছে।', stale: true }, 409);
    return json({ ok: true, n: Number(rows[0].n), entry });
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
