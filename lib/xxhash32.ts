import { WASMInterface } from './WASMInterface';
import type { IWASMInterface, IHasher } from './WASMInterface';
import Mutex from './mutex';
import wasmJson from '../wasm/xxhash32.wasm.json';
import lockedCreate from './lockedCreate';
import type { IDataType } from './util';

const mutex = new Mutex();
let wasmCache: IWASMInterface;

function validateSeed(seed: number): void {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xFFFFFFFF) {
    throw new Error('Seed must be a valid 32-bit long unsigned integer.');
  }
}
/**
 * Calculates xxHash32 hash
 * @param data Input data (string, Buffer or TypedArray)
 * @param seed Number used to initialize the internal state of the algorithm (defaults to 0)
 * @returns Computed hash as a hexadecimal string
 */
export async function xxhash32(data: IDataType, seed = 0): Promise<string> {
  validateSeed(seed);

  if (!wasmCache) wasmCache = await lockedCreate(mutex, wasmJson, 4);

  return wasmCache.calculate(data, seed);
}

/**
 * Creates a new xxHash32 hash instance
 * @param data Input data (string, Buffer or TypedArray)
 * @param seed Number used to initialize the internal state of the algorithm (defaults to 0)
 */
export async function createXXHash32(seed = 0): Promise<IHasher> {
  validateSeed(seed);

  const wasm = await WASMInterface(wasmJson, 4);
  wasm.init(seed);

  const obj: IHasher = {
    init: () => { wasm.init(seed); return obj; },
    update: (data) => { wasm.update(data); return obj; },
    digest: (outputType) => wasm.digest(outputType),
    save: () => wasm.save(),
    load: (data) => { wasm.load(data); return obj; },
    blockSize: 16,
    digestSize: 4,
  };
  return obj;
}
