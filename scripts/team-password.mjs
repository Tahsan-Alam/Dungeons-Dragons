// Prints a salted verifier, never the password. No provider request or API key needed.
import {readFile} from 'node:fs/promises';
import {pbkdf2Sync,randomBytes} from 'node:crypto';

async function hiddenPassword(){
 if(!process.stdin.isTTY)throw new Error('Use an interactive terminal, or --secret-file with a private file.');
 process.stderr.write('Team AI password (12–128 characters, input hidden): ');
 process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');
 return new Promise((resolve,reject)=>{
  let value='';
  function finish(error){process.stdin.off('data',onData);process.stdin.setRawMode(false);process.stdin.pause();process.stderr.write('\n');error?reject(error):resolve(value);}
  function onData(data){for(const character of data){if(character==='\u0003'){finish(new Error('Cancelled.'));return;}if(character==='\r'||character==='\n'){finish();return;}if(character==='\u007f'||character==='\b')value=value.slice(0,-1);else if(character>=' ')value+=character;}}
  process.stdin.on('data',onData);
 });
}
try{
 const args=process.argv.slice(2);
 if(args.length&&(args.length!==2||args[0]!=='--secret-file'))throw new Error('Usage: node scripts/team-password.mjs [--secret-file PATH]');
 const password=args.length?await readFile(args[1],'utf8'):await hiddenPassword();
 if(password.length<12||password.length>128||/[\r\n]/.test(password))throw new Error('Choose a password of 12–128 characters on one line.');
 const salt=randomBytes(16),hash=pbkdf2Sync(password,salt,100_000,32,'sha256');
 console.log(`AI_ACCESS_PASSWORD_HASH=pbkdf2-sha256:100000:${salt.toString('hex')}:${hash.toString('hex')}`);
}catch(error){console.error(error instanceof Error?error.message:'Could not create password verifier.');process.exitCode=1;}
