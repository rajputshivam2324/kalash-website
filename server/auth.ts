import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

type Account = { username: string; salt: string; hash: string; createdAt: string };
export type PublicUser = Pick<Account, 'username' | 'createdAt'>;
const derive = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(key));
});
export class AuthStore {
  private accounts: Account[] = [];
  private queue = Promise.resolve();
  private sessions = new Map<string, { user: PublicUser; expires: number }>();
  constructor(private file: string) {}
  async init() {
    try { this.accounts = JSON.parse(await readFile(this.file, 'utf8')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  async register(username: string, password: string): Promise<PublicUser> {
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) throw new Error('Use 3–24 letters, numbers, or underscores for your username.');
    if (password.length < 8 || password.length > 128) throw new Error('Use a password between 8 and 128 characters.');
    const salt = randomBytes(16).toString('hex');
    const hash = (await derive(password, salt)).toString('hex');
    const account = { username, salt, hash, createdAt: new Date().toISOString() };
    const pending = this.queue.then(async () => {
      if (this.accounts.some(a => a.username.toLowerCase() === username.toLowerCase())) throw new Error('That username is already taken. Try another one.');
      const accounts = [...this.accounts, account];
      await mkdir(dirname(this.file), { recursive: true, mode: 0o700 });
      await writeFile(`${this.file}.tmp`, JSON.stringify(accounts, null, 2), { mode: 0o600 });
      await rename(`${this.file}.tmp`, this.file);
      this.accounts = accounts;
    });
    this.queue = pending.catch(() => {});
    await pending;
    return { username, createdAt: account.createdAt };
  }
  async login(username: string, password: string): Promise<PublicUser | null> {
    const account = this.accounts.find(a => a.username.toLowerCase() === username.toLowerCase());
    const key = await derive(password, account?.salt ?? '00000000000000000000000000000000');
    if (!account || !timingSafeEqual(key, Buffer.from(account.hash, 'hex'))) return null;
    return { username: account.username, createdAt: account.createdAt };
  }
  createSession(user: PublicUser) {
    for (const [key, value] of this.sessions) if (value.expires < Date.now()) this.sessions.delete(key);
    const token = randomBytes(32).toString('hex');
    this.sessions.set(createHash('sha256').update(token).digest('hex'), { user, expires: Date.now() + 86_400_000 });
    return token;
  }
  getSession(token: string) {
    const key = createHash('sha256').update(token).digest('hex');
    const session = this.sessions.get(key);
    if (!session || session.expires < Date.now()) { this.sessions.delete(key); return null; }
    return session.user;
  }
  revoke(token: string) { this.sessions.delete(createHash('sha256').update(token).digest('hex')); }
}
