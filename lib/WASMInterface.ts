import Mutex from './mutex';
import {
  decodeBase64,
  getDigestHex,
  getUInt8Buffer,
  writeHexToUInt8,
  hexStringEqualsUInt8,
} from './util';
import type { IDataType } from './util';

export const MAX_HEAP = 16 * 1024;
const WASM_FUNC_HASH_LENGTH = 4;
const wasmMutex = new Mutex();

type ThenArg<T> = T extends Promise<infer U> ? U :
  T extends ((...args: any[]) => Promise<infer V>) ? V :
  T;

export type IHasher = {
  /**
   * Initializes hash state to default value
   */
  init: () => IHasher;
  /**
   * Updates the hash content with the given data
   */
  update: (data: IDataType) => IHasher;
  /**
   * Calculates the hash of all of the data passed to be hashed with hash.update().
   * Defaults to hexadecimal string
   * @param outputType If outputType is "binary", it returns Uint8Array. Otherwise it
   *                   returns hexadecimal string
   */
  digest: <T extends 'binary' | 'hex' | undefined = undefined>(outputType?: T, digestParam?: number) => T extends 'binary' ? Uint8Array : string;
  /**
   * Save the current internal state of the hasher for later resumption with load().
   * Cannot be called before .init() or after .digest()
   *
   * Note that this state can include arbitrary information about the value being hashed (e.g.
   * could include N plaintext bytes from the value), so needs to be treated as being as
   * sensitive as the input value itself.
   */
  save: () => Uint8Array;
  /**
   * Resume a state that was created by save(). If this state was not created by a
   * compatible build of hash-wasm, an exception will be thrown.
   */
  load: (state: Uint8Array) => IHasher;
  /**
   * Block size in bytes
   */
  blockSize: number;
  /**
   * Digest size in bytes
   */
  digestSize: number;
}

interface IWASMExports {
  memory: {
    buffer: ArrayBuffer
  }
  STATE_SIZE: number
  Hash_SetMemorySize(size: number): void
  Hash_GetBuffer(): number
  Hash_Init(bits: number): void
  Hash_Update(size: number): void
  Hash_Calculate(size: number, initParam: number, digestParam: number): void
  Hash_Final(padding: number): void
  Hash_GetState(): number
}

interface IBinaryContents {
  name: string
  data: string
  hash: string
}

const wasmModuleCache = new Map<string, Promise<WebAssembly.Module>>();

export async function WASMInterface(binary: IBinaryContents, hashLength: number) {
  let wasmInstance: WebAssembly.Instance;
  let wasmExports: IWASMExports;
  let memoryView: Uint8Array;
  let initialized = false;

  if (typeof WebAssembly === 'undefined') {
    throw new Error('WebAssembly is not supported in this environment!');
  }

  const writeMemory = (data: Uint8Array, offset = 0) => {
    memoryView.set(data, offset);
  };

  const getMemory = () => memoryView;
  const getExports = <T extends Record<string, any>>() => wasmInstance.exports as IWASMExports & T;

  const setMemorySize = (totalSize: number) => {
    wasmExports.Hash_SetMemorySize(totalSize);
    const arrayOffset: number = wasmExports.Hash_GetBuffer();
    const memoryBuffer = wasmExports.memory.buffer;
    memoryView = new Uint8Array(memoryBuffer, arrayOffset, totalSize);
  };

  const getStateSize = () => {
    const view = new DataView(wasmExports.memory.buffer);
    const stateSize = view.getUint32(wasmExports.STATE_SIZE, true);
    return stateSize;
  };

  const loadWASMPromise = wasmMutex.dispatch(async () => {
    if (!wasmModuleCache.has(binary.name)) {
      const asm = decodeBase64(binary.data);
      const promise = WebAssembly.compile(asm);

      wasmModuleCache.set(binary.name, promise);
    }

    const wasmModule = await wasmModuleCache.get(binary.name) as WebAssembly.Module;
    const instance = await WebAssembly.instantiate(wasmModule, {
      // env: {
      //   emscripten_memcpy_big: (dest, src, num) => {
      //     const memoryBuffer = wasmExports.memory.buffer;
      //     const memView = new Uint8Array(memoryBuffer, 0);
      //     memView.set(memView.subarray(src, src + num), dest);
      //   },
      //   print_memory: (offset, len) => {
      //     const memoryBuffer = wasmExports.memory.buffer;
      //     const memView = new Uint8Array(memoryBuffer, 0);
      //     console.log('print_int32', memView.subarray(offset, offset + len));
      //   },
      // },
    });
    wasmInstance = instance;
    wasmExports = instance.exports as unknown as IWASMExports;

    // wasmExports._start();
  });

  const setupInterface = async () => {
    if (!wasmInstance) {
      await loadWASMPromise;
    }

    const arrayOffset: number = wasmExports.Hash_GetBuffer();
    const memoryBuffer = wasmExports.memory.buffer;
    memoryView = new Uint8Array(memoryBuffer, arrayOffset, MAX_HEAP);
  };

  const init = (bits = 0) => {
    initialized = true;
    wasmExports.Hash_Init(bits);
  };

  const updateUInt8Array = (data: Uint8Array): void => {
    let read = 0;
    while (read < data.length) {
      const chunk = data.subarray(read, read + MAX_HEAP);
      read += chunk.length;
      memoryView.set(chunk);
      wasmExports.Hash_Update(chunk.length);
    }
  };

  const update = (data: IDataType) => {
    if (!initialized) {
      throw new Error('update() called before init()');
    }
    const Uint8Buffer = getUInt8Buffer(data);
    updateUInt8Array(Uint8Buffer);
  };

  const digestChars = new Uint8Array(hashLength * 2);

  const digest: IHasher['digest'] = (outputType, padding = 0): any => {
    if (!initialized) {
      throw new Error('digest() called before init()');
    }
    initialized = false;

    wasmExports.Hash_Final(padding);

    if (outputType === 'binary') {
      // the data is copied to allow GC of the original memory object
      return memoryView.slice(0, hashLength);
    }

    return getDigestHex(digestChars, memoryView, hashLength);
  };

  const save = (): Uint8Array => {
    if (!initialized) {
      throw new Error('save() can only be called after init() and before digest()');
    }

    const stateOffset: number = wasmExports.Hash_GetState();
    const stateLength: number = getStateSize();
    const memoryBuffer = wasmExports.memory.buffer;
    const internalState = new Uint8Array(memoryBuffer, stateOffset, stateLength);

    // prefix is 4 bytes from SHA1 hash of the WASM binary
    // it is used to detect incompatible internal states between different versions of hash-wasm
    const prefixedState = new Uint8Array(WASM_FUNC_HASH_LENGTH + stateLength);
    writeHexToUInt8(prefixedState, binary.hash);
    prefixedState.set(internalState, WASM_FUNC_HASH_LENGTH);
    return prefixedState;
  };

  const load = (state: Uint8Array) => {
    if (!(state instanceof Uint8Array)) {
      throw new Error('load() expects an Uint8Array generated by save()');
    }

    const stateOffset: number = wasmExports.Hash_GetState();
    const stateLength: number = getStateSize();
    const overallLength: number = WASM_FUNC_HASH_LENGTH + stateLength;
    const memoryBuffer = wasmExports.memory.buffer;

    if (state.length !== overallLength) {
      throw new Error(`Bad state length (expected ${overallLength} bytes, got ${state.length})`);
    }

    if (!hexStringEqualsUInt8(binary.hash, state.subarray(0, WASM_FUNC_HASH_LENGTH))) {
      throw new Error('This state was written by an incompatible hash implementation');
    }

    const internalState = state.subarray(WASM_FUNC_HASH_LENGTH);
    new Uint8Array(memoryBuffer, stateOffset, stateLength).set(internalState);
    initialized = true;
  };

  const isDataShort = (data: IDataType) => {
    if (typeof data === 'string') {
      // worst case is 4 bytes / char
      return data.length < MAX_HEAP / 4;
    }

    return data.byteLength < MAX_HEAP;
  };

  let canSimplify:
    (data: IDataType, initParam?: number) => boolean = isDataShort;

  switch (binary.name) {
    case 'argon2':
    case 'scrypt':
      canSimplify = () => true;
      break;

    case 'blake2b':
    case 'blake2s':
      // if there is a key at blake2 then cannot simplify
      canSimplify = (data, initParam) => !(initParam && initParam > 512) && isDataShort(data);
      break;

    case 'blake3':
      // if there is a key at blake3 then cannot simplify
      canSimplify = (data, initParam) => initParam === 0 && isDataShort(data);
      break;

    case 'xxhash64': // cannot simplify
    case 'xxhash3':
    case 'xxhash128':
      canSimplify = () => false;
      break;

    default:
      break;
  }

  // shorthand for (init + update + digest) for better performance
  const calculate = (
    data: IDataType,
    initParam = 0,
    digestParam = 0,
  ): string => {
    if (!canSimplify(data, initParam)) {
      init(initParam);
      update(data);
      return digest('hex', digestParam) as string;
    }

    const buffer = getUInt8Buffer(data);
    memoryView.set(buffer);
    wasmExports.Hash_Calculate(buffer.length, initParam, digestParam);

    return getDigestHex(digestChars, memoryView, hashLength);
  };

  await setupInterface();

  return {
    getMemory,
    writeMemory,
    getExports,
    setMemorySize,
    init,
    update,
    digest,
    save,
    load,
    calculate,
    hashLength,
  };
}

export type IWASMInterface = ThenArg<ReturnType<typeof WASMInterface>>;
