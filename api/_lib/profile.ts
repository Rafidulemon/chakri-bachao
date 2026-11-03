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

const HEX = /^#[0-9a-fA-F]{6}$/;
// the custom look, cut down to the options this gender has (anything else a client sends is dropped)
export function cleanLook(raw: unknown, gender: string): Record<string, unknown> {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  const col = (k: string) => { const v = o[k]; if (typeof v === 'string' && HEX.test(v)) out[k] = v.toLowerCase(); };
  const bool = (k: string) => { if (typeof o[k] === 'boolean') out[k] = o[k]; };
  col('skin'); col('hair'); col('top'); col('bot'); bool('glasses');
  if (gender === 'female') {
    if (['long', 'bun', 'hijab'].includes(o.hs as string)) out.hs = o.hs;
    col('hijab'); bool('sandal');
    if (o.orna === null) out.orna = null; else col('orna');
  } else {
    if (['short', 'bald'].includes(o.hs as string)) out.hs = o.hs;
    if (['tee', 'polo', 'shirt'].includes(o.style as string)) out.style = o.style;
    if (['short', 'long'].includes(o.sleeve as string)) out.sleeve = o.sleeve;
    bool('beard'); bool('mous'); bool('jeans');
  }
  return out;
}
export function parseLook(v: unknown): Record<string, unknown> {
  if (typeof v !== 'string' || !v) return {};
  try { const o = JSON.parse(v); return o && typeof o === 'object' ? o : {}; } catch { return {}; }
}

export function shape(e: Row, ratings: Ratings = base()) {
  return {
    empId: e.emp_id, name: e.name, email: e.email, designation: e.designation, branch: e.branch, department: e.department,
    gender: e.gender === 'female' ? 'f' : e.gender === 'male' ? 'm' : '', nickname: e.nickname || '',
    avatar: e.avatar || (e.gender === 'female' ? '👩‍💻' : '🧑‍💻'), avatarBg: e.avatar_bg || '#ffd9a8',
    look: parseLook(e.look), xp: Number(e.xp) || 0, employment: e.employment == null ? 100 : Number(e.employment), model: e.model == null ? 0 : Number(e.model), bio: e.bio || '', snack: e.snack || '', phone: e.phone || '', ratings,
  };
}
