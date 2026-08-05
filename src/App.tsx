import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import CalendarPage from "./pages/Calendar";
import Tasks from "./pages/Tasks";
import Goals from "./pages/Goals";
import Notes from "./pages/Notes";
import Settings from "./pages/Settings";
import PwaUpdatePrompt from "./components/PwaUpdatePrompt";

export default function App() {
  return (
    <>
      <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      </Routes>
      <PwaUpdatePrompt />
    </>
  );
}
