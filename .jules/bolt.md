## 2024-05-22 - [React DnD Performance]
**Learning:** High-frequency drag events (like `dragOver`) that update state (reordering list) cause the parent component to re-render. If drag handlers depend on this state, they are recreated, forcing all child components (list items) to re-render, even if memoized.
**Action:** Use a `useRef` to track the changing state (sync it in `useLayoutEffect`). Access `ref.current` inside `useCallback` handlers. This keeps handlers referentially stable, preventing unnecessary child re-renders during the drag operation.
