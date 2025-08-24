/**
 * @jest-environment node
 */

import { expect, jest, describe, beforeEach, it } from '@jest/globals';
import { Response } from 'node-fetch';

interface MockFetchEvent extends Event {
  request: Request;
  respondWith: jest.Mock;
  waitUntil: jest.Mock;
}

describe('Service Worker', () => {
  let cacheMatchMock: jest.Mock;
  let fetchMock: jest.Mock;
  let listeners: Map<string, Function>;

  beforeEach(() => {
    // Set up mocks
    cacheMatchMock = jest.fn();
    fetchMock = jest.fn();
    listeners = new Map();

    // Mock global objects
    const globalAny = global as any;
    globalAny.caches = { match: cacheMatchMock };
    globalAny.fetch = fetchMock;
    globalAny.addEventListener = (type: string, handler: Function) => {
      listeners.set(type, handler);
    };

    // Reset modules and import service worker
    jest.resetModules();
    require('../src/service-worker');
  });

  it('should handle fetch events with cache-first strategy', async () => {
    const request = new Request('https://example.com');
    const cachedResponse = new Response('cached');
    const networkResponse = new Response('network');

    const fetchHandler = listeners.get('fetch');
    expect(fetchHandler).toBeDefined();

    const event = {
      type: 'fetch',
      request: request,
      respondWith: jest.fn(),
      waitUntil: jest.fn()
    } as MockFetchEvent;

    // Test cache hit scenario
    cacheMatchMock.mockResolvedValueOnce(cachedResponse);
    await (fetchHandler as Function)(event);

    expect(cacheMatchMock).toHaveBeenCalledWith(request);
    expect(event.respondWith).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();

    // Reset all mocks
    jest.clearAllMocks();

    // Test cache miss scenario
    cacheMatchMock.mockResolvedValueOnce(undefined);
    fetchMock.mockResolvedValueOnce(networkResponse);
    await (fetchHandler as Function)(event);

    expect(cacheMatchMock).toHaveBeenCalledWith(request);
    expect(fetchMock).toHaveBeenCalledWith(request);
    expect(event.respondWith).toHaveBeenCalled();
  });
});

  beforeEach(() => {
    // Set up service worker environment
    mockScope = makeServiceWorkerEnv();
    Object.assign(global, mockScope);
    jest.resetModules();

    // Mock service worker functions
    mockScope.skipWaiting = jest.fn().mockResolvedValue(undefined);
    mockScope.clients = { claim: jest.fn().mockResolvedValue(undefined) };

    // Mock caches
    const mockCache = {
      match: jest.fn().mockResolvedValue(undefined),
      put: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      keys: jest.fn().mockResolvedValue([]),
      addAll: jest.fn().mockResolvedValue(undefined),
      add: jest.fn().mockResolvedValue(undefined),
    };

    mockScope.caches = {
      match: jest.fn().mockResolvedValue(undefined),
      open: jest.fn().mockResolvedValue(mockCache),
      delete: jest.fn().mockResolvedValue(undefined),
      has: jest.fn().mockResolvedValue(false),
      keys: jest.fn().mockResolvedValue([]),
    };

    // Mock fetch
    mockScope.fetch = jest.fn().mockResolvedValue(new Response(''));
  });

  it('should handle fetch events', async () => {
    const request = new Request('https://example.com');
    const fetchEvent = new FetchEvent('fetch', { request }) as any;
    
    jest.spyOn(fetchEvent, 'respondWith');
    await mockScope.trigger('fetch', fetchEvent);
    
    expect(fetchEvent.respondWith).toHaveBeenCalled();
  });

  it('should skip waiting on install', async () => {
    const installEvent = new ExtendableEvent('install') as any;
    await mockScope.trigger('install', installEvent);
    
    expect(mockScope.skipWaiting).toHaveBeenCalled();
  });

  it('should claim clients on activate', async () => {
    const activateEvent = new ExtendableEvent('activate') as any;
    await mockScope.trigger('activate', activateEvent);
    
    expect(mockScope.clients.claim).toHaveBeenCalled();
  });

  it('should serve cached response when available', async () => {
    const request = new Request('https://example.com');
    const response = new Response('cached content');
    
    mockScope.caches.match.mockResolvedValueOnce(response);
    
    const fetchEvent = new FetchEvent('fetch', { request }) as any;
    await mockScope.trigger('fetch', fetchEvent);
    
    expect(mockScope.caches.match).toHaveBeenCalledWith(request);
  });

  it('should fetch from network when cache is empty', async () => {
    const request = new Request('https://example.com');
    const networkResponse = new Response('network content');
    
    mockScope.caches.match.mockResolvedValueOnce(undefined);
    mockScope.fetch.mockResolvedValueOnce(networkResponse);
    
    const fetchEvent = new FetchEvent('fetch', { request }) as any;
    await mockScope.trigger('fetch', fetchEvent);
    
    expect(mockScope.fetch).toHaveBeenCalledWith(request);
  });
});
