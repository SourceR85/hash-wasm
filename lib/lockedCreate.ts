import type Mutex from './mutex';
import { WASMInterface } from './WASMInterface';
import type { IWASMInterface } from './WASMInterface';

export default async function lockedCreate(
  mutex: Mutex,
  binary: {
    name: string
    data: string
    hash: string
  },
  hashLength: number,
): Promise<IWASMInterface> {
  const unlock = await mutex.lock();
  const wasm = await WASMInterface(binary, hashLength);
  unlock();
  return wasm;
}
