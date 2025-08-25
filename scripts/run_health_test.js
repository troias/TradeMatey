// Polyfill Web APIs for Node.js
global.Request = class Request {
  constructor(url, options) {
    this.url = url;
    this.options = options || {};
  }
};

global.Response = class Response {
  constructor(body, options) {
    this.body = body;
    this.options = options || {};
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

(async () => {
  try {
    // Use GET_RAW for direct testing without NextResponse wrapper
    const mod = await import('../src/app/api/internal/health/route.ts');
    const body = await mod.GET_RAW();
    console.log('Health check result:', JSON.stringify(body, null, 2));
  } catch (e) {
    console.error('Error running health check', e);
    process.exitCode = 1;
  }
})();
