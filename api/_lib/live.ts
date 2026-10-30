// Live challenges: shared by /api/live and /api/presence
import type { db } from './db';

type Sql = ReturnType<typeof db>;

export const LIVE_MAX: Record<string, number> = { pool: 2, carrom: 2, chess: 2, uno: 4, ludo: 4 };
export const WALK_SECONDS = 20;   // from "go" until the game starts: time for everyone to walk to their seats

export interface LivePlayer { id: string; state: 'invited' | 'accepted' | 'declined' }

// every live match I am part of (as host or invited), newest few minutes only
export async function loadLive(sql: Sql, me: string, onlyId?: number) {
  const rows = await sql`select id, game, host_id, table_idx, status, players, sim_ids, order_ids, seed,
      (extract(epoch from start_at) * 1000)::float8 as start_ms
    from live_matches
    where created_at > now() - interval '3 minutes'
      and (host_id = ${me} or players @> ${JSON.stringify([{ id: me }])}::jsonb)
      and (${onlyId ?? null}::bigint is null or id = ${onlyId ?? null}::bigint)
    order by id`;
  if (!rows.length) return [];
  const ids = new Set<string>();
  for (const r of rows) {
    ids.add(r.host_id as string);
    for (const p of r.players as LivePlayer[]) ids.add(p.id);
    for (const s of r.sim_ids as string[]) ids.add(s);
  }
  const people = await sql`select emp_id, name, nickname, gender, model from employees where emp_id = any(${[...ids]})`;
  const parts = people.map(e => ({
    empId: e.emp_id, name: e.name, nickname: e.nickname || '',
    gender: e.gender === 'female' ? 'f' : e.gender === 'male' ? 'm' : '', model: e.model == null ? 0 : Number(e.model),
  }));
  return rows.map(r => ({
    id: Number(r.id), game: r.game, hostId: r.host_id, table: Number(r.table_idx), status: r.status,
    players: r.players, simIds: r.sim_ids, order: r.order_ids, seed: r.seed, startAtMs: r.start_ms,
    parts,
  }));
}
