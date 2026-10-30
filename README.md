# চাকরি বাঁচাও (Chakri Bachao)

A funny 3D office survival game for the team. Survive the workday, dodge the boss, save your job.

## Stack
- **Game:** Vite + TypeScript + Three.js (r128) + Rapier physics + Howler.js audio
- **API:** Vercel Functions in `/api`
- **Database:** Neon Postgres (`@neondatabase/serverless`)

## 1. First-time setup (Windows)
Requires **Node.js 20 or newer** (https://nodejs.org) and **Git**.

```powershell
cd "D:\My projects\chakri-bachao"
npm install
npm run dev
```
The game opens at http://localhost:5173. Or just double-click `setup.bat`.

## 2. Connect the Neon database
1. Create a free project at https://neon.com and copy the **pooled** connection string.
2. Copy `.env.example` to `.env` and paste it into `DATABASE_URL`. Also set `TEAM_PASSCODE` and `COOKIE_SECRET`.
3. Create the tables:
   ```powershell
   npm run db:setup
   ```

## 3. Run with the API locally
```powershell
npx vercel login
npx vercel link
npx vercel dev
```
`vercel dev` serves the game and the `/api` functions together and reads `.env`.

## 4. Deploy
1. Push the folder to a new GitHub repository.
2. On https://vercel.com, import the repo (framework: Vite is detected from `vercel.json`).
3. In **Project Settings > Environment Variables**, add `DATABASE_URL`, `TEAM_PASSCODE`, `COOKIE_SECRET`.
4. Every push to `main` deploys; every branch gets a preview link.

Note: Vercel's free Hobby plan is for personal, non-commercial use. If this becomes an official company project, use Vercel Pro or move hosting to Cloudflare Pages (the code works there too).

## API
| Method | Path | Body / query | Purpose |
|---|---|---|---|
| POST | `/api/login` | `{ passcode }` | Sets a 90-day team cookie |
| POST | `/api/scores` | `{ name, role, score, title, survived }` | Saves a finished workday (needs login cookie) |
| GET | `/api/leaderboard` | `?period=week` or `?period=all` | Top 20 workdays |

## Project layout
```
index.html            page markup (login card, panel, HUD)
src/main.ts           entry point
src/game/office.js    office, people, pool, carrom, gate, login logic (ported prototype)
src/styles/main.css   all styles
api/                  Vercel Functions (login, scores, leaderboard)
db/schema.sql         Neon tables; db/setup.mjs creates them
```

## Next steps
- Split `src/game/office.js` into `world/`, `people/`, `games/`, `player/`, `ui/` modules as features are added.
- Add the day timer, job meter (চাকরির মিটার), tasks and the অফিস আদেশ result memo.
- Call `/api/scores` at the end of each day and show `/api/leaderboard` on the start screen.
