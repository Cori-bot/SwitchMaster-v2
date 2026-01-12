## 2024-05-23 - React Event Handlers & Memoization
**Learning:** In React lists where items are memoized (React.memo), passing inline arrow functions (e.g., `onDragOver={(e) => handler(e, id)}`) as props defeats memoization because the function reference changes on every parent render. This causes all list items to re-render even if their data hasn't changed.
**Action:**
1. Define handlers in the parent using `useCallback`.
2. If the handler needs an ID, modify the child component to accept a generic handler `(e, id) => void` and pass the ID itself when invoking it.
3. If the handler relies on rapidly changing state (like drag sort order), use a `useRef` to access the latest state inside the callback without adding it to the dependency array, keeping the callback reference stable.
