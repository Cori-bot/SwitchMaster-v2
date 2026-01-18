## 2024-03-24 - AccountCard Dropdown Accessibility
**Learning:** Dropdowns implemented with Tailwind's `group-hover` utility are inaccessible to keyboard users because hover states cannot be triggered via keyboard.
**Action:** Always add `group-focus-within` utilities (e.g., `group-focus-within/menu:opacity-100`) alongside `group-hover` to ensure the menu opens when any child element receives focus, maintaining the pure CSS toggle pattern without needing extra state.

## 2024-03-24 - Dynamic ARIA Labels in React
**Learning:** Icon-only toggle buttons (like "Favorite") need dynamic `aria-label` attributes that reflect the current state (e.g., "Add to favorites" vs "Remove from favorites") rather than a static label.
**Action:** Use conditional logic for `aria-label` and `title` attributes on toggle buttons to provides accurate context to screen reader users.
