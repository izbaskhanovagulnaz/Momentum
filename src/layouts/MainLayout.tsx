import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <main className="safe-top mx-auto w-full max-w-[1440px] px-5 pb-28 pt-8 md:px-8 md:pb-12 md:pt-10 lg:px-10 xl:px-12">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
