// Isolated integration environment: never calls a remote D1 database.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const persist = mkdtempSync(join(tmpdir(), 'yuncun-auth-test-'));
const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
const cwd = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: 'true' };
const migrate = spawnSync(process.execPath, [wrangler, 'd1', 'migrations', 'apply', 'DB', '--local', '--persist-to', persist], { cwd, env, stdio: 'inherit' });
if (migrate.status !== 0) process.exit(1);
// Public, disposable fixture. Production has a freshly generated random token.
const token = 'A'.repeat(43);
const hash = createHash('sha256').update(token).digest('base64url');
const child = spawn(process.execPath, [wrangler, 'pages', 'dev', 'dist', '--ip', '127.0.0.1', '--port', '4323', '--local-protocol', 'https', '--persist-to', persist,
  '--binding', 'PUBLIC_ADMIN_ORIGIN=https://localhost:4323', '--binding', 'ADMIN_EMAIL=123456789@qq.com', '--binding', `ADMIN_SETUP_TOKEN_HASH=${hash}`], { cwd, env, stdio: 'inherit' });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { child.kill(signal); });
child.on('exit', (code) => process.exit(code || 0));
