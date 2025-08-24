declare module 'service-worker-mock' {
  function makeServiceWorkerEnv(): ServiceWorkerGlobalScope;
  export default makeServiceWorkerEnv;
}

declare module 'service-worker-mock/models/FetchEvent' {
  class FetchEvent {
    constructor(type: string, init: { request: Request });
  }
  export = FetchEvent;
}
