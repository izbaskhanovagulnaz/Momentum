import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <main className="safe-top mx-auto w-full max-w-[1400px] px-4 pb-32 pt-6 md:px-8 md:pb-14 md:pt-9 lg:px-10 xl:px-12">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
