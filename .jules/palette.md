# Palette's Journal

## 2025-02-19 - Accessible Dropdowns with Tailwind
**Learning:** Dropdowns using Tailwind's `group-hover` are inaccessible to keyboard users.
**Action:** Always add `group-focus-within:opacity-100` and `group-focus-within:visible` (with appropriate group names like `group-focus-within/menu`) to ensure menus open when their internal buttons receive focus.
