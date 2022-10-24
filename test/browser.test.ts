/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-await-in-loop */
/* global test, expect */
export { };

beforeEach(() => {
  jest.resetModules();
});

test('Throws when WebAssembly is unavailable', async () => {
  const { md5 } = jest.requireActual('../lib');

  const WASM = globalThis.WebAssembly;
  // @ts-ignore
  globalThis.WebAssembly = undefined;

  await expect(() => md5('a')).rejects.toThrow();
  globalThis.WebAssembly = WASM;
});

test('Simulate browsers', async () => {
  const global = globalThis;
  delete (globalThis as any).Buffer;

  const { md5 } = jest.requireActual('../lib');
  expect(await md5('a')).toBe('0cc175b9c0f1b6a831c399e269772661');
  expect(await md5(new Uint8Array([0]))).toBe('93b885adfe0da089cdf634904fd59f71');
  expect(() => md5(1)).rejects.toThrow();

  (globalThis as any) = global;
});

test('Use global self', async () => {
  const global = globalThis;
  (globalThis as any).self = global;

  const { md5 } = jest.requireActual('../lib');
  expect(await md5('a')).toBe('0cc175b9c0f1b6a831c399e269772661');

  (globalThis as any) = global;
});

test('Delete global self', async () => {
  const global = globalThis;
  // @ts-ignore
  delete globalThis.self;

  const { md5 } = jest.requireActual('../lib');
  expect(await md5('a')).toBe('0cc175b9c0f1b6a831c399e269772661');

  (globalThis as any) = global;
});

test('Use global window', async () => {
  const global = globalThis;
  (globalThis as any).window = global;

  const { md5 } = jest.requireActual('../lib');
  expect(await md5('a')).toBe('0cc175b9c0f1b6a831c399e269772661');

  (globalThis as any) = global;
});

test('Delete global self + window', async () => {
  const global = globalThis;
  // @ts-ignore
  delete globalThis.window;

  const { md5 } = jest.requireActual('../lib');
  expect(await md5('a')).toBe('0cc175b9c0f1b6a831c399e269772661');

  (globalThis as any) = global;
});
