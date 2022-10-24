/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
import fs from 'node:fs';
import binaryen from 'binaryen';

console.log('binaryen optimize start');

const mod = binaryen.readBinary(fs.readFileSync('./wasm/bcrypt.wasm'));
mod.optimize();

const wasmData = mod.emitBinary();
fs.writeFileSync('./wasm/bcrypt.wasm', wasmData);

console.log('binaryen optimize done');
