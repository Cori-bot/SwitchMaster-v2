## 2024-05-23 - Account Card Accessibility Improvements
**Learning:** Dropdown menus using Tailwind's `group-hover` pattern must also include `group-focus-within` classes (e.g., `group-focus-within/menu:opacity-100`) to ensure keyboard accessibility. This allows users to tab into the menu trigger and subsequent menu items without needing a mouse.
**Action:** Always check `group-hover` implementations and pair them with `group-focus-within` or proper click handlers for keyboard support. Also, ensure icon-only buttons always have `aria-label` attributes.
