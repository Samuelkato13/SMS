import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// ── Register Service Worker ───────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      // Auto-update SW when new version available
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      console.log('[ZaabuPay] Service worker registered:', reg.scope);

      // Pre-warm API cache after app loads
      const schoolId = sessionStorage.getItem('zaabupay_demo_auth')
        ? JSON.parse(sessionStorage.getItem('zaabupay_demo_auth') || '{}')?.profile?.schoolId
        : null;

      if (schoolId && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_URLS',
          urls: [
            `/api/classes?schoolId=${schoolId}`,
            `/api/subjects?schoolId=${schoolId}`,
            `/api/exams?schoolId=${schoolId}`,
          ]
        });
      }
    } catch (err) {
      console.warn('[ZaabuPay] Service worker registration failed:', err);
    }
  });
}
