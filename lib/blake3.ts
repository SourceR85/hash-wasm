import { WASMInterface } from './WASMInterface';
import type { IWASMInterface, IHasher } from './WASMInterface';
import Mutex from './mutex';
import wasmJson from '../wasm/blake3.wasm.json';
import lockedCreate from './lockedCreate';
import type { IDataType } from './util';
import { getUInt8Buffer } from './util';

const mutex = new Mutex();
let wasmCache: IWASMInterface;

function validateBits(bits: number): void {
  if (!Number.isInteger(bits) || bits < 8 || bits % 8 !== 0) {
    throw new Error('Invalid variant! Valid values: 8, 16, ...');
  }
}

/**
 * Calculates BLAKE3 hash
 * @param data Input data (string, Buffer or TypedArray)
 * @param bits Number of output bits, which has to be a number
 *             divisible by 8. Defaults to 256.
 * @param key Optional key (string, Buffer or TypedArray). Length should be 32 bytes.
 * @returns Computed hash as a hexadecimal string
 */
export async function blake3(
  data: IDataType,
  bits = 256,
  key: IDataType | undefined = undefined,
): Promise<string> {
  validateBits(bits);

  const hashLength = bits / 8;
  const digestParam = hashLength;

  let initParam = 0; // key is empty by default

  if (!wasmCache || wasmCache.hashLength !== hashLength) {
    wasmCache = await lockedCreate(mutex, wasmJson, hashLength);
  }

  if (key !== undefined) {
    const keyBuffer = getUInt8Buffer(key);
    if (keyBuffer.length !== 32) {
      throw new Error('Key length must be exactly 32 bytes');
    }
    initParam = 32;
    wasmCache.writeMemory(keyBuffer);
  }

  return wasmCache.calculate(data, initParam, digestParam);
}

/**
 * Creates a new BLAKE3 hash instance
 * @param bits Number of output bits, which has to be a number
 *             divisible by 8. Defaults to 256.
 * @param key Optional key (string, Buffer or TypedArray). Length should be 32 bytes.
 */
export async function createBLAKE3(
  bits = 256,
  key: IDataType | undefined = undefined,
): Promise<IHasher> {
  validateBits(bits);

  const outputSize = bits / 8;
  let keyBuffer: Uint8Array;
  let initParam = 0; // key is empty by default

  const wasm = await WASMInterface(wasmJson, outputSize);

  if (key !== undefined) {
    keyBuffer = getUInt8Buffer(key);
    if (keyBuffer.length !== 32) {
      throw new Error('Key length must be exactly 32 bytes');
    }
    initParam = 32;
    wasm.writeMemory(keyBuffer);
  }

  wasm.init(initParam);

  const obj: IHasher = {
    init: initParam === 32
      ? (): IHasher => {
        wasm.writeMemory(keyBuffer);
        wasm.init(initParam);
        return obj;
      }
      : (): IHasher => {
        wasm.init(initParam);
        return obj;
      },
    update: (data) => { wasm.update(data); return obj; },
    digest: (outputType) => wasm.digest(outputType, outputSize),
    save: () => wasm.save(),
    load: (data) => { wasm.load(data); return obj; },
    blockSize: 64,
    digestSize: outputSize,
  };
  return obj;
}
