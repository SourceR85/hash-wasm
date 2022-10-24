import { WASMInterface } from './WASMInterface';
import type { IWASMInterface, IHasher } from './WASMInterface';
import Mutex from './mutex';
import wasmJson from '../wasm/sha512.wasm.json';
import lockedCreate from './lockedCreate';
import type { IDataType } from './util';

const mutex = new Mutex();
let wasmCache: IWASMInterface;

/**
 * Calculates SHA-2 (SHA-512) hash
 * @param data Input data (string, Buffer or TypedArray)
 * @returns Computed hash as a hexadecimal string
 */
export async function sha512(data: IDataType): Promise<string> {
  if (!wasmCache) wasmCache = await lockedCreate(mutex, wasmJson, 64);

  return wasmCache.calculate(data, 512);
}

/**
 * Creates a new SHA-2 (SHA-512) hash instance
 */
export async function createSHA512(): Promise<IHasher> {
  const wasm = await WASMInterface(wasmJson, 64);
  wasm.init(512);

  const obj: IHasher = {
    init: () => { wasm.init(512); return obj; },
    update: (data) => { wasm.update(data); return obj; },
    digest: (outputType) => wasm.digest(outputType),
    save: () => wasm.save(),
    load: (data) => { wasm.load(data); return obj; },
    blockSize: 128,
    digestSize: 64,
  };
  return obj;
}
