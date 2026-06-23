import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

const SESSION_KEY = 'zaabupay_session';

function getSessionSchoolId(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session?.profile?.schoolId ?? null;
  } catch {
    return null;
  }
}

// ── Register Service Worker ───────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

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

      const warmCache = (schoolId: string | null) => {
        if (!schoolId || !navigator.serviceWorker.controller) return;
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_URLS',
          urls: [
            `/api/classes?schoolId=${schoolId}`,
            `/api/students?schoolId=${schoolId}`,
            `/api/subjects?schoolId=${schoolId}`,
            `/api/exams?schoolId=${schoolId}`,
          ],
        });
      };

      warmCache(getSessionSchoolId());

      // Re-warm when user logs in during this session
      window.addEventListener('storage', (e) => {
        if (e.key === SESSION_KEY) warmCache(getSessionSchoolId());
      });
    } catch (err) {
      console.warn('[ZaabuPay] Service worker registration failed:', err);
    }
  });
}
