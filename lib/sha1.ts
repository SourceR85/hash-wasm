import { WASMInterface } from './WASMInterface';
import type { IWASMInterface, IHasher } from './WASMInterface';
import Mutex from './mutex';
import wasmJson from '../wasm/sha1.wasm.json';
import lockedCreate from './lockedCreate';
import type { IDataType } from './util';

const mutex = new Mutex();
let wasmCache: IWASMInterface;

/**
 * Calculates SHA-1 hash
 * @param data Input data (string, Buffer or TypedArray)
 * @returns Computed hash as a hexadecimal string
 */
export async function sha1(data: IDataType): Promise<string> {
  if (!wasmCache) wasmCache = await lockedCreate(mutex, wasmJson, 20);

  return wasmCache.calculate(data);
}

/**
 * Creates a new SHA-1 hash instance
 */
export async function createSHA1(): Promise<IHasher> {
  const wasm = await WASMInterface(wasmJson, 20);
  wasm.init();

  const obj: IHasher = {
    init: () => { wasm.init(); return obj; },
    update: (data) => { wasm.update(data); return obj; },
    digest: (outputType) => wasm.digest(outputType),
    save: () => wasm.save(),
    load: (data) => { wasm.load(data); return obj; },
    blockSize: 64,
    digestSize: 20,
  };
  return obj;
}
