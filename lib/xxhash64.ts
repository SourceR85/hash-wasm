import { WASMInterface } from './WASMInterface';
import type { IWASMInterface, IHasher } from './WASMInterface';
import Mutex from './mutex';
import wasmJson from '../wasm/xxhash64.wasm.json';
import lockedCreate from './lockedCreate';
import type { IDataType } from './util';

const mutex = new Mutex();
let wasmCache: IWASMInterface;
const seedBuffer = new ArrayBuffer(8);

function validateSeed(seed: number) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xFFFFFFFF) {
    throw new Error('Seed must be given as two valid 32-bit long unsigned integers (lo + high).');
  }
}

function writeSeed(arr: ArrayBuffer, low: number, high: number) {
  // write in little-endian format
  const buffer = new DataView(arr);
  buffer.setUint32(0, low, true);
  buffer.setUint32(4, high, true);
}

/**
 * Calculates xxHash64 hash
 * @param data Input data (string, Buffer or TypedArray)
 * @param seedLow Lower 32 bits of the number used to
 *  initialize the internal state of the algorithm (defaults to 0)
 * @param seedHigh Higher 32 bits of the number used to
 *  initialize the internal state of the algorithm (defaults to 0)
 * @returns Computed hash as a hexadecimal string
 */
export async function xxhash64(data: IDataType, seedLow = 0, seedHigh = 0) {
  validateSeed(seedLow);
  validateSeed(seedHigh);

  if (!wasmCache) wasmCache = await lockedCreate(mutex, wasmJson, 8);

  writeSeed(seedBuffer, seedLow, seedHigh);
  wasmCache.writeMemory(new Uint8Array(seedBuffer));
  return wasmCache.calculate(data);
}

/**
 * Creates a new xxHash64 hash instance
 * @param seedLow Lower 32 bits of the number used to
 *  initialize the internal state of the algorithm (defaults to 0)
 * @param seedHigh Higher 32 bits of the number used to
 *  initialize the internal state of the algorithm (defaults to 0)
 */
export async function createXXHash64(seedLow = 0, seedHigh = 0) {
  validateSeed(seedLow);
  validateSeed(seedHigh);

  const wasm = await WASMInterface(wasmJson, 8);
  const instanceBuffer = new ArrayBuffer(8);
  writeSeed(instanceBuffer, seedLow, seedHigh);
  wasm.writeMemory(new Uint8Array(instanceBuffer));
  wasm.init();

  const obj: IHasher = {
    init: () => {
      wasm.writeMemory(new Uint8Array(instanceBuffer));
      wasm.init();
      return obj;
    },
    update: (data) => { wasm.update(data); return obj; },
    digest: (outputType) => wasm.digest(outputType),
    save: () => wasm.save(),
    load: (data) => { wasm.load(data); return obj; },
    blockSize: 32,
    digestSize: 8,
  };
  return obj;
}
