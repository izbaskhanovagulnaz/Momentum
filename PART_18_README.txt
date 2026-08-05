PART 18 — REAL GOAL REORDER + RELIABLE UPDATE NOTICE

Fixed:
- Goal reordering now uses global Pointer Events instead of conflicting HTML5 drag events.
- Works with mouse, touch and stylus from the handle.
- Order persists to Firestore and syncs across devices.
- Update notice now also checks a generated /version.json every 30 seconds.
- deploy.bat generates a unique version on every deploy.
- Returning from background or reconnecting triggers an immediate check.
- Update button clears stale caches and reloads the latest deployment.

Deploy:
1. Extract.
2. Run deploy.bat.
3. Wait for DEPLOY COMPLETE.
4. Fully close the installed PWA once and reopen it.
