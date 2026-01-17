# Palette's Journal

## 2025-02-23 - Testing React 18 Components without Testing Library
**Learning:** In environments where `@testing-library/react` is unavailable, React 18+ components can still be effectively tested using `react-dom/client`'s `createRoot` and `act`. However, `global.IS_REACT_ACT_ENVIRONMENT = true` must be explicitly set to enable `act()` behavior and avoid warnings.
**Action:** When setting up tests in minimal environments, ensure the global flag is set in `beforeEach` and cleaned up in `afterEach` to properly support async state updates in tests.

## 2025-02-23 - Icon-Only Button Accessibility Pattern
**Learning:** Icon-only buttons (like "Favorite" stars or "Menu" dots) are frequent accessibility gaps. Adding both `aria-label` (for screen readers) and `title` (for mouse hover tooltips) provides a complete coverage for both assistive technology and mouse users.
**Action:** Always pair `aria-label` with `title` for icon-only interactive elements to support multiple modalities of user interaction.
