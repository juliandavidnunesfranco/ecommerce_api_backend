import { registerAs } from '@nestjs/config';

export default registerAs('supabase', () => {
  return {
    url: 'http://127.0.0.1:8000', // Puerto por defecto del API REST de Supabase
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
        detectSessionInUrl: false,
      },
      db: {
        schema: 'public',
        pooling: {
          max: 500,
          min: 1,
          idleTimeoutMillis: 120000,
          reapIntervalMillis: 1000,
          log: false,
          createTimeoutMillis: 2000,
          createRetryIntervalMillis: 100,
          propagateCreateError: false,
        },
      },
      global: {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
        fetch: globalThis.fetch,
        fetchOptions: {
          // Configuración del fetch
          cache: 'no-cache',
          credentials: 'include',
          mode: 'cors',
          redirect: 'follow',
          referrerPolicy: 'no-referrer',
        },
        timeout: {
          default: 10000,
          websocket: 15000,
        },
        retryAttemps: 3,
        retryDelay: 2000,
      },
      realtime: {
        enable: true,
        channels: {
          minimal: true,
        },
        presence: {
          enable: true,
        },
      },
      storage: {
        maxConcurrentUploads: 100,
        maxConcurrentDownloads: 100,
        maxRetryAttempts: 3,
        retryDelay: 1000,
        retryDelayJitter: 1000,
        maxFileSize: 104857600, // 100MB
        maxFileCount: 100,
      },
    },
  };
});
