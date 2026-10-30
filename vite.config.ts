import { defineConfig, loadEnv, type Plugin } from 'vite';

// Dev only: serves the /api/*.ts functions from `npm run dev`, so `vercel dev` isn't needed.
function localApi(): Plugin {
  return {
    name: 'local-api',
    apply: 'serve',
    configureServer(server) {
      Object.assign(process.env, loadEnv('development', process.cwd(), ''));
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');
        const m = /^\/api\/([a-z]+)$/.exec(url.pathname);
        if (!m) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${m[1]}.ts`);
          const handler = mod[(req.method || 'GET').toUpperCase()];
          if (!handler) { res.statusCode = 405; res.end('Method not allowed'); return; }
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const body = chunks.length ? Buffer.concat(chunks) : undefined;
          const request = new Request(url, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body
          });
          const r: Response = await handler(request);
          res.statusCode = r.status;
          r.headers.forEach((v, k) => { if (k !== 'set-cookie') res.setHeader(k, v); });
          const cookies = r.headers.getSetCookie?.() ?? [];
          // the cookie is marked Secure for production; plain http://localhost needs it without
          if (cookies.length) res.setHeader('set-cookie', cookies.map(c => c.replace(/;\s*Secure/i, '')));
          res.end(Buffer.from(await r.arrayBuffer()));
        } catch (e) {
          console.error(e);
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: 'server error' }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [localApi()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500
  },
  server: {
    port: 5173,
    open: true
  }
});
