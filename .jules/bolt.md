## 2024-05-22 - Stable Drag Handlers in Dashboard
**Learning:** `AccountCard` was wrapped in `React.memo` but re-rendered unnecessarily because `Dashboard` passed inline arrow functions for drag events (e.g. `onDragOver={(e) => handleDragOver(e, id)}`).
**Action:** Use `useRef` to track changing state (`localAccounts`) inside `Dashboard` and create stable `useCallback` handlers that read from the ref. Update child components to accept `id` in the callback signature (e.g. `onDragOver(e, id)`) so the parent can pass the stable function reference directly.
