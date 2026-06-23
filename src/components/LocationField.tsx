import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnchoredPopover } from "./AnchoredPopover";

/**
 * A place, captured with as much granularity as is known — from a bare country
 * down to a street address. `label` is always the human display string (and the
 * only field older free-text place columns persist); the structured parts +
 * optional coordinates ride along when a picker/geocoder supplied them.
 */
export interface LocationValue {
  label: string;
  country?: string | null;
  region?: string | null;
  locality?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  /** Stable external reference (e.g. an OSM id) when one is known. */
  placeId?: string | null;
}

/** A location suggestion offered by the picker — a {@link LocationValue} with a key. */
export interface LocationSuggestion extends LocationValue {
  /** Stable id for React keys + selection (often the `placeId`). */
  id: string;
}

export interface LocationFieldProps {
  /** Currently chosen location, or `null`. */
  value: LocationValue | null;
  /** Called with the next location, or `null` when cleared. */
  onChange: (value: LocationValue | null) => void;
  /** Field label rendered above the control. */
  label?: ReactNode;
  /** Helper text shown beneath the control when there is no error. */
  hint?: ReactNode;
  /** Error message — sets invalid styling and replaces the hint. */
  error?: ReactNode;
  /** Marks the field required and shows a danger asterisk on the label. */
  required?: boolean;
  /** Input placeholder shown when nothing is selected. @default "Search for a place…" */
  placeholder?: string;
  /** Disable the control. */
  disabled?: boolean;
  /**
   * Async suggestion source (a geocoder). Called with the typed query (debounced);
   * returns ranked suggestions. When omitted, only `suggestions` is filtered locally.
   */
  onSearch?: (query: string) => Promise<LocationSuggestion[]>;
  /**
   * Static suggestions (e.g. places already used in the archive). Shown when the
   * query is empty, and filtered locally when there is no `onSearch`.
   */
  suggestions?: LocationSuggestion[];
  /** Accessible name for the input when there is no visible `label`. */
  "aria-label"?: string;
}

/** Compose a one-line display string from a location's parts (falls back to `label`). */
export function formatLocation(value: LocationValue | null | undefined): string {
  if (!value) return "";
  const parts = [value.address, value.locality, value.region, value.country]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : value.label.trim();
}

/** The structured parts as a secondary line, when they add detail beyond the label. */
function partsLine(value: LocationValue): string {
  const composed = formatLocation(value);
  return composed && composed !== value.label.trim() ? composed : "";
}

/**
 * LocationField — a searchable place picker spanning country → address.
 *
 * Type to search a geocoder (`onSearch`) and/or places already in the archive
 * (`suggestions`); pick a result to capture its structured parts + coordinates,
 * or commit whatever you typed as a free-text place. Controlled like `Combobox`:
 * pass `value` and update it in `onChange` (`null` clears). Degrades gracefully —
 * with no `onSearch` it simply filters `suggestions` locally, so it works with no
 * geocoder at all. Shares the label/hint/error contract with `Input`/`Combobox`.
 *
 * @example
 * <LocationField
 *   label="Place"
 *   value={place}
 *   onChange={setPlace}
 *   onSearch={(q) => fetch(`/api/geocode?q=${q}`).then((r) => r.json()).then((d) => d.suggestions)}
 *   suggestions={archivePlaces}
 * />
 */
export function LocationField({
  value,
  onChange,
  label,
  hint,
  error,
  required,
  placeholder = "Search for a place…",
  disabled,
  onSearch,
  suggestions = [],
  "aria-label": ariaLabel,
}: LocationFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  const autoId = useId();
  const inputId = `${autoId}-input`;
  const listId = `${autoId}-list`;
  const hintId = `${autoId}-hint`;
  const errorId = `${autoId}-error`;
  const invalid = Boolean(error);

  // Debounced geocoder search, guarded against out-of-order responses.
  useEffect(() => {
    if (!onSearch) return;
    const q = query.trim();
    if (!q) {
      setRemote([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const results = await onSearch(q);
        if (!cancelled) setRemote(results);
      } catch {
        if (!cancelled) setRemote([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, onSearch]);

  // Local suggestions filtered by the query (the only source when no onSearch).
  const localFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter((s) =>
      `${s.label} ${formatLocation(s)}`.toLowerCase().includes(q),
    );
  }, [suggestions, query]);

  // Merge geocoder + local results, de-duplicating by id then by display string.
  const options = useMemo(() => {
    const merged = [...remote, ...localFiltered];
    const seen = new Set<string>();
    const out: LocationSuggestion[] = [];
    for (const s of merged) {
      const key = `${s.id}|${formatLocation(s).toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
    return out;
  }, [remote, localFiltered]);

  // A "use what I typed" row, when the query isn't already an exact option label.
  const trimmed = query.trim();
  const freeText =
    trimmed && !options.some((o) => o.label.trim().toLowerCase() === trimmed.toLowerCase())
      ? trimmed
      : "";
  const rowCount = options.length + (freeText ? 1 : 0);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, rowCount - 1)));
  }, [rowCount]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !popRef.current?.contains(t)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function openPanel() {
    if (disabled) return;
    setActive(0);
    setOpen(true);
  }
  function close() {
    setOpen(false);
    setQuery("");
  }
  function commit(next: LocationValue | null) {
    onChange(next);
    close();
  }
  function commitFreeText(text: string) {
    const t = text.trim();
    if (t) commit({ label: t });
  }
  /** The row at index `i` of the rendered list (suggestions, then the free-text row). */
  function selectRow(i: number) {
    const opt = options[i];
    if (opt) commit(stripId(opt));
    else if (freeText) commitFreeText(freeText);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) return openPanel();
      setActive((a) => Math.min(a + 1, rowCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (open && rowCount > 0) {
        e.preventDefault();
        selectRow(active);
      } else if (trimmed) {
        e.preventDefault();
        commitFreeText(trimmed);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        close();
      }
    }
  }

  const controlClasses = ["fa-combobox__control", invalid && "fa-combobox__control--invalid"]
    .filter(Boolean)
    .join(" ");

  const displayValue = open ? query : value ? value.label : "";

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
        <div className={controlClasses}>
          <span className="fa-combobox__leading" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 14s4.5-4 4.5-7.5a4.5 4.5 0 10-9 0C3.5 10 8 14 8 14z" />
              <circle cx="8" cy="6.5" r="1.6" />
            </svg>
          </span>
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
            aria-describedby={invalid ? errorId : hint ? hintId : undefined}
            disabled={disabled}
            placeholder={value && !open ? undefined : placeholder}
            value={displayValue}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={openPanel}
            onClick={openPanel}
            onKeyDown={onKeyDown}
            onBlur={() => {
              // Commit a typed-but-unpicked place so it isn't silently lost.
              if (open && trimmed && !value) commitFreeText(trimmed);
            }}
          />
          {value != null && !disabled ? (
            <button
              type="button"
              className="fa-combobox__clear"
              aria-label="Clear location"
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
            <svg className="fa-combobox__caret" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        <AnchoredPopover anchorRef={rootRef} open={open} className="fa-combobox__pop" popRef={popRef}>
          <ul className="fa-combobox__list" id={listId} role="listbox">
            {options.map((opt, i) => {
              const on = i === active;
              const secondary = partsLine(opt);
              return (
                <li key={opt.id} id={`${listId}-${i}`} role="option" aria-selected={on}>
                  <button
                    type="button"
                    className={"fa-combobox__option" + (on ? " fa-combobox__option--active" : "")}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => selectRow(i)}
                  >
                    <span className="fa-combobox__text">
                      <span className="fa-combobox__label">{opt.label}</span>
                      {secondary && <span className="fa-combobox__desc">{secondary}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
            {freeText && (
              <li id={`${listId}-${options.length}`} role="option" aria-selected={active === options.length}>
                <button
                  type="button"
                  className={
                    "fa-combobox__option" +
                    (active === options.length ? " fa-combobox__option--active" : "")
                  }
                  onMouseEnter={() => setActive(options.length)}
                  onClick={() => commitFreeText(freeText)}
                >
                  <span className="fa-combobox__text">
                    <span className="fa-combobox__label">Use “{freeText}”</span>
                    <span className="fa-combobox__desc">Save as typed</span>
                  </span>
                </button>
              </li>
            )}
            {rowCount === 0 && (
              <li className="fa-combobox__empty" role="presentation">
                {loading ? "Searching…" : trimmed ? "No matches — keep typing" : "Type to search for a place"}
              </li>
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

/** Drop the suggestion's list `id`, keeping just the {@link LocationValue} fields. */
function stripId(s: LocationSuggestion): LocationValue {
  const { id: _id, ...rest } = s;
  return rest;
}
