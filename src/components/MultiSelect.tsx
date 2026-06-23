import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnchoredPopover } from "./AnchoredPopover";

export interface MultiSelectOption {
  /** Stable identifier. */
  value: string;
  /** Primary label. */
  label: ReactNode;
  /** Optional secondary line under the label (dates, role…). */
  description?: ReactNode;
  /** Optional leading visual (an Avatar, a dot…). */
  leading?: ReactNode;
}

export interface MultiSelectProps {
  /** The options to choose from. */
  options: MultiSelectOption[];
  /** Currently selected values (controlled). */
  selected: string[];
  /** Called with the next selection when an option is toggled. */
  onChange: (next: string[]) => void;
  /** Heading inside the popover. */
  label?: ReactNode;
  /** Trigger text when nothing is selected. @default "Any" */
  placeholder?: string;
  /** Leading icon on the trigger button. */
  icon?: ReactNode;
  /** Build the trigger summary from the number selected. @default `${n} selected` */
  summary?: (count: number) => string;
  /** Popover panel width in px. @default 268 */
  panelWidth?: number;
  /** Force the panel open (for previews / controlled use). */
  open?: boolean;
}

/**
 * MultiSelect — a popover combobox for picking several options at once.
 *
 * The panel stays open while you tick names (each click toggles, none dismiss),
 * with a "Clear" affordance once anything is chosen — the shape behind a
 * "filter by person / tag / place" control. Closes on outside-click or Escape.
 * Controlled: pass `selected` and update it in `onChange`. For a single choice
 * use `Select`; for a short static set in a form use `Checkbox`es.
 *
 * @example
 * <MultiSelect
 *   label="Filter by person"
 *   placeholder="Everyone"
 *   selected={people}
 *   onChange={setPeople}
 *   options={relatives.map((p) => ({
 *     value: p.id,
 *     label: p.name,
 *     description: p.lifeDates,
 *     leading: <Avatar name={p.name} size="sm" />,
 *   }))}
 * />
 */
export function MultiSelect({
  options,
  selected,
  onChange,
  label,
  placeholder = "Any",
  icon,
  summary,
  panelWidth = 268,
  open,
}: MultiSelectProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const uncontrolled = open === undefined;
  const ref = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  useEffect(() => {
    if (!isOpen || !uncontrolled) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      // The panel is portaled out of `ref`, so treat it as "inside" too.
      if (!ref.current?.contains(t) && !popRef.current?.contains(t)) setInternalOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInternalOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, uncontrolled]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : selected.concat(value),
    );
  };

  const count = selected.length;
  const triggerLabel =
    count === 0 ? placeholder : summary ? summary(count) : `${count} selected`;

  return (
    <div ref={ref} className="fa-multiselect">
      <button
        type="button"
        className="fa-multiselect__trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => uncontrolled && setInternalOpen((o) => !o)}
      >
        {icon && <span className="fa-multiselect__trigger-icon">{icon}</span>}
        <span className="fa-multiselect__trigger-label">
          {label && <span className="fa-multiselect__trigger-prefix">{label}: </span>}
          <strong>{triggerLabel}</strong>
        </span>
        <svg
          className="fa-multiselect__caret"
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnchoredPopover
        anchorRef={ref}
        open={isOpen}
        width={panelWidth}
        className="fa-multiselect__pop"
        popRef={popRef}
      >
          <div className="fa-multiselect__head">
            <span className="fa-multiselect__heading">{label ?? "Filter"}</span>
            {count > 0 && (
              <button type="button" className="fa-multiselect__clear" onClick={() => onChange([])}>
                Clear
              </button>
            )}
          </div>
          <ul
            className="fa-multiselect__list"
            id={listId}
            role="listbox"
            aria-multiselectable="true"
          >
            {options.map((opt) => {
              const on = selected.includes(opt.value);
              return (
                <li key={opt.value} role="option" aria-selected={on}>
                  <button
                    type="button"
                    className={`fa-multiselect__option${on ? " fa-multiselect__option--on" : ""}`}
                    onClick={() => toggle(opt.value)}
                  >
                    {opt.leading && <span className="fa-multiselect__leading">{opt.leading}</span>}
                    <span className="fa-multiselect__text">
                      <span className="fa-multiselect__label">{opt.label}</span>
                      {opt.description && (
                        <span className="fa-multiselect__desc">{opt.description}</span>
                      )}
                    </span>
                    <span className="fa-multiselect__check" aria-hidden="true">
                      {on && (
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
      </AnchoredPopover>
    </div>
  );
}
