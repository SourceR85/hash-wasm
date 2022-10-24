import { WASMInterface } from './WASMInterface';
import type { IWASMInterface, IHasher } from './WASMInterface';
import Mutex from './mutex';
import wasmJson from '../wasm/crc32.wasm.json';
import lockedCreate from './lockedCreate';
import type { IDataType } from './util';

const mutex = new Mutex();
let wasmCache: IWASMInterface;

/**
 * Calculates CRC-32C hash
 * @param data Input data (string, Buffer or TypedArray)
 * @returns Computed hash as a hexadecimal string
 */
export async function crc32c(data: IDataType): Promise<string> {
  if (!wasmCache) wasmCache = await lockedCreate(mutex, wasmJson, 4);

  return wasmCache.calculate(data, 0x82F63B78);
}

/**
 * Creates a new CRC-32C hash instance
 */
export async function createCRC32C(): Promise<IHasher> {
  const wasm = await WASMInterface(wasmJson, 4);
  wasm.init(0x82F63B78);

  const obj: IHasher = {
    init: () => { wasm.init(0x82F63B78); return obj; },
    update: (data) => { wasm.update(data); return obj; },
    digest: (outputType) => wasm.digest(outputType),
    save: () => wasm.save(),
    load: (data) => { wasm.load(data); return obj; },
    blockSize: 4,
    digestSize: 4,
  };
  return obj;
}
