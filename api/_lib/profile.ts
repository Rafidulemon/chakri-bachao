// Shared by login, profile and employees endpoints
import type { db } from './db.js';

export const AVATARS = ['🧑‍💻', '👩‍💻', '🥷', '🧙', '🦸', '🧞', '🧛', '🤖', '👽', '🐱', '🐵', '🦊', '🐼', '🐸', '🦁', '🐧', '🐯', '🐰', '🦄', '💩'];
export const GAMES = ['pool', 'carrom', 'uno', 'chess', 'ludo'] as const;
// seconds of silence before someone counts as offline
export const ONLINE_SECONDS = 12;
export type Game = (typeof GAMES)[number];
export type Ratings = Record<Game, number>;

export type Row = Record<string, string | null>;

const base = (): Ratings => ({ pool: 1000, carrom: 1000, uno: 1000, chess: 1000, ludo: 1000 });

// ratings for several employees at once; anyone without a row for a game is on 1000
export async function loadRatings(sql: ReturnType<typeof db>, ids: string[]): Promise<Record<string, Ratings>> {
  const out: Record<string, Ratings> = {};
  for (const id of ids) out[id] = base();
  if (!ids.length) return out;
  const rows = await sql`select emp_id, game, rating from ratings where emp_id = any(${ids})`;
  for (const r of rows) if (out[r.emp_id as string]) out[r.emp_id as string][r.game as Game] = Number(r.rating);
  return out;
}

export function shape(e: Row, ratings: Ratings = base()) {
  return {
    empId: e.emp_id, name: e.name, email: e.email, designation: e.designation, branch: e.branch, department: e.department,
    gender: e.gender === 'female' ? 'f' : e.gender === 'male' ? 'm' : '', nickname: e.nickname || '',
    avatar: e.avatar || (e.gender === 'female' ? '👩‍💻' : '🧑‍💻'), avatarBg: e.avatar_bg || '#ffd9a8',
    xp: Number(e.xp) || 0, employment: e.employment == null ? 100 : Number(e.employment), model: e.model == null ? 0 : Number(e.model), bio: e.bio || '', snack: e.snack || '', phone: e.phone || '', ratings,
  };
}
