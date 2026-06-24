import type { CSSProperties } from "react";
import { Icon } from "./Icon";
import { Spinner } from "./Spinner";

export interface SearchInputProps {
  /** Controlled query text. */
  value: string;
  /** Fired with the new query on each keystroke. */
  onChange: (value: string) => void;
  placeholder?: string;
  /** Swap the clear button for a spinner while a query is in flight. */
  loading?: boolean;
  "aria-label"?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * SearchInput — a self-contained search field.
 *
 * A sunken pill with a leading magnifier, a borderless input, and a trailing
 * affordance that flips between a `loading` spinner and a clear button once
 * there's text. Distinct from the plain `Input`: this is the one-line query box
 * for a search screen or filter bar, with its own glyphs baked in.
 *
 * @example
 * <SearchInput value={q} onChange={setQ} loading={busy}
 *   placeholder="Search people, documents, places…" />
 */
export function SearchInput({
  value,
  onChange,
  placeholder,
  loading = false,
  "aria-label": ariaLabel,
  className,
  style,
}: SearchInputProps) {
  const classes = ["fa-search", className].filter(Boolean).join(" ");
  return (
    <div className={classes} style={style}>
      <span className="fa-search__icon" aria-hidden="true">
        <Icon name="search" size={20} />
      </span>
      <input
        className="fa-search__input"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
      />
      {loading && <Spinner size="sm" />}
      {!loading && value && (
        <button
          type="button"
          className="fa-search__clear"
          aria-label="Clear"
          onClick={() => onChange("")}
        >
          <Icon name="close" size={18} />
        </button>
      )}
    </div>
  );
}
