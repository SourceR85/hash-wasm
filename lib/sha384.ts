import { WASMInterface } from './WASMInterface';
import type { IWASMInterface, IHasher } from './WASMInterface';
import Mutex from './mutex';
import wasmJson from '../wasm/sha512.wasm.json';
import lockedCreate from './lockedCreate';
import type { IDataType } from './util';

const mutex = new Mutex();
let wasmCache: IWASMInterface;

/**
 * Calculates SHA-2 (SHA-384) hash
 * @param data Input data (string, Buffer or TypedArray)
 * @returns Computed hash as a hexadecimal string
 */
export async function sha384(data: IDataType) {
  if (!wasmCache) wasmCache = await lockedCreate(mutex, wasmJson, 48);

  return wasmCache.calculate(data, 384);
}

/**
 * Creates a new SHA-2 (SHA-384) hash instance
 */
export async function createSHA384() {
  const wasm = await WASMInterface(wasmJson, 48);
  wasm.init(384);

  const obj: IHasher = {
    init: () => { wasm.init(384); return obj; },
    update: (data) => { wasm.update(data); return obj; },
    digest: (outputType) => wasm.digest(outputType),
    save: () => wasm.save(),
    load: (data) => { wasm.load(data); return obj; },
    blockSize: 128,
    digestSize: 48,
  };
  return obj;
}
