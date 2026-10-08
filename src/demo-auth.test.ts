import test from 'node:test';
import assert from 'node:assert/strict';
import { DemoAuth } from './demo-auth.ts';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: key => { values.delete(key); },
    clear: () => { values.clear(); },
  };
}

test('demo signup, reload, password verification, logout, expiry and isolated browsers', async () => {
  const storage = memoryStorage();
  let now = Date.now();
  const auth = new DemoAuth(() => storage, () => now);
  const user = await auth.signup(' Builder_1 ', 'test-password-93');
  assert.equal(user.username, 'Builder_1');
  const persisted = storage.getItem('kalash.demo.account.v1.builder_1')!;
  assert.ok(!persisted.includes('test-password-93'));
  const account = JSON.parse(persisted);
  assert.equal(account.salt.length, 32);
  assert.equal(account.hash.length, 64);
  const reloaded = new DemoAuth(() => storage, () => now);
  assert.deepEqual(reloaded.currentUser(), user);
  assert.equal(new DemoAuth(memoryStorage).currentUser(), null);
  await assert.rejects(auth.signup('BUILDER_1', 'another-password'), /already taken/);
  auth.logout();
  assert.equal(reloaded.currentUser(), null);
  await assert.rejects(reloaded.signin('builder_1', 'wrong-password'), /Incorrect/);
  assert.equal(reloaded.currentUser(), null);
  assert.deepEqual(await reloaded.signin('builder_1', 'test-password-93'), user);
  now += 86_400_001;
  assert.equal(reloaded.currentUser(), null);
  await reloaded.signin('builder_1', 'test-password-93');
  storage.clear();
  assert.equal(reloaded.currentUser(), null);
  await assert.rejects(reloaded.signin('builder_1', 'test-password-93'), /Incorrect/);
});

test('validation and unavailable/corrupt storage have usable errors', async () => {
  const storage = memoryStorage();
  const auth = new DemoAuth(() => storage);
  await assert.rejects(auth.signup('x', 'test-password'), /username/);
  await assert.rejects(auth.signup('validname', 'short'), /password/);
  storage.setItem('kalash.demo.account.v1.broken', 'not-json');
  await assert.rejects(auth.signin('broken', 'test-password'), /damaged/);
  storage.setItem('kalash.demo.session.v1', 'not-json');
  assert.equal(auth.currentUser(), null);
  const unavailable = new DemoAuth(() => { throw new Error('Storage denied'); });
  await assert.rejects(unavailable.signup('validname', 'test-password'), /browser storage/);
});
