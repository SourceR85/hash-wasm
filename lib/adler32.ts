import { WASMInterface } from './WASMInterface';
import type { IWASMInterface, IHasher } from './WASMInterface';
import Mutex from './mutex';
import wasmJson from '../wasm/adler32.wasm.json';
import lockedCreate from './lockedCreate';
import type { IDataType } from './util';

const mutex = new Mutex();
let wasmCache: IWASMInterface;

/**
 * Calculates Adler-32 hash. The resulting 32-bit hash is stored in
 * network byte order (big-endian).
 *
 * @param data Input data (string, Buffer or TypedArray)
 * @returns Computed hash as a hexadecimal string
 */
export async function adler32(data: IDataType): Promise<string> {
  if (!wasmCache) wasmCache = await lockedCreate(mutex, wasmJson, 4);

  return wasmCache.calculate(data);
}

/**
 * Creates a new Adler-32 hash instance
 */
export async function createAdler32(): Promise<IHasher> {
  const wasm = await WASMInterface(wasmJson, 4);
  wasm.init();

  const obj: IHasher = {
    init: () => { wasm.init(); return obj; },
    update: (data) => { wasm.update(data); return obj; },
    digest: (outputType) => wasm.digest(outputType),
    save: () => wasm.save(),
    load: (data) => { wasm.load(data); return obj; },
    blockSize: 4,
    digestSize: 4,
  };
  return obj;
}
