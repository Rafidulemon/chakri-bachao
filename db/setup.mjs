// Creates the tables in Neon. Run once: npm run db:setup
import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is missing. Copy .env.example to .env and fill it in.'); process.exit(1); }
const sql = neon(url);
const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
for (const stmt of schema.split(';').map(s => s.trim()).filter(Boolean)) await sql.query(stmt);
console.log('Database ready: scores and employees tables created.');
