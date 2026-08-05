import TopBar from "../components/TopBar";
import QuickNote from "../components/QuickNote";
import { usePlanner } from "../PlannerContext";

export default function Notes() {
  const { notes, addNote, deleteNote } = usePlanner();

  return (
    <div>
      <TopBar eyebrow={`${notes.length} заметки`} title="Заметки" />
      <QuickNote notes={notes} onSave={addNote} onDelete={deleteNote} limit={notes.length} />
    </div>
  );
}
