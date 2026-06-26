import type { HTMLAttributes, ReactNode } from "react";
import { Icon } from "./Icon";

export interface StepperStep {
  /** Stable identifier for the step. */
  key: string;
  /** Short label shown beside the number (expands for active/done steps). */
  label: ReactNode;
}

export interface StepperProps
  extends Omit<HTMLAttributes<HTMLElement>, "onSelect"> {
  /** The ordered steps. */
  steps: StepperStep[];
  /** Index of the active step. */
  current: number;
  /**
   * Highest index the user has reached — every step up to it is navigable.
   * Defaults to `current`, so only completed and current steps are reachable.
   */
  furthest?: number;
  /** Called with a step index when a reachable step is clicked. */
  onSelect?: (index: number) => void;
}

/**
 * Stepper — a compact, horizontal progress nav for a multi-step flow (an upload
 * wizard, a guided form).
 *
 * Each step is numbered until completed, then shows a check. The active step
 * carries the sienna fill; completed steps stay navigable (tinted), and any step
 * past `furthest` is disabled. Labels collapse for upcoming steps so a long flow
 * stays narrow and scrolls horizontally. Rendered as a `<nav>` of real buttons —
 * keyboard-focusable, with `aria-current="step"` on the active one.
 *
 * @example
 * <Stepper
 *   steps={[{ key: "doc", label: "Document" }, { key: "people", label: "People" }, { key: "review", label: "Review" }]}
 *   current={1}
 *   furthest={1}
 *   onSelect={setStep}
 * />
 */
export function Stepper({
  steps,
  current,
  furthest,
  onSelect,
  className,
  ...rest
}: StepperProps) {
  const maxReachable = furthest ?? current;
  const classes = ["fa-stepper", className].filter(Boolean).join(" ");

  return (
    <nav className={classes} aria-label="Progress" {...rest}>
      <ol className="fa-stepper__list">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const reachable = i <= maxReachable;
          const stepClasses = [
            "fa-step",
            active && "fa-step--active",
            done && "fa-step--done",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <li key={step.key} className="fa-step__item">
              {i > 0 && (
                <span
                  className={["fa-step__line", i <= current && "fa-step__line--done"]
                    .filter(Boolean)
                    .join(" ")}
                  aria-hidden="true"
                />
              )}
              <button
                type="button"
                className={stepClasses}
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
                onClick={() => reachable && onSelect?.(i)}
              >
                <span className="fa-step__dot" aria-hidden="true">
                  {done ? <Icon name="check" size={12} /> : i + 1}
                </span>
                <span className="fa-step__label">
                  <span className="fa-step__label-text">{step.label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
