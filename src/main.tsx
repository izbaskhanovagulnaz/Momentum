import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/globals.css";
import { PlannerProvider } from "./PlannerContext";
import { AuthProvider, useAuth } from "./AuthContext";
import AuthScreen from "./components/AuthScreen";

const savedTheme = localStorage.getItem("momentum-theme");
document.documentElement.dataset.theme = savedTheme === "dark" ? "dark" : "light";

function RootApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-[100dvh] items-center justify-center text-sm text-ink-muted">Загрузка...</div>;
  }

  if (!user) return <AuthScreen />;

  return (
    <PlannerProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PlannerProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <RootApp />
    </AuthProvider>
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        updateViaCache: "none",
      });
      await registration.update();
    } catch (error) {
      console.error("Service worker:", error);
    }
  });
}
