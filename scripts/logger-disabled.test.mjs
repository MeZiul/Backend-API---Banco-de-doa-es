import { test } from 'node:test';
import assert from 'node:assert/strict';

test('Disabled logs do not accumulate messages in an unconsumed Winston stream', async () => {
  Object.assign(process.env, { LOG_ENABLED: 'false', NODE_ENV: 'test' });
  const { default: logger } = await import('../src/utils/logger.js');
  for (let i = 0; i < 1000; i++) logger.info('Synthetic disabled log');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(logger.writableLength, 0);
  assert.equal(logger.readableLength, 0);
  logger.close();
});
