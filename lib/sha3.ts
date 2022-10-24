import { WASMInterface } from './WASMInterface';
import type { IWASMInterface, IHasher } from './WASMInterface';
import Mutex from './mutex';
import wasmJson from '../wasm/sha3.wasm.json';
import lockedCreate from './lockedCreate';
import type { IDataType } from './util';

type IValidBits = 224 | 256 | 384 | 512;
const mutex = new Mutex();
let wasmCache: IWASMInterface;

function validateBits(bits: IValidBits): void {
  if (![224, 256, 384, 512].includes(bits)) {
    throw new Error('Invalid variant! Valid values: 224, 256, 384, 512');
  }
}

/**
 * Calculates SHA-3 hash
 * @param data Input data (string, Buffer or TypedArray)
 * @param bits Number of output bits. Valid values: 224, 256, 384, 512
 * @returns Computed hash as a hexadecimal string
 */
export async function sha3(data: IDataType, bits: IValidBits = 512): Promise<string> {
  validateBits(bits);

  const hashLength = bits / 8;

  if (!wasmCache || wasmCache.hashLength !== hashLength) {
    wasmCache = await lockedCreate(mutex, wasmJson, hashLength);
  }

  return wasmCache.calculate(data, bits, 0x06);
}

/**
 * Creates a new SHA-3 hash instance
 * @param bits Number of output bits. Valid values: 224, 256, 384, 512
 */
export async function createSHA3(bits: IValidBits = 512): Promise<IHasher> {
  validateBits(bits);

  const outputSize = bits / 8;

  const wasm = await WASMInterface(wasmJson, outputSize);
  wasm.init(bits);

  const obj: IHasher = {
    init: () => { wasm.init(bits); return obj; },
    update: (data) => { wasm.update(data); return obj; },
    digest: (outputType) => wasm.digest(outputType, 0x06),
    save: () => wasm.save(),
    load: (data) => { wasm.load(data); return obj; },
    blockSize: 200 - 2 * outputSize,
    digestSize: outputSize,
  };
  return obj;
}
