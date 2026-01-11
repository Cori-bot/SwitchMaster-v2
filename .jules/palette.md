## 2024-05-23 - Accessibility in Dropdown Menus
**Learning:** Dropdowns using `group-hover` for mouse users are inaccessible to keyboard users unless they also implement `group-focus-within`.
**Action:** Always add `group-focus-within` patterns (e.g., `group-focus-within/menu:opacity-100`) alongside `group-hover` for CSS-only dropdowns, or use JS state for visibility.
