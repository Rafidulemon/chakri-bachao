// Loads the employee list (columns: ELX ID, Name, Email, Designation, Branch, Department, Gender) into Neon.
// Usage: npm run db:import -- "C:\path\to\ECHO_Employee_List.xlsx"   (safe to re-run: it upserts)
import ExcelJS from 'exceljs';
import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const file = process.argv[2];
if (!file) { console.error('Usage: npm run db:import -- <employee-list.xlsx>'); process.exit(1); }
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is missing from .env'); process.exit(1); }

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
const ws = wb.worksheets[0];
const cell = (row, i) => {
  const v = row.getCell(i).value;
  const t = v && typeof v === 'object' ? (v.text ?? v.result ?? '') : v;
  return String(t ?? '').trim();
};

const rows = [];
ws.eachRow((row, n) => {
  if (n === 1) return;
  const r = { empId: cell(row, 1), name: cell(row, 2), email: cell(row, 3).toLowerCase(), designation: cell(row, 4), branch: cell(row, 5), department: cell(row, 6), gender: /^f/i.test(cell(row, 7)) ? 'female' : /^m/i.test(cell(row, 7)) ? 'male' : null };
  if (r.empId && r.email) rows.push(r);
});

const sql = neon(url);
for (const r of rows) {
  await sql.query(
    `insert into employees (emp_id, name, email, designation, branch, department, gender) values ($1,$2,$3,$4,$5,$6,$7)
     on conflict (emp_id) do update set name = excluded.name, email = excluded.email,
       designation = excluded.designation, branch = excluded.branch, department = excluded.department, gender = excluded.gender`,
    [r.empId, r.name, r.email, r.designation, r.branch, r.department, r.gender]);
}
const [{ count }] = await sql.query('select count(*)::int as count from employees');
console.log(`Imported ${rows.length} rows. employees table now has ${count}.`);
