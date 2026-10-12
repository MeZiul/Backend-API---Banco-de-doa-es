import { describe, expect, jest, test } from '@jest/globals';
import { z } from 'zod';
import {
  DEFAULT_MAX_DOWNLOAD_SIZE,
  createJsonResponseHandler,
  createJsonErrorResponseHandler,
  createStatusCodeErrorResponseHandler,
} from '@ai-sdk/provider-utils';

const schema = z.object({ message: z.string() });
const handlers = [
  ['JSON success', createJsonResponseHandler(schema)],
  ['JSON error', createJsonErrorResponseHandler({ errorSchema: schema, errorToMessage: (error) => error.message })],
  ['status error', createStatusCodeErrorResponseHandler()],
];
const input = (response) => ({ response, url: 'https://provider.example.invalid', requestBodyValues: {} });

describe('patched provider response readers', () => {
  test.each(handlers)('%s preserves a normal bounded response', async (_name, handler) => {
    const result = await handler(input(new Response(JSON.stringify({ message: 'synthetic result' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })));
    if (_name === 'JSON success') expect(result.value).toEqual({ message: 'synthetic result' });
    else expect(result.value.responseBody).toBe('{"message":"synthetic result"}');
  });

  test.each(handlers)('%s rejects declared oversize before retaining the body', async (_name, handler) => {
    const cancel = jest.fn();
    // Declared size only: no large allocation, external request or provider key.
    const stream = new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode('{"message":"small fixture"}')); },
      cancel,
    });
    const response = new Response(stream, {
      headers: { 'Content-Type': 'application/json', 'Content-Length': String(DEFAULT_MAX_DOWNLOAD_SIZE + 1) },
    });
    await expect(handler(input(response))).rejects.toThrow(/exceeded maximum size/);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
