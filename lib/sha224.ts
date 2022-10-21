import { WASMInterface } from './WASMInterface';
import type { IWASMInterface, IHasher } from './WASMInterface';
import Mutex from './mutex';
import wasmJson from '../wasm/sha256.wasm.json';
import lockedCreate from './lockedCreate';
import type { IDataType } from './util';

const mutex = new Mutex();
let wasmCache: IWASMInterface;

/**
 * Calculates SHA-2 (SHA-224) hash
 * @param data Input data (string, Buffer or TypedArray)
 * @returns Computed hash as a hexadecimal string
 */
export async function sha224(data: IDataType) {
  if (!wasmCache) wasmCache = await lockedCreate(mutex, wasmJson, 28);

  return wasmCache.calculate(data, 224);
}

/**
 * Creates a new SHA-2 (SHA-224) hash instance
 */
export async function createSHA224() {
  const wasm = await WASMInterface(wasmJson, 28);
  wasm.init(224);

  const obj: IHasher = {
    init: () => { wasm.init(224); return obj; },
    update: (data) => { wasm.update(data); return obj; },
    digest: (outputType) => wasm.digest(outputType),
    save: () => wasm.save(),
    load: (data) => { wasm.load(data); return obj; },
    blockSize: 64,
    digestSize: 28,
  };
  return obj;
}
