// GET /api/employees -> everyone you can invite to a game, with their ratings (needs login)
import { db } from './_lib/db';
import { authedEmpId, json } from './_lib/auth';
import { loadRatings, ONLINE_SECONDS } from './_lib/profile';

export async function GET(req: Request): Promise<Response> {
  const id = authedEmpId(req);
  if (!id) return json({ ok: false, error: 'আবার লগইন করুন।' }, 401);
  const sql = db();
  const rows = await sql`select e.emp_id, e.name, e.designation, e.department, e.nickname, e.avatar, e.avatar_bg, e.xp, e.gender, e.model, p.act,
    (p.updated_at > now() - make_interval(secs => ${ONLINE_SECONDS})) as online
    from employees e left join presence p on p.emp_id = e.emp_id where e.emp_id <> ${id} order by e.name`;
  const ratings = await loadRatings(sql, rows.map(e => e.emp_id as string));
  return json({
    ok: true,
    employees: rows.map(e => ({
      empId: e.emp_id, name: e.name, designation: e.designation || '', department: e.department || '',
      nickname: e.nickname || '', avatar: e.avatar || (e.gender === 'female' ? '👩‍💻' : '🧑‍💻'),
      gender: e.gender === 'female' ? 'f' : e.gender === 'male' ? 'm' : '',
      avatarBg: e.avatar_bg || '#ffd9a8', xp: Number(e.xp) || 0, model: e.model == null ? 0 : Number(e.model), ratings: ratings[e.emp_id as string], online: e.online === true, act: e.online === true ? e.act || '' : '',
    })),
  });
}
