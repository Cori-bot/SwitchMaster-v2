## 2024-05-22 - Renderer Drag Performance Bottleneck
**Learning:** `AccountCard` components in `Dashboard` were re-rendering on every drag frame because `onDragOver` was passed as an inline function `(e) => handleDragOver(e, id)`. Furthermore, `handleDragOver` depended on `localAccounts` state, causing it to be recreated on every state update (swap).
**Action:** Use `useRef` to hold mutable state (`localAccounts`, `draggedId`) for event handlers to maintain referential stability. Pass stable handlers to memoized components.
