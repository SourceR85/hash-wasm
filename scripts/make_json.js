import {
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import {
  join,
  parse,
  resolve,
} from 'node:path';
import crypto from 'node:crypto';

const dir = resolve('wasm');
const files = readdirSync(dir).filter((file) => file.endsWith('.wasm'));

/* eslint-disable-next-line no-restricted-syntax */
for (const file of files) {
  const data = readFileSync(join(dir, file));
  const base64Data = data.toString('base64');
  const parsedName = parse(file);
  const hash = crypto.createHash('sha1').update(data).digest('hex').substring(0, 8);
  const json = JSON.stringify({ name: parsedName.name, data: base64Data, hash });
  writeFileSync(join(dir, `${file}.json`), json);
}
