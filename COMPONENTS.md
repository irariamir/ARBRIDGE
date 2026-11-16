# Component guidance

- **Page header:** wordmark, a small company attribution, concise navigation, and a single clear action. Collapse navigation cleanly on narrow screens.
- **Buttons:** square-cornered, high-contrast primary green action; neutral outlined secondary action. Include hover, active, disabled, and keyboard-focus states without shadows.
- **Status:** readable label plus icon/text, e.g. “Queued”, “Downloading”, “Processing”, “Complete”, “Failed”. Color is supplemental only. Do not show “Complete” until the operation is actually complete.
- **File row:** filename, source and time as metadata; actions are explicit. Avoid wrapping every row in a rounded card.
- **Search:** labeled input, clear button, no simulated results presented as real library content.
- **Empty state:** explain what belongs here and give a relevant next action. Do not show fabricated example documents as user data.
- **Borders:** use `--color-line`; reserve green for active selection or progress.
- **Responsive behavior:** content remains readable and operable at 320px; touch targets should be comfortably sized; no horizontal overflow.
- **Motion:** functional transitions only, max 140ms by default, and disabled under `prefers-reduced-motion`.

All styles must avoid `box-shadow`, `filter: drop-shadow`, and shadow utility classes. This includes focus and hover styling.
