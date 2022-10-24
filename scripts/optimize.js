/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
import { readFileSync, writeFileSync } from 'node:fs';
import binaryen from 'binaryen';

console.log('binaryen optimize start');

const mod = binaryen.readBinary(readFileSync('./wasm/bcrypt.wasm'));
mod.optimize();

const wasmData = mod.emitBinary();
writeFileSync('./wasm/bcrypt.wasm', wasmData);

console.log('binaryen optimize done');
