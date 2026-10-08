import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AuthStore } from './auth.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const auth = new AuthStore(path.resolve(process.env.ACCOUNT_FILE ?? path.join(root, '.data/accounts.json')));
await auth.init();
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '4kb' }));
app.use((_req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
  next();
});
const allowed = new Set((process.env.APP_ORIGIN ?? 'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:3001,http://localhost:3001').split(','));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.method !== 'GET' && (!req.headers.origin || !allowed.has(req.headers.origin))) { res.status(403).json({ error: 'Request origin is not permitted.' }); return; }
  if (req.method === 'POST' && !req.is('application/json')) { res.status(415).json({ error: 'JSON requests are required.' }); return; }
  next();
});
const tokenFrom = (req: express.Request) => (req.headers.cookie ?? '').split('; ').find(c => c.startsWith('kalash_session='))?.slice('kalash_session='.length) ?? '';
const cookieOptions = { httpOnly: true, sameSite: 'strict' as const, secure: process.env.COOKIE_SECURE === 'true', path: '/', maxAge: 86_400_000 };
const attempts = new Map<string, { count: number; expires: number }>();
app.post('/api/auth/:action', async (req, res) => {
  const action = req.params.action;
  if (action === 'logout') {
    auth.revoke(tokenFrom(req)); res.clearCookie('kalash_session', cookieOptions).json({ ok: true }); return;
  }
  if (!['signup', 'signin'].includes(action)) { res.status(404).json({ error: 'Not found.' }); return; }
  for (const [key, record] of attempts) if (record.expires < Date.now()) attempts.delete(key);
  const ip = req.ip ?? 'local';
  const record = attempts.get(ip) ?? { count: 0, expires: Date.now() + 15 * 60_000 };
  attempts.set(ip, record);
  if (++record.count > 30) { res.status(429).json({ error: 'Too many attempts. Please try again in 15 minutes.' }); return; }
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string' || username.length > 24 || password.length > 128) { res.status(400).json({ error: 'Enter a valid username and password.' }); return; }
  try {
    const user = action === 'signup' ? await auth.register(username.trim(), password) : await auth.login(username.trim(), password);
    if (!user) { res.status(401).json({ error: 'Incorrect username or password.' }); return; }
    auth.revoke(tokenFrom(req));
    res.cookie('kalash_session', auth.createSession(user), cookieOptions).status(action === 'signup' ? 201 : 200).json({ user });
  } catch (error) {
    const message = (error as Error).message;
    if (/username|password/i.test(message)) { res.status(400).json({ error: message }); return; }
    console.error('Account storage operation failed.');
    res.status(500).json({ error: 'We could not save your account. Please try again.' });
  }
});
app.get('/api/auth/me', (req, res) => { const user = auth.getSession(tokenFrom(req)); res.json({ user }); });
app.get('/api/workspace', (req, res) => {
  const user = auth.getSession(tokenFrom(req));
  if (!user) { res.status(401).json({ error: 'Please sign in to continue.' }); return; }
  res.json({ user, product: 'Kalash Code', version: '0.1.0', stage: 'Developer preview' });
});
app.use('/api', (_req, res) => { res.status(404).json({ error: 'Not found.' }); });
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(root, 'dist'), { maxAge: '1h', index: false }));
  app.get('/{*path}', (req, res) => {
    const page = req.path.replace(/\/$/, '') || '/';
    const file = ['/docs', '/signin', '/signup', '/workspace'].includes(page) ? `${page.slice(1)}.html` : 'index.html';
    res.set('Cache-Control', 'no-cache').sendFile(path.join(root, 'dist', file));
  });
}
app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(error instanceof SyntaxError ? 400 : 500).json({ error: 'The request could not be processed.' });
});
const port = Number(process.env.PORT ?? 3001);
app.listen(port, '127.0.0.1', () => console.log(`Kalash server: http://127.0.0.1:${port}`));
