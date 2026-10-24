'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createFileStorage } = require('../file-storage');

function fakePool() {
  const rows = new Map(), chunks = new Map();
  return {
    rows, chunks,
    async query(sql, params = []) {
      if (sql.startsWith('CREATE TABLE')) return { rows: [] };
      if (sql.startsWith('DELETE FROM solaris_files WHERE NOT ready')) return { rows: [] };
      if (sql.startsWith('INSERT INTO solaris_files')) {
        rows.set(params[0], { metadata: JSON.parse(params[1]), ready: false });
        return { rows: [] };
      }
      if (sql.startsWith('UPDATE solaris_files')) {
        rows.set(params[0], { metadata: JSON.parse(params[1]), ready: true });
        return { rows: [] };
      }
      if (sql.startsWith('SELECT metadata FROM solaris_files WHERE id=$1 AND ready')) {
        const row = rows.get(params[0]);
        return { rows: row && row.ready ? [{ metadata: row.metadata }] : [] };
      }
      if (sql.startsWith('SELECT metadata FROM solaris_files WHERE id=$1')) {
        const row = rows.get(params[0]);
        return { rows: row ? [{ metadata: row.metadata }] : [] };
      }
      if (sql.startsWith('DELETE FROM solaris_files WHERE id=$1')) {
        rows.delete(params[0]);
        for (const key of chunks.keys()) if (key.startsWith(params[0] + ':')) chunks.delete(key);
        return { rows: [] };
      }
      if (sql.startsWith('INSERT INTO solaris_file_chunks')) {
        chunks.set(params[0] + ':' + params[1], Buffer.from(params[2]));
        return { rows: [] };
      }
      if (sql.startsWith('SELECT data FROM solaris_file_chunks')) {
        const data = chunks.get(params[0] + ':' + params[1]);
        return { rows: data ? [{ data }] : [] };
      }
      throw new Error('Unexpected test query: ' + sql);
    }
  };
}

test('Neon S3 uploads use generated images keys and preserve legacy PostgreSQL chunks', async t => {
  const names = ['AWS_ENDPOINT_URL_S3','AWS_REGION','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','NEON_STORAGE_BUCKET','SOLARIS_UPLOAD_DIR'];
  const old = Object.fromEntries(names.map(name => [name, process.env[name]]));
  t.after(() => {
    for (const name of names) {
      if (old[name] === undefined) delete process.env[name];
      else process.env[name] = old[name];
    }
  });
  process.env.AWS_ENDPOINT_URL_S3 = 'https://storage.test.invalid';
  process.env.AWS_REGION = 'ap-southeast-1';
  process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
  process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
  process.env.NEON_STORAGE_BUCKET = 'useruploads';
  delete process.env.SOLARIS_UPLOAD_DIR;

  const objects = new Map(), pool = fakePool();
  const store = createFileStorage({
    getPool: () => pool,
    dataDir: 'unused-test-directory',
    s3ClientFactory: options => {
      assert.equal(options.forcePathStyle, true);
      return { async send(command) {
        const input = command.input;
        if (command instanceof PutObjectCommand) {
          const parts = [];
          for await (const chunk of input.Body) parts.push(Buffer.from(chunk));
          objects.set(input.Key, Buffer.concat(parts));
          return {};
        }
        if (command instanceof GetObjectCommand) {
          const body = objects.get(input.Key);
          if (!body) throw new Error('Object not found');
          const match = /^bytes=(\d+)-(\d+)$/.exec(input.Range);
          return { Body: Readable.from([body.subarray(Number(match[1]), Number(match[2]) + 1)]) };
        }
        if (command instanceof DeleteObjectCommand) {
          objects.delete(input.Key);
          return {};
        }
        throw new Error('Unexpected S3 command.');
      } };
    },
    signGetUrl: async (_client, command, options) => {
      assert.equal(command.input.Bucket, 'useruploads');
      assert.equal(options.expiresIn, 300);
      return 'https://signed.test.invalid/private-object';
    }
  });

  await store.ready();
  assert.deepEqual(await store.status(), { available: true, backend: 'neon-object-storage' });
  const bytes = Buffer.from('valid image test bytes');
  const saved = await store.save(Readable.from([bytes]), {
    size: bytes.length, maxBytes: 1024, name: 'sample.png', mime: 'image/png',
    ownerId: 'account-id', prefix: 'social/image', validate: first => first.length > 0
  });
  assert.match(saved.objectKey, /^images\/social\/image\/[a-f0-9-]{36}$/);
  assert.equal(saved.storageBackend, 'neon-s3');
  assert.deepEqual(objects.get(saved.objectKey), bytes);
  const downloaded = [];
  for await (const chunk of store.read(saved.key, 0, bytes.length - 1)) downloaded.push(chunk);
  assert.deepEqual(Buffer.concat(downloaded), bytes);

  const legacyId = '11111111-1111-4111-8111-111111111111';
  const legacyBytes = Buffer.from('old PostgreSQL bytes');
  pool.rows.set(legacyId, { ready: true, metadata: { key: legacyId, size: legacyBytes.length, name: 'legacy.bin', mime: 'application/octet-stream', ownerId: 'legacy-owner', createdAt: Date.now() - 1000 } });
  pool.chunks.set(legacyId + ':0', legacyBytes);
  const legacy = [];
  for await (const chunk of store.read(legacyId, 0, legacyBytes.length - 1)) legacy.push(chunk);
  assert.deepEqual(Buffer.concat(legacy), legacyBytes);
  assert.equal(pool.rows.has(legacyId), true);

  const response = { status: 0, headers: null, writeHead(status, headers) { this.status = status; this.headers = headers; }, end() {} };
  await store.serve({ method: 'GET', headers: {} }, response, saved.key, { attachment: true });
  assert.equal(response.status, 302);
  assert.equal(response.headers.Location, 'https://signed.test.invalid/private-object');

  await store.remove(saved.key);
  assert.equal(objects.has(saved.objectKey), false);
  assert.equal(pool.rows.has(saved.key), false);
  assert.equal(pool.rows.has(legacyId), true);
});
test('Neon reads the AWS secret from a Render secret file without exposing it', async t => {
  const names = ['AWS_ENDPOINT_URL_S3','AWS_REGION','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_SECRET_ACCESS_KEY_FILE','NEON_STORAGE_BUCKET','SOLARIS_UPLOAD_DIR'];
  const old = Object.fromEntries(names.map(name => [name, process.env[name]]));
  t.after(() => {
    for (const name of names) {
      if (old[name] === undefined) delete process.env[name];
      else process.env[name] = old[name];
    }
  });
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-secret-file-test-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const secretFile = path.join(tempDir, 'AWS_SECRET_ACCESS_KEY');
  fs.writeFileSync(secretFile, 'test-secret-from-file' + String.fromCharCode(10), { mode: 0o600 });
  process.env.AWS_ENDPOINT_URL_S3 = 'https://storage.test.invalid';
  process.env.AWS_REGION = 'ap-southeast-1';
  process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
  delete process.env.AWS_SECRET_ACCESS_KEY;
  process.env.AWS_SECRET_ACCESS_KEY_FILE = secretFile;
  process.env.NEON_STORAGE_BUCKET = 'useruploads';
  delete process.env.SOLARIS_UPLOAD_DIR;
  let passedSecret = '';
  const store = createFileStorage({
    getPool: () => fakePool(),
    dataDir: 'unused-test-directory',
    s3ClientFactory: options => {
      passedSecret = options.credentials.secretAccessKey;
      return { async send() { return {}; } };
    }
  });
  await store.ready();
  assert.equal(passedSecret, 'test-secret-from-file');
  assert.deepEqual(await store.status(), { available: true, backend: 'neon-object-storage' });
});
