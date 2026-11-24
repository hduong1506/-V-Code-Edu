// TEST-ONLY fake of firebase-app.js (served by Playwright route interception; never used in production).
const apps = [];
export function initializeApp(config = {}, name = '[DEFAULT]') {
  const app = { name, options: config, automaticDataCollectionEnabled: false };
  apps.push(app);
  return app;
}
export function getApps() { return apps.slice(); }
export function getApp() { return apps[0]; }
export const SDK_VERSION = 'mock';
