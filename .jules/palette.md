## 2024-05-23 - Accessibility of Hover Menus
**Learning:** Dropdown menus relying solely on `group-hover` classes are inaccessible to keyboard users.
**Action:** Always include `group-focus-within` variants (e.g., `group-focus-within/menu:opacity-100`) alongside `group-hover` to ensure menus open when focus enters the container.
