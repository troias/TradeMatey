type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatMessage(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  const payload = { timestamp: new Date().toISOString(), level, message: msg, ...meta };
  try {
    return JSON.stringify(payload);
  } catch {
    return `${level.toUpperCase()}: ${msg}`;
  }
}

// minimal local types for Sentry shapes to keep tooling happy without depending on @sentry/types
type SentryEvent = unknown;
type SentryScope = { setExtras: (v: Record<string, unknown>) => void; setUser: (v: { id: string }) => void };
let sentryInitialized = false;

async function ensureSentry() {
  try {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) return null;
    const Sentry = await import('@sentry/node');
    if (!sentryInitialized && Sentry && Sentry.init) {
      const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1);
      // basic scrub fields and beforeSend to remove tokens
      Sentry.init({
        dsn,
        tracesSampleRate,
        beforeSend(event: SentryEvent | unknown) {
          try {
            const ev = event as unknown as { request?: { data?: unknown } };
            if (ev && ev.request && ev.request.data) {
              // basic scrub: remove any long-looking tokens in request.data
              const body = ev.request.data;
              if (typeof body === 'string' && body.length > 1000) {
                ev.request.data = '[redacted]';
              }
            }
          } catch {
            // noop
          }
          return event;
        },
      });
      sentryInitialized = true;
    }
    return Sentry;
  } catch {
    return null;
  }
}

type Meta = Record<string, unknown> | undefined;

function genId() {
  try {
    // prefer crypto.randomUUID when available (Node 18+, browsers)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (globalThis as any)?.crypto?.randomUUID === 'function') return (globalThis as any).crypto.randomUUID();
  } catch {}
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getLogger(baseContext: Record<string, unknown> = {}) {
  const ctx = { requestId: baseContext.requestId ?? genId(), ...baseContext };

  return {
    info: (msg: string, meta?: Meta) => {
      console.log(formatMessage('info', msg, { ...ctx, ...meta }));
    },
    warn: (msg: string, meta?: Meta) => {
      console.warn(formatMessage('warn', msg, { ...ctx, ...meta }));
    },
    error: async (msg: string, meta?: Meta) => {
      console.error(formatMessage('error', msg, { ...ctx, ...meta }));
      try {
        const Sentry = await ensureSentry();
        if (Sentry) {
          Sentry.configureScope((scope: SentryScope) => {
            scope.setExtras({ ...(ctx as Record<string, unknown>), ...(meta ?? {}) });
            if ((ctx as Record<string, unknown>).userId)
              scope.setUser({ id: String((ctx as Record<string, unknown>).userId) });
          });
          if (meta && meta instanceof Error) Sentry.captureException(meta);
          else Sentry.captureException(new Error(msg));
        }
      } catch {
        // ignore Sentry forward errors
      }
    },
    debug: (msg: string, meta?: Meta) => {
      console.debug(formatMessage('debug', msg, { ...ctx, ...meta }));
    },
    child: (more: Record<string, unknown>) => getLogger({ ...ctx, ...more }),
  };
}

// backward-compatible default logger
export const logger = getLogger();
