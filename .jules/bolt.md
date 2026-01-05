## 2024-05-23 - Stable Event Handlers in Lists
**Learning:** In a list of memoized components (like `AccountCard`), using inline arrow functions for event handlers (e.g., `onDragOver={(e) => handleDragOver(e, id)}`) defeats `React.memo` because the function reference changes on every render of the parent.
**Action:** Define handlers that accept the ID as an argument in the child component props (e.g., `onDragOver(e, id)`), and pass a stable parent handler reference (e.g., `onDragOver={handleDragOver}`) to the child. The child invokes the prop with its own ID.
