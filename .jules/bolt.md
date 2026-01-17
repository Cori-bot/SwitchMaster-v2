## 2025-05-21 - Stable Drag-and-Drop Handlers with Refs

**Learning:** In `Dashboard.tsx`, high-frequency drag events required accessing the latest `localAccounts` state. Passing updated callbacks (depending on state) to `AccountCard` broke `React.memo` optimization, causing O(N) re-renders on every drag frame or state update.
**Action:** Use `useRef` to track `localAccounts` and `draggedId`, updating them in `useLayoutEffect`. This allows drag handlers (`onDragOver`, etc.) to be memoized with empty dependency arrays (stable references), reading the latest state from refs. This restores `React.memo` effectiveness for child components.
