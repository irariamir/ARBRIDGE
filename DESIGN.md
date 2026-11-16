# ARBRIDGE design language

## Reference review

The requested `Ghost87/berandboek` repository contains a single commit and brand-package ZIP files. The published brand-package README identifies the ARIAMIR green/charcoal logo system and explicitly points to Supabase as its UI reference. The package archive was inspected: it identifies `#3ECF8E` as the bright green and `#006239` as a deep brand green, with near-black/charcoal and warm-white surfaces. The reference site uses a service-led, technical editorial tone. We adapt those observed cues; we do not copy the ARIAMIR logo into ARBRIDGE or claim undocumented font/spacing rules from the archive.

## BridgeMind/ARBRIDGE translation

- **Personality:** precise, calm, capable, independent. Make file movement legible; do not dress it up as magic.
- **Palette:** charcoal ink, off-white paper, ARIAMIR green for action and progress. Green is an accent, not a background wash.
- **Typography:** native system sans for readable English UI; monospace only for URLs, status identifiers, and technical labels. No remote font dependency.
- **Layout:** editorial asymmetry on the public site; compact, utilitarian hierarchy in the extension. Use clear column alignment and generous page margins, then let the actual transfer flow carry the visual interest.
- **Components:** mostly square edges, hairline borders, clear state labels, strong focus outlines, concise controls. Reserve rounded geometry for compact badges and controls where function benefits.
- **Motion:** short opacity/position transitions; honor reduced-motion preferences. Avoid ornamental movement.
- **Depth:** whitespace, typographic scale, color and borders only. **No shadows, including hover and focus states.**

## Accessibility

Semantic landmarks and headings, keyboard-visible focus, text labels for status, sufficient contrast, reduced-motion support, and a responsive narrow-screen layout are required. Status must never be conveyed by color alone.

See `design-tokens.css`, `design-tokens.json`, `BRAND_GUIDELINES.md`, and `COMPONENTS.md`.
