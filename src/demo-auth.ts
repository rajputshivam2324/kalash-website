export type DemoUser = { username: string; createdAt: string };
type Account = DemoUser & { salt: string; hash: string };
const accountPrefix = 'kalash.demo.account.v1.';
const sessionKey = 'kalash.demo.session.v1';
const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

async function passwordHash(password: string, salt: string) {
  if (!globalThis.crypto?.subtle) throw new Error('Open this website over HTTPS to create or access a demo account.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const saltBytes = Uint8Array.from(salt.match(/../g)!, byte => parseInt(byte, 16));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: 600_000 }, key, 256);
  return hex(new Uint8Array(bits));
}

// Demo identity only: browser storage is user-controlled and cannot authorize private server data.
export class DemoAuth {
  constructor(private storage: () => Storage, private now = () => Date.now()) {}
  private store() {
    try { return this.storage(); }
    catch { throw new Error('Allow browser storage for this website to use demo accounts.'); }
  }
  private read(key: string) {
    try { return this.store().getItem(key); }
    catch { throw new Error('Allow browser storage for this website to use demo accounts.'); }
  }
  private write(key: string, value: unknown) {
    try { this.store().setItem(key, JSON.stringify(value)); }
    catch { throw new Error('Your browser could not save the demo account. Allow site storage and try again.'); }
  }
  private account(username: string): Account | null {
    const raw = this.read(accountPrefix + username.toLowerCase());
    if (!raw) return null;
    try {
      const account = JSON.parse(raw) as Account;
      if (!/^[a-zA-Z0-9_]{3,24}$/.test(account.username) || account.username.toLowerCase() !== username.toLowerCase()
        || !/^[a-f0-9]{32}$/.test(account.salt) || !/^[a-f0-9]{64}$/.test(account.hash)
        || typeof account.createdAt !== 'string' || !Number.isFinite(Date.parse(account.createdAt))) throw new Error();
      return account;
    } catch { throw new Error('This browser’s demo account data is damaged. Try a new username.'); }
  }
  private session(account: Account): DemoUser {
    this.write(sessionKey, { username: account.username, expires: this.now() + 86_400_000 });
    return { username: account.username, createdAt: account.createdAt };
  }
  async signup(username: string, password: string) {
    username = username.trim();
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) throw new Error('Use 3–24 letters, numbers, or underscores for your username.');
    if (password.length < 8 || password.length > 128) throw new Error('Use a password between 8 and 128 characters.');
    if (this.account(username)) throw new Error('That username is already taken in this browser. Try another one.');
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    const hash = await passwordHash(password, salt);
    // Recheck after hashing so simultaneous submissions cannot replace an existing account.
    if (this.account(username)) throw new Error('That username is already taken in this browser. Try another one.');
    const account = { username, salt, hash, createdAt: new Date(this.now()).toISOString() };
    this.write(accountPrefix + username.toLowerCase(), account);
    return this.session(account);
  }
  async signin(username: string, password: string) {
    username = username.trim();
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username) || !password || password.length > 128) throw new Error('Incorrect username or password.');
    const account = this.account(username);
    if (!account || await passwordHash(password, account.salt) !== account.hash) throw new Error('Incorrect username or password.');
    return this.session(account);
  }
  currentUser(): DemoUser | null {
    const raw = this.read(sessionKey);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw);
      if (typeof session.username !== 'string' || typeof session.expires !== 'number' || session.expires <= this.now()) return null;
      const account = this.account(session.username);
      return account ? { username: account.username, createdAt: account.createdAt } : null;
    } catch { return null; }
  }
  logout() {
    try { this.store().removeItem(sessionKey); }
    catch { throw new Error('Your browser could not sign out. Allow site storage and try again.'); }
  }
}

export const demoAuth = new DemoAuth(() => window.localStorage);
