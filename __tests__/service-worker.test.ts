/** @jest-environment node */

import { jest } from '@jest/globals';

describe('Service Worker (smoke)', () => {
  it('registers listeners and responds to fetch in mock env', async () => {
    // makeServiceWorkerEnv is provided by jest.setup.js and returns a mock global scope
    // which exposes trigger(eventName, event) to simulate events.
    const mockScope = (global as any).makeServiceWorkerEnv();
    Object.assign(global, mockScope);
    jest.resetModules();
    // Import service worker so it attaches handlers to the mock scope
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../src/service-worker');

    // Simulate a fetch event and ensure respondWith is invoked
    const req = new Request('https://example.com');
    const ev = new (global as any).FetchEvent('fetch', { request: req });
    jest.spyOn(ev, 'respondWith');
    await mockScope.trigger('fetch', ev);
    expect(ev.respondWith).toHaveBeenCalled();
  });
});

