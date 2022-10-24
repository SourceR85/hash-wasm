import { WASMInterface } from './WASMInterface';
import type { IWASMInterface, IHasher } from './WASMInterface';
import Mutex from './mutex';
import wasmJson from '../wasm/sha256.wasm.json';
import lockedCreate from './lockedCreate';
import type { IDataType } from './util';

const mutex = new Mutex();
let wasmCache: IWASMInterface;

/**
 * Calculates SHA-2 (SHA-256) hash
 * @param data Input data (string, Buffer or TypedArray)
 * @returns Computed hash as a hexadecimal string
 */
export async function sha256(data: IDataType): Promise<string> {
  if (!wasmCache) wasmCache = await lockedCreate(mutex, wasmJson, 32);

  return wasmCache.calculate(data, 256);
}

/**
 * Creates a new SHA-2 (SHA-256) hash instance
 */
export async function createSHA256(): Promise<IHasher> {
  const wasm = await WASMInterface(wasmJson, 32);
  wasm.init(256);

  const obj: IHasher = {
    init: () => { wasm.init(256); return obj; },
    update: (data) => { wasm.update(data); return obj; },
    digest: (outputType) => wasm.digest(outputType),
    save: () => wasm.save(),
    load: (data) => { wasm.load(data); return obj; },
    blockSize: 64,
    digestSize: 32,
  };
  return obj;
}
