import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const myFilename = fileURLToPath(import.meta.url);
const myDirname = path.dirname(myFilename);

const dir = path.resolve(myDirname, '..', 'wasm');
const files = fs.readdirSync(dir).filter((file) => file.endsWith('.wasm'));

files.forEach((file) => {
  const data = fs.readFileSync(path.join(dir, file));
  const base64Data = data.toString('base64');
  const parsedName = path.parse(file);
  const hash = crypto.createHash('sha1').update(data).digest('hex').substring(0, 8);
  const json = JSON.stringify({ name: parsedName.name, data: base64Data, hash });
  fs.writeFileSync(path.join(dir, `${file}.json`), json);
});
