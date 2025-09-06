require('@testing-library/jest-dom');

// Mock cn function
jest.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}));

// Polyfill Web APIs needed by Next.js routes
global.Request = class Request {
  constructor(url, options) {
    this.url = url;
    this.options = options;
  }
};

global.Response = class Response {
  constructor(body, options) {
    this.body = body;
    this.options = options;
  }
  json() {
    try {
      if (typeof this.body === 'string') return Promise.resolve(JSON.parse(this.body));
      return Promise.resolve(this.body);
    } catch (e) {
      return Promise.resolve(null);
    }
  }
};

global.Headers = class Headers {
  constructor() {
    this._headers = {};
  }
  get(name) {
    return this._headers[name.toLowerCase()];
  }
  set(name, value) {
    this._headers[name.toLowerCase()] = value;
  }
};

// Provide a minimal NextResponse compatible interface used in server routes tests
global.NextResponse = {
  json: (body, opts) => ({ status: opts?.status ?? 200, json: async () => body, body }),
};

// Ensure imports of `next/server` in route modules resolve to our shim during tests
jest.mock('next/server', () => ({ NextResponse: global.NextResponse }));

// Provide a basic Request.json() implementation on our Request shim
global.Request = class Request {
  constructor(url, options) {
    this.url = url;
    this.options = options || {};
  }
  async json() {
    if (this.options && this.options.body) {
      try {
        return JSON.parse(this.options.body);
      } catch (e) {
        return this.options.body;
      }
    }
    return {};
  }
};

// Provide a lightweight Service Worker testing environment helper used by service-worker tests
global.makeServiceWorkerEnv = function makeServiceWorkerEnv() {
  const listeners = new Map();

  const scope = {
    addEventListener: (type, handler) => listeners.set(type, handler),
    removeEventListener: (type) => listeners.delete(type),
    trigger: async (type, ev) => {
      const h = listeners.get(type);
      if (typeof h === 'function') await h(ev);
    },
    skipWaiting: async () => undefined,
    clients: { claim: async () => undefined },
    caches: {
      _store: new Map(),
      match: async (req) => undefined,
      open: async (name) => ({
        match: async () => undefined,
        put: async () => undefined,
        delete: async () => undefined,
        keys: async () => [],
        addAll: async () => undefined,
        add: async () => undefined,
      }),
      delete: async () => undefined,
      has: async () => false,
      keys: async () => [],
    },
    fetch: async () => new Response(''),
  };
  return scope;
};

// Silence console output during tests to avoid Jest 'log after tests' errors
['log', 'error', 'warn', 'info'].forEach((m) => {
  const orig = console[m];
  console[m] = (..._args) => {};
  // expose restore if needed
  console[m].restore = () => { console[m] = orig; };
});

// Make `self` available for service-worker code which expects a WorkerGlobalScope
if (typeof global.self === 'undefined') global.self = global;

// Minimal FetchEvent & ExtendableEvent shims used in service worker tests
if (typeof global.FetchEvent === 'undefined') {
  global.FetchEvent = class FetchEvent extends Event {
    constructor(type, init) {
      super(type);
      if (init && init.request) this.request = init.request;
      this.respondWith = (p) => p;
    }
  };
}

if (typeof global.ExtendableEvent === 'undefined') {
  global.ExtendableEvent = class ExtendableEvent extends Event {};
}

// Ensure Stripe secret is present in tests to avoid constructor errors in mocked Stripe
if (!process.env.STRIPE_SECRET_KEY) process.env.STRIPE_SECRET_KEY = 'sk_test_local';

// After each test, if the hubspot worker module is loaded, reset its metrics to avoid cross-test leakage
afterEach(() => {
  try {
    // require the module if present; the worker guards auto-start in test env
    // eslint-disable-next-line global-require
    const worker = require('./src/workers/hubspot/worker');
    if (worker && worker.metrics && typeof worker.metrics.reset === 'function') {
      worker.metrics.reset();
    }
  } catch (e) {
    // ignore if worker not present or errors during require
  }
});
