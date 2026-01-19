## 2024-05-22 - Stable Drag Handlers with useRef
**Learning:** Drag and drop handlers often depend on rapidly changing state (like `draggedId` or list order). Passing these handlers to child components causes them to re-render if the handlers are recreated on every change.
**Action:** Use `useRef` to hold the latest state (synced via `useLayoutEffect`) and access these refs inside `useCallback` handlers. This keeps the handler function references stable, allowing `React.memo` on child components to work effectively during drag operations.
