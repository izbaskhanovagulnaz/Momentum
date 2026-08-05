MOMENTUM — PART 1: TASKS FOUNDATION

Completed in this part:
- One shared PlannerContext for Home and Tasks.
- Tasks created on the Tasks page immediately appear on Home.
- Create task with time and urgent priority.
- Complete / reopen task.
- Delete task.
- Filter: All / Active / Completed.
- Search tasks.
- Notes and tasks are saved locally as a temporary persistence layer.

Important:
This is not the cloud-sync release yet. In Part 2, the persistence layer in
PlannerContext will be replaced with Firebase Authentication + Firestore,
without changing the UI components.

Files changed:
- src/PlannerContext.tsx (new)
- src/main.tsx
- src/pages/Home.tsx
- src/pages/Tasks.tsx
