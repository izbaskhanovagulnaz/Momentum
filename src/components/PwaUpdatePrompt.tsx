import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";

const CHECK_INTERVAL_MS = 30_000;
const STORAGE_KEY = "momentum:last-applied-version";

interface VersionPayload {
  version?: string;
}

export default function PwaUpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [hidden, setHidden] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloading = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let intervalId: number | undefined;
    let disposed = false;

    const reveal = (version?: string | null) => {
      if (version) setAvailableVersion(version);
      setHidden(false);
    };

    const checkVersion = async () => {
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!response.ok) return;

        const payload = (await response.json()) as VersionPayload;
        const serverVersion = String(payload.version || "").trim();
        if (!serverVersion) return;

        const appliedVersion = localStorage.getItem(STORAGE_KEY);
        if (!appliedVersion || appliedVersion !== serverVersion) {
          reveal(serverVersion);
        }
      } catch {
        // Offline or temporary network failure: keep the app usable.
      }
    };

    const showWaitingWorker = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(registration.waiting);
        reveal();
      }
    };

    const watchRegistration = (registration: ServiceWorkerRegistration) => {
      registrationRef.current = registration;
      showWaitingWorker(registration);

      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener("statechange", () => {
          if (
            installingWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showWaitingWorker(registration);
          }
        });
      });
    };

    navigator.serviceWorker.ready
      .then((registration) => {
        if (disposed) return;
        watchRegistration(registration);
        void registration.update();
        void checkVersion();

        intervalId = window.setInterval(() => {
          void registration.update();
          void checkVersion();
        }, CHECK_INTERVAL_MS);
      })
      .catch(() => undefined);

    const onControllerChange = () => {
      if (reloading.current) return;
      reloading.current = true;
      window.location.reload();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void registrationRef.current?.update();
        void checkVersion();
      }
    };

    const onOnline = () => {
      void registrationRef.current?.update();
      void checkVersion();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);

    return () => {
      disposed = true;
      if (intervalId) window.clearInterval(intervalId);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const applyUpdate = async () => {
    setUpdating(true);

    if (availableVersion) {
      localStorage.setItem(STORAGE_KEY, availableVersion);
    }

    try {
      const registration = registrationRef.current;
      await registration?.update();

      const worker = registration?.waiting || waitingWorker;
      if (worker) {
        worker.postMessage({ type: "SKIP_WAITING" });
        return;
      }

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      const url = new URL(window.location.href);
      url.searchParams.set("updated", String(Date.now()));
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  };

  if ((!waitingWorker && !availableVersion) || hidden) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[100] md:bottom-6 md:left-auto md:right-6 md:w-[390px]">
      <div className="flex items-center gap-3 rounded-2xl border border-line-strong bg-white p-3 shadow-[0_18px_55px_rgba(17,17,19,0.18)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <RefreshCw size={19} className={updating ? "animate-spin" : ""} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink">Доступна новая версия</p>
          <p className="mt-0.5 text-[11px] leading-4 text-ink-muted">
            Обновите Momentum без повторной установки.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void applyUpdate()}
          disabled={updating}
          className="shrink-0 rounded-xl bg-accent px-3 py-2 text-[12px] font-medium text-white disabled:opacity-60"
        >
          {updating ? "Обновление…" : "Обновить"}
        </button>

        <button
          type="button"
          onClick={() => setHidden(true)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-subtle"
          aria-label="Закрыть уведомление"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
