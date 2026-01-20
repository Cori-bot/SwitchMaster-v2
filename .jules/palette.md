## 2024-05-22 - Keyboard Accessibility for Group-Hover Menus
**Learning:** Tailwind's `group-hover` pattern creates inaccessible dropdowns that only work with a mouse. Keyboard users cannot access the menu items because focus never triggers the visibility change.
**Action:** Always pair `group-hover` utility classes with `group-focus-within` (e.g., `group-focus-within/menu:opacity-100`) to ensure menus expand when a user tabs into the trigger button.
