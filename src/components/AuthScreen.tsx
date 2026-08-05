import { LoaderCircle } from "lucide-react";
import { useAuth } from "../AuthContext";

export default function AuthScreen() {
  const { loading, error, loginWithGoogle } = useAuth();

  return (
    <main className="safe-top safe-bottom flex min-h-[100dvh] items-center justify-center bg-white px-5 py-8">
      <section className="w-full max-w-sm rounded-[32px] border border-line bg-white p-7 text-center shadow-[0_24px_70px_rgba(20,20,20,0.08)] md:p-9">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-xl font-semibold text-white">
          M
        </div>
        <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.18em] text-ink-muted">Личный планировщик</p>
        <h1 className="mb-3 text-[30px] font-semibold tracking-tight text-ink">Momentum</h1>
        <p className="mb-7 text-[14px] leading-6 text-ink-secondary">
          Войди через Google, чтобы задачи и заметки синхронизировались между телефоном и компьютером.
        </p>

        <button
          type="button"
          onClick={() => void loginWithGoogle()}
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-line bg-white text-[14px] font-medium text-ink transition hover:bg-surface-subtle disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? <LoaderCircle size={18} className="animate-spin" /> : <span className="font-semibold text-blue-600">G</span>}
          Продолжить через Google
        </button>

        {error && <p className="mt-4 text-[13px] text-red-600">{error}</p>}
      </section>
    </main>
  );
}
