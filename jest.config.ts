export default {
  roots: [
    '<rootDir>/test',
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  cacheDirectory: '<rootDir>/.jest-cache',
};
