## 2024-05-23 - React List Performance
**Learning:** In drag-and-drop lists where items render expensive components, passing inline arrow functions for drag handlers defeats `React.memo`. Refactoring child components to accept an ID in the handler allows the parent to pass stable `useCallback` references, significantly reducing re-renders during high-frequency drag events.
**Action:** Always prefer `onEvent(e, id)` signatures for list items over closures `(e) => onEvent(e, id)` in the parent render loop.
