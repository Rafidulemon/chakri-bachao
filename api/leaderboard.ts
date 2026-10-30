// GET /api/leaderboard?period=week|all  -> top 20 workdays ("Employee of the Month" wall)
import { db } from './_lib/db';
import { json } from './_lib/auth';

export async function GET(req: Request): Promise<Response> {
  const period = new URL(req.url).searchParams.get('period') === 'all' ? 'all' : 'week';
  const sql = db();
  const rows = period === 'all'
    ? await sql`select player_name, role, score, title, survived, played_at from scores order by score desc limit 20`
    : await sql`select player_name, role, score, title, survived, played_at from scores
                where played_at > now() - interval '7 days' order by score desc limit 20`;
  return json({ ok: true, period, rows }, 200, { 'cache-control': 's-maxage=30, stale-while-revalidate=60' });
}
