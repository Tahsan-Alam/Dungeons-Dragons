import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectRoot } from './sites-env.mjs';

// The generated config is in dist/server; local secrets remain at the root.
// An absolute path works across Wrangler's parent and runtime processes on Windows.
// A checkout without a local secret file must still support fixture-only play.
const vars = path.join(projectRoot, '.dev.vars');
const cli = new URL('../node_modules/wrangler/wrangler-dist/cli.js', import.meta.url);
const child = spawn(process.execPath, [fileURLToPath(cli), 'dev',
  '--config', 'dist/server/wrangler.json',
  ...(existsSync(vars) ? ['--env-file', vars] : []),
  '--local', '--persist-to', '.wrangler/state', '--ip', '127.0.0.1',
  '--inspector-port', '0', ...process.argv.slice(2)], {stdio:'inherit', windowsHide:true});
child.on('exit', code => process.exit(code ?? 1));
child.on('error', () => {console.error('Could not start the local server.');process.exit(1);});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
