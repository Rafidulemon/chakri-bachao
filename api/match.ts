// POST /api/match { game, order: [empId, ...], draw? }
// order lists everyone who played, best first. Records the match and moves your rating and XP.
import { db } from './_lib/db.js';
import { authedEmpId, json } from './_lib/auth.js';
import { GAMES, loadRatings, type Game } from './_lib/profile.js';

const COOLDOWN_SECONDS = 15;   // a match takes about a minute, so this stops XP being farmed with repeated posts
const K = 32;
const MIN_RATING = 100;

export async function POST(req: Request): Promise<Response> {
  const id = authedEmpId(req);
  if (!id) return json({ ok: false, error: 'আবার লগইন করুন।' }, 401);
  const b = await req.json().catch(() => null);
  const game = GAMES.find(g => g === b?.game) as Game | undefined;
  const order: string[] = Array.isArray(b?.order) ? b.order.filter((x: unknown): x is string => typeof x === 'string') : [];
  const draw = b?.draw === true;
  const n = order.length;
  if (!game || n < 2 || n > 4 || new Set(order).size !== n || !order.includes(id) || (draw && n !== 2)) return json({ ok: false, error: 'ভুল অনুরোধ।' }, 400);

  const sql = db();
  const found = await sql`select emp_id from employees where emp_id = any(${order})`;
  if (found.length !== n) return json({ ok: false, error: 'এই কর্মীকে খুঁজে পাওয়া যায়নি।' }, 404);
  const recent = await sql`select 1 from matches where emp_id = ${id} and played_at > now() - make_interval(secs => ${COOLDOWN_SECONDS})`;
  if (recent[0]) return json({ ok: false, error: 'একটু দম নিন, এত তাড়াতাড়ি আরেকটা খেলা সেভ হয় না।' }, 429);

  const all = await loadRatings(sql, order);
  const mine = all[id][game], place = order.indexOf(id) + 1;
  let sum = 0;
  order.forEach((o, i) => {
    if (o === id) return;
    const exp = 1 / (1 + Math.pow(10, (all[o][game] - mine) / 400));
    sum += (draw ? 0.5 : place - 1 < i ? 1 : 0) - exp;
  });
  const after = Math.max(MIN_RATING, mine + Math.round((K / (n - 1)) * sum));
  const won = place === 1 && !draw ? 1 : 0;
  const xpWant = draw ? 5 : place === 1 ? 25 : place === n ? -10 : 5;

  await sql`insert into ratings (emp_id, game, rating, played, wins) values (${id}, ${game}, ${after}, 1, ${won})
    on conflict (emp_id, game) do update set rating = ${after}, played = ratings.played + 1, wins = ratings.wins + ${won}`;
  const rows = await sql`update employees set xp = greatest(0, xp + ${xpWant}) where emp_id = ${id} returning xp`;
  const opp = order.find(o => o !== id) as string;
  await sql`insert into matches (emp_id, opp_id, game, result, xp_delta, place, players, rating_before, rating_after)
    values (${id}, ${opp}, ${game}, ${draw ? 'draw' : place === 1 ? 'win' : 'lose'}, ${xpWant}, ${place}, ${n}, ${mine}, ${after})`;
  return json({ ok: true, xp: Number(rows[0].xp), xpDelta: xpWant, place, n, draw, rating: { before: mine, after, delta: after - mine }, ratings: { ...all[id], [game]: after } });
}
