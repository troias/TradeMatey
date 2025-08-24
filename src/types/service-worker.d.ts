/// <reference lib="webworker" />

export interface ServiceWorkerGlobalScope extends WorkerGlobalScope {
  // Add any custom service worker global properties here
  skipWaiting(): Promise<void>;
  registration: ServiceWorkerRegistration;
  clients: Clients;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

export interface ServiceWorkerRegistration {
  pushManager: PushManager;
  sync: SyncManager;
  showNotification(title: string, options?: NotificationOptions): Promise<void>;
  getNotifications(options?: GetNotificationOptions): Promise<Notification[]>;
}

export interface ServiceWorkerEvent extends Event {
  waitUntil(promise: Promise<void>): void;
}

export interface FetchEvent extends ServiceWorkerEvent {
  request: Request;
  respondWith(response: Response | Promise<Response>): void;
  clientId: string;
}

export interface NotificationEvent extends ServiceWorkerEvent {
  notification: Notification;
  action: string;
}

export interface PushEvent extends ServiceWorkerEvent {
  data: PushMessageData;
}

export interface InstallEvent extends ServiceWorkerEvent {
  activeWorker: ServiceWorker | null;
}
