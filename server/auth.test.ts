import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AuthStore } from './auth.ts';

test('accounts persist as salted hashes; sign-in, duplicate checks, and session revocation work', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kalash-auth-'));
  try {
    const file = join(dir, 'accounts.json');
    const store = new AuthStore(file); await store.init();
    const user = await store.register('Builder_1', 'a-test-password-93');
    const persisted = await readFile(file, 'utf8');
    assert.ok(!persisted.includes('a-test-password-93'));
    const stored = JSON.parse(persisted)[0];
    assert.equal(stored.salt.length, 32); assert.equal(stored.hash.length, 128);
    assert.equal(await store.login('Builder_1', 'wrong-password'), null);
    assert.equal(await store.login('unknown', 'wrong-password'), null);
    assert.deepEqual(await store.login('builder_1', 'a-test-password-93'), user);
    await assert.rejects(store.register('BUILDER_1', 'another-password'), /already taken/);
    await assert.rejects(store.register('x', 'test-password'), /username/);
    await assert.rejects(store.register('validname', 'short'), /password/);
    const token = store.createSession(user); assert.deepEqual(store.getSession(token), user);
    assert.equal(store.getSession('forged-token'), null);
    store.revoke(token); assert.equal(store.getSession(token), null);
    const restarted = new AuthStore(file); await restarted.init();
    assert.deepEqual(await restarted.login('Builder_1', 'a-test-password-93'), user);
    assert.equal(restarted.getSession(token), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('simultaneous sign-ups cannot overwrite accounts or bypass username uniqueness', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kalash-auth-concurrent-'));
  try {
    const file = join(dir, 'accounts.json'); const store = new AuthStore(file); await store.init();
    const outcomes = await Promise.allSettled([
      store.register('same_name', 'long-password-1'),
      store.register('SAME_NAME', 'long-password-2'),
      store.register('other_name', 'long-password-3'),
    ]);
    assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 2);
    assert.equal(JSON.parse(await readFile(file, 'utf8')).length, 2);
    assert.ok(await store.login('other_name', 'long-password-3'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
