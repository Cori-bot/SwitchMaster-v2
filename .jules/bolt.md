# Bolt's Journal

## 2024-05-22 - [Ref Pattern for Drag Handlers]
**Learning:** High-frequency drag events (like `onDragOver`) that depend on rapidly changing state (like list order) can cause excessive re-renders if used as dependencies in `useCallback`.
**Action:** Use a `useRef` to store the mutable state (`localAccounts`) and access `ref.current` inside the event handler. This allows the handler function to remain stable (referentially equal) throughout the drag operation, preventing child components (like `AccountCard`) from re-rendering unnecessarily.
