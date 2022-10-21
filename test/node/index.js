/* eslint "@typescript-eslint/explicit-function-return-type": "off" */
/* eslint-disable no-console */
import { md5 } from '../../dist/index';

async function run() {
  console.log('Result: ', await md5('a'));
}

run();
