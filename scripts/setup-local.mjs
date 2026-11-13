import {copyFileSync, constants, existsSync, readFileSync, readdirSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {projectRoot} from './sites-env.mjs';
import {localMigrationPlan} from './local-db-plan.mjs';

function run(args, capture=false) {
  const result=spawnSync(process.execPath,args,{cwd:projectRoot,encoding:'utf8',stdio:capture?'pipe':'inherit',windowsHide:true});
  if(result.error||result.status!==0)throw new Error('Local setup command failed. Existing configuration and data were preserved.');
  return result.stdout;
}
try {
  if(!existsSync('.dev.vars')) {
    copyFileSync('.dev.vars.example','.dev.vars',constants.COPYFILE_EXCL);
    console.log('Created ignored .dev.vars with AI off. Existing files are never overwritten.');
  }
  if(!process.argv.includes('--skip-build'))run(['scripts/run-framework.mjs','build']);
  if(!existsSync('dist/server/wrangler.json'))throw new Error('Run npm run build first.');
  const wrangler=['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state'];
  const query=sql=>{
    const result=JSON.parse(run([...wrangler,'--command',sql,'--json'],true));
    if(result.some(entry=>entry.success===false))throw new Error('Could not inspect the local database.');
    return result.flatMap(entry=>entry.results??[]);
  };
  const objects=query("SELECT name, type FROM sqlite_master WHERE type IN ('table','index')"),tables={};
  for(const object of objects.filter(row=>row.type==='table'&&!/^(_cf_|sqlite_)/i.test(row.name))) {
    // Restrict identifiers before putting them into PRAGMA syntax.
    if(!/^\w+$/.test(object.name))throw new Error('Unexpected local table name; manual review needed.');
    tables[object.name]=query(`PRAGMA table_info("${object.name}")`).map(row=>row.name);
  }
  const files=readdirSync('drizzle').filter(name=>/^\d+_.+\.sql$/.test(name)).sort().map(name=>({name,sql:readFileSync(path.join('drizzle',name),'utf8')}));
  const statements=localMigrationPlan(files,tables,objects.filter(row=>row.type==='index').map(row=>row.name));
  if(statements.length) {
    const directory=mkdtempSync(path.join(tmpdir(),'painted-realms-db-'));
    const file=path.join(directory,'pending.sql');
    try {
      writeFileSync(file,statements.join(';\n')+';\n');
      run([...wrangler,'--file',file],true);
    } finally {if(existsSync(file))unlinkSync(file);rmdirSync(directory);}
  }
  console.log(`Local database ready (${statements.length} new schema statements). Saves and AI receipts retained.`);
  console.log('Run npm run dev -- --port 5347 --hostname 127.0.0.1. For paid AI, follow TEAM-DEVELOPMENT.md; no password is required.');
} catch(error) {console.error(error.message);process.exitCode=1;}
