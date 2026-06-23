import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnchoredPopover } from "./AnchoredPopover";

export interface ComboboxOption {
  /** Stable identifier — the value passed to `onChange`. */
  value: string;
  /** Primary label. */
  label: ReactNode;
  /** Optional secondary line under the label (dates, place, role…). */
  description?: ReactNode;
  /** Optional leading visual (an Avatar, a dot…). */
  leading?: ReactNode;
  /** Extra text the typed query matches against, when `label`/`description`
   *  aren't plain strings (or to add aliases). */
  keywords?: string;
}

export interface ComboboxProps {
  /** The options to search and choose from. */
  options: ComboboxOption[];
  /** Currently selected value (controlled), or `null` when nothing is chosen. */
  value: string | null;
  /** Called with the next value when an option is picked, or `null` when cleared. */
  onChange: (value: string | null) => void;
  /** Field label rendered above the control. */
  label?: ReactNode;
  /** Helper text shown beneath the control when there is no error. */
  hint?: ReactNode;
  /** Error message. Sets the invalid styling, `aria-invalid`, and replaces the hint. */
  error?: ReactNode;
  /** Marks the field required and shows a danger asterisk on the label. */
  required?: boolean;
  /** Input placeholder shown when nothing is selected. @default "Search…" */
  placeholder?: string;
  /** Message shown when the query matches no options. @default "No matches" */
  emptyMessage?: ReactNode;
  /** Disable the control. */
  disabled?: boolean;
  /** When set, a hidden input of this `name` carries the value for native form submit. */
  name?: string;
  /** Accessible name for the input when there is no visible `label`. */
  "aria-label"?: string;
  /** Force the panel open (for previews / controlled use). */
  open?: boolean;
  /** Popover panel width in px; defaults to matching the control. */
  panelWidth?: number;
}

/** Flatten a node to lowercase searchable text (strings only; ignores elements). */
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  return "";
}

/**
 * Combobox — a searchable single-select. Type to filter, arrow keys to move,
 * Enter to pick.
 *
 * Unlike `Select` (native, whole list) and `MultiSelect` (popover, many values),
 * this is the control for choosing ONE item out of a long, searchable list —
 * picking a person to relate, a place, a source. Filters on each option's
 * `label`/`description` text plus any `keywords`. Controlled: pass `value` and
 * update it in `onChange` (`null` clears). Closes on select, outside-click, or
 * Escape. Shares the label/hint/error contract with `Input` and `Select`.
 *
 * @example
 * <Combobox
 *   label="Relative"
 *   placeholder="Search people…"
 *   value={personId}
 *   onChange={setPersonId}
 *   options={people.map((p) => ({
 *     value: p.id,
 *     label: p.name,
 *     description: p.lifeDates,
 *     leading: <Avatar name={p.name} size="sm" />,
 *   }))}
 * />
 */
export function Combobox({
  options,
  value,
  onChange,
  label,
  hint,
  error,
  required,
  placeholder = "Search…",
  emptyMessage = "No matches",
  disabled,
  name,
  panelWidth,
  open: openProp,
  "aria-label": ariaLabel,
}: ComboboxProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const controlled = openProp !== undefined;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  const autoId = useId();
  const inputId = `${autoId}-input`;
  const listId = `${autoId}-list`;
  const hintId = `${autoId}-hint`;
  const errorId = `${autoId}-error`;
  const invalid = Boolean(error);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay = `${textOf(o.label)} ${textOf(o.description)} ${o.keywords ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  // Keep the active option in range as the filtered list changes.
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  useEffect(() => {
    if (!open || controlled) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      // The panel is portaled out of rootRef, so treat it as "inside" too.
      if (!rootRef.current?.contains(t) && !popRef.current?.contains(t)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, controlled]);

  function openPanel() {
    if (disabled) return;
    setActive(0);
    setInternalOpen(true);
  }
  function close() {
    setInternalOpen(false);
    setQuery("");
  }
  function pick(opt: ComboboxOption) {
    onChange(opt.value);
    close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) return openPanel();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[active]) {
        e.preventDefault();
        pick(filtered[active]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        close();
      }
    }
  }

  const classes = ["fa-combobox__control", invalid && "fa-combobox__control--invalid"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="fa-field">
      {label && (
        <label className="fa-field__label" htmlFor={inputId}>
          {label}
          {required && (
            <span className="fa-field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="fa-combobox" ref={rootRef}>
        {name && <input type="hidden" name={name} value={value ?? ""} />}
        <div className={classes}>
          {selected?.leading && !open && (
            <span className="fa-combobox__leading" aria-hidden="true">
              {selected.leading}
            </span>
          )}
          <input
            ref={inputRef}
            id={inputId}
            className="fa-combobox__input"
            role="combobox"
            type="text"
            autoComplete="off"
            aria-label={!label ? ariaLabel : undefined}
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-invalid={invalid || undefined}
            aria-required={required || undefined}
            aria-activedescendant={
              open && filtered[active] ? `${listId}-${filtered[active].value}` : undefined
            }
            aria-describedby={invalid ? errorId : hint ? hintId : undefined}
            disabled={disabled}
            placeholder={selected && !open ? undefined : placeholder}
            value={open ? query : selected ? textOf(selected.label) : ""}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setInternalOpen(true);
            }}
            onFocus={openPanel}
            onClick={openPanel}
            onKeyDown={onKeyDown}
          />
          {value != null && !disabled ? (
            <button
              type="button"
              className="fa-combobox__clear"
              aria-label="Clear selection"
              onClick={() => {
                onChange(null);
                close();
                inputRef.current?.focus();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          ) : (
            <svg
              className="fa-combobox__caret"
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        <AnchoredPopover
          anchorRef={rootRef}
          open={open}
          width={panelWidth}
          className="fa-combobox__pop"
          popRef={popRef}
        >
            <ul className="fa-combobox__list" id={listId} role="listbox">
              {filtered.length === 0 ? (
                <li className="fa-combobox__empty" role="presentation">
                  {emptyMessage}
                </li>
              ) : (
                filtered.map((opt, i) => {
                  const on = opt.value === value;
                  const isActive = i === active;
                  return (
                    <li
                      key={opt.value}
                      id={`${listId}-${opt.value}`}
                      role="option"
                      aria-selected={on}
                    >
                      <button
                        type="button"
                        className={
                          "fa-combobox__option" +
                          (isActive ? " fa-combobox__option--active" : "") +
                          (on ? " fa-combobox__option--on" : "")
                        }
                        onMouseEnter={() => setActive(i)}
                        onClick={() => pick(opt)}
                      >
                        {opt.leading && (
                          <span className="fa-combobox__leading">{opt.leading}</span>
                        )}
                        <span className="fa-combobox__text">
                          <span className="fa-combobox__label">{opt.label}</span>
                          {opt.description && (
                            <span className="fa-combobox__desc">{opt.description}</span>
                          )}
                        </span>
                        {on && (
                          <span className="fa-combobox__check" aria-hidden="true">
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                              <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
        </AnchoredPopover>
      </div>

      {invalid ? (
        <span id={errorId} className="fa-field__error" role="alert">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 4.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="11" r="0.9" fill="currentColor" />
          </svg>
          {error}
        </span>
      ) : (
        hint && (
          <span id={hintId} className="fa-field__hint">
            {hint}
          </span>
        )
      )}
    </div>
  );
}
