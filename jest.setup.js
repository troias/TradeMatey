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
    return Promise.resolve(JSON.parse(this.body));
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
