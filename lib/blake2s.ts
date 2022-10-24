import { WASMInterface } from './WASMInterface';
import type { IWASMInterface, IHasher } from './WASMInterface';
import Mutex from './mutex';
import wasmJson from '../wasm/blake2s.wasm.json';
import lockedCreate from './lockedCreate';
import type { IDataType } from './util';
import { getUInt8Buffer } from './util';

const mutex = new Mutex();
let wasmCache: IWASMInterface;

function validateBits(bits: number): void {
  if (!Number.isInteger(bits) || bits < 8 || bits > 256 || bits % 8 !== 0) {
    throw new Error('Invalid variant! Valid values: 8, 16, ..., 256');
  }
}

function getInitParam(outputBits: number, keyBits: number): number {
  // eslint-disable-next-line no-bitwise
  return outputBits | (keyBits << 16);
}

/**
 * Calculates BLAKE2s hash
 * @param data Input data (string, Buffer or TypedArray)
 * @param bits Number of output bits, which has to be a number
 *             divisible by 8, between 8 and 256. Defaults to 256.
 * @param key Optional key (string, Buffer or TypedArray). Maximum length is 32 bytes.
 * @returns Computed hash as a hexadecimal string
 */
export async function blake2s(
  data: IDataType,
  bits = 256,
  key: IDataType | undefined = undefined,
): Promise<string> {
  validateBits(bits);

  const hashLength = bits / 8;
  let initParam = bits;

  if (!wasmCache || wasmCache.hashLength !== hashLength) {
    wasmCache = await lockedCreate(mutex, wasmJson, hashLength);
  }

  if (key !== undefined) {
    const keyBuffer = getUInt8Buffer(key);
    if (keyBuffer.length > 32) {
      throw new Error('Max key length is 32 bytes');
    }
    initParam = getInitParam(bits, keyBuffer.length);

    if (initParam > 512) {
      wasmCache.writeMemory(keyBuffer);
    }
  }

  return wasmCache.calculate(data, initParam);
}

/**
 * Creates a new BLAKE2s hash instance
 * @param bits Number of output bits, which has to be a number
 *             divisible by 8, between 8 and 256. Defaults to 256.
 * @param key Optional key (string, Buffer or TypedArray). Maximum length is 32 bytes.
 */
export async function createBLAKE2s(
  bits = 256,
  key: IDataType | undefined = undefined,
): Promise<IHasher> {
  validateBits(bits);

  const outputSize = bits / 8;
  let initParam = bits;
  let keyBuffer: Uint8Array;

  const wasm = await WASMInterface(wasmJson, outputSize);

  if (key !== undefined) {
    keyBuffer = getUInt8Buffer(key);
    if (keyBuffer.length > 32) {
      return Promise.reject(new Error('Max key length is 32 bytes'));
    }
    initParam = getInitParam(bits, keyBuffer.length);
    if (initParam > 512) {
      wasm.writeMemory(keyBuffer);
    }
  }

  wasm.init(initParam);

  const obj: IHasher = {
    init: initParam > 512
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
    digest: (outputType) => wasm.digest(outputType),
    save: () => wasm.save(),
    load: (data) => { wasm.load(data); return obj; },
    blockSize: 64,
    digestSize: outputSize,
  };
  return obj;
}
