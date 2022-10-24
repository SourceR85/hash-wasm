import { WASMInterface } from './WASMInterface';
import type { IWASMInterface, IHasher } from './WASMInterface';
import Mutex from './mutex';
import wasmJson from '../wasm/whirlpool.wasm.json';
import lockedCreate from './lockedCreate';
import type { IDataType } from './util';

const mutex = new Mutex();
let wasmCache: IWASMInterface;

/**
 * Calculates Whirlpool hash
 * @param data Input data (string, Buffer or TypedArray)
 * @returns Computed hash as a hexadecimal string
 */
export async function whirlpool(data: IDataType): Promise<string> {
  if (!wasmCache) wasmCache = await lockedCreate(mutex, wasmJson, 64);

  return wasmCache.calculate(data);
}

/**
 * Creates a new Whirlpool hash instance
 */
export async function createWhirlpool(): Promise<IHasher> {
  const wasm = await WASMInterface(wasmJson, 64);
  wasm.init();

  const obj: IHasher = {
    init: () => { wasm.init(); return obj; },
    update: (data) => { wasm.update(data); return obj; },
    digest: (outputType) => wasm.digest(outputType),
    save: () => wasm.save(),
    load: (data) => { wasm.load(data); return obj; },
    blockSize: 64,
    digestSize: 64,
  };
  return obj;
}
