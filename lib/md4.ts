import { WASMInterface } from './WASMInterface';
import type { IWASMInterface, IHasher } from './WASMInterface';
import Mutex from './mutex';
import wasmJson from '../wasm/md4.wasm.json';
import lockedCreate from './lockedCreate';
import type { IDataType } from './util';

const mutex = new Mutex();
let wasmCache: IWASMInterface;

/**
 * Calculates MD4 hash
 * @param data Input data (string, Buffer or TypedArray)
 * @returns Computed hash as a hexadecimal string
 */
export async function md4(data: IDataType) {
  if (!wasmCache) wasmCache = await lockedCreate(mutex, wasmJson, 16);

  return wasmCache.calculate(data);
}

/**
 * Creates a new MD4 hash instance
 */
export async function createMD4() {
  const wasm = await WASMInterface(wasmJson, 16);
  wasm.init();

  const obj: IHasher = {
    init: () => { wasm.init(); return obj; },
    update: (data) => { wasm.update(data); return obj; },
    digest: (outputType) => wasm.digest(outputType),
    save: () => wasm.save(),
    load: (data) => { wasm.load(data); return obj; },
    blockSize: 64,
    digestSize: 16,
  };
  return obj;
}
