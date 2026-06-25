---
category: Data Display
---

ClickableCard — a Card whose entire surface is one keyboard-operable control.

Uses the "stretched link" pattern: a transparent button covers the card so
the primary action is reachable by pointer, keyboard, and screen reader
without nesting interactive elements. Secondary controls in `children` opt
back above the overlay with the {@link CARD_RAISE_CLASS} class and stay
independently clickable. A subtle inner ring signals the affordance on hover.

## Props

```ts
interface ClickableCardProps {
  /** Fired when the card surface is activated (click / keyboard). */
  onOpen: () => void;
  /** Accessible name for the whole-card action. */
  ariaLabel: string;
  children: React.ReactNode;
  style?: CSSProperties;
}
```
