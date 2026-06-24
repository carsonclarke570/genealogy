import type { CSSProperties, ReactNode } from "react";
import { Card } from "./Card";

/**
 * Add this class to a control inside a ClickableCard to raise it above the
 * stretched overlay so it stays independently clickable (e.g. an avatar that
 * opens a different target than the card itself).
 */
export const CARD_RAISE_CLASS = "fa-card-raise";

export interface ClickableCardProps {
  /** Fired when the card surface is activated (click / keyboard). */
  onOpen: () => void;
  /** Accessible name for the whole-card action. */
  ariaLabel: string;
  children: ReactNode;
  style?: CSSProperties;
}

/**
 * ClickableCard — a Card whose entire surface is one keyboard-operable control.
 *
 * Uses the "stretched link" pattern: a transparent button covers the card so
 * the primary action is reachable by pointer, keyboard, and screen reader
 * without nesting interactive elements. Secondary controls in `children` opt
 * back above the overlay with the {@link CARD_RAISE_CLASS} class and stay
 * independently clickable. A subtle inner ring signals the affordance on hover.
 */
export function ClickableCard({ onOpen, ariaLabel, children, style }: ClickableCardProps) {
  return (
    <Card style={{ position: "relative", padding: 0, overflow: "hidden", ...style }}>
      {children}
      <button type="button" className="fa-card-open" aria-label={ariaLabel} onClick={onOpen} />
    </Card>
  );
}
