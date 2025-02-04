import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import { terser } from '@el3um4s/rollup-plugin-terser';
// import gzipPlugin from 'rollup-plugin-gzip';

// rollup-plugin-license@2.8.2 depends on rollup@^1 || rollup@^2, rollup 3 are not supported.
// import license from 'rollup-plugin-license';

const ALGORITHMS = [
  'adler32',
  'argon2',
  'bcrypt',
  'blake2b',
  'blake2s',
  'blake3',
  'crc32',
  'crc32c',
  'hmac',
  'keccak',
  'md4',
  'md5',
  'pbkdf2',
  'ripemd160',
  'scrypt',
  'sha1',
  'sha3',
  'sha224',
  'sha256',
  'sha384',
  'sha512',
  'sm3',
  'whirlpool',
  'xxhash32',
  'xxhash64',
  'xxhash3',
  'xxhash128',
];

const TERSER_CONFIG = {
  output: {
    comments: false,
  },
};

// const LICENSE_CONFIG = {
//   banner: {
//     commentStyle: 'ignored',
//     content: `hash-wasm (https://www.npmjs.com/package/hash-wasm)
//     (c) Dani Biro
//     @license MIT`,
//   },
// };

const MAIN_BUNDLE_CONFIG = {
  input: 'lib/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'es',
    },
  ],
  plugins: [
    json(),
    typescript(),
    // license(LICENSE_CONFIG),
  ],
};

const MINIFIED_MAIN_BUNDLE_CONFIG = {
  input: 'lib/index.ts',
  output: [
    {
      file: 'dist/index.min.js',
      format: 'es',
    },
  ],
  plugins: [
    json(),
    typescript(),
    terser(TERSER_CONFIG),
    // license(LICENSE_CONFIG),
  ],
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const INDIVIDUAL_BUNDLE_CONFIG = (algorithm) => ({
  input: `lib/${algorithm}.ts`,
  output: [
    {
      file: `dist/${algorithm}.min.js`,
      name: 'hashwasm',
      format: 'es',
      extend: true,
    },
  ],
  plugins: [
    json(),
    typescript(),
    terser(TERSER_CONFIG),
    // license(LICENSE_CONFIG),
    // gzipPlugin(),
  ],
});

export default [
  MAIN_BUNDLE_CONFIG,
  MINIFIED_MAIN_BUNDLE_CONFIG,
  ...ALGORITHMS.map(INDIVIDUAL_BUNDLE_CONFIG),
];
