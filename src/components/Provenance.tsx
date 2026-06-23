import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Tooltip } from "./Tooltip";
import { Menu } from "./Menu";
import { Dialog } from "./Dialog";
import { Button } from "./Button";

export type ProvenanceStatus =
  | "verified"
  | "unverified"
  | "estimated"
  | "disputed";

/** Document types, matching the --doc-* token family. */
export type DocType = "photo" | "certificate" | "article" | "obituary" | "other";

export interface SourceOption {
  id: string;
  label: string;
  type?: DocType;
  /** Year on the document — shown as a meta line and searched against. */
  year?: number;
}

interface StatusConfig {
  icon: ReactNode;
  label: string;
  /** Short read-only hint shown in the tooltip when no source is cited. */
  hint: string;
}

// Each glyph is drawn to optically centre on (8,8) and fill the same ~11-unit
// footprint as the ring, so the four states swap in place without bobbing.
const ICON = {
  // confirmed by a source
  check: (
    <path d="M3.25 8.25l3.25 3.25 6.5-7" />
  ),
  // recorded, no source yet
  ring: <circle cx="8" cy="8" r="5.5" />,
  // approximate
  wave: <path d="M2 8c1.1-2 3-2 4 0s2.9 2 4 0 3-2 4 0" />,
  // sources disagree
  alert: <path d="M8 3l5.5 10h-11zM8 6.9v3.1M8 11.8v.1" />,
} as const;

const PROV: Record<ProvenanceStatus, StatusConfig> = {
  verified: {
    icon: ICON.check,
    label: "Verified",
    hint: "Confirmed by an attached source",
  },
  unverified: {
    icon: ICON.ring,
    label: "Unverified",
    hint: "Recorded — no source on file yet",
  },
  estimated: {
    icon: ICON.wave,
    label: "Estimated",
    hint: "Approximate — no exact record",
  },
  disputed: {
    icon: ICON.alert,
    label: "Disputed",
    hint: "Sources disagree",
  },
};

const ORDER: ProvenanceStatus[] = [
  "verified",
  "unverified",
  "estimated",
  "disputed",
];

function ProvIcon({ status, size }: { status: ProvenanceStatus; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PROV[status].icon}
    </svg>
  );
}

export interface ProvenanceMarkProps {
  /** Confidence of the recorded fact. @default "unverified" */
  status?: ProvenanceStatus;
  /**
   * The citation appended to the read-only tooltip and accessible name (e.g.
   * "birth certificate"); when omitted the state's hint is shown instead.
   * Ignored when editable.
   */
  source?: string;
  /**
   * Presence makes the mark editable: clicking opens a confidence picker, and
   * choosing "Verified" opens the {@link SourceCiteDialog} to cite a document.
   * Called with the chosen status and, for verified, the linked source's label
   * and id (`id` is `"__new"` when the user chose to upload a new document, or
   * `undefined` for a non-verified status).
   */
  onChange?: (status: ProvenanceStatus, source?: string, sourceId?: string) => void;
  /** Candidate documents offered by the "Link a source" dialog. */
  sources?: SourceOption[];
  /** Icon size in px. @default 16 */
  size?: number;
  className?: string;
}

/**
 * ProvenanceMark — the confidence mark beside a recorded fact.
 *
 * The product's signature idea: every fact carries its provenance. Four states
 * (`verified` / `unverified` / `estimated` / `disputed`), each a colour + icon +
 * label so meaning never rides on colour alone. Read-only by default (a Tooltip
 * explains the state and its source); pass `onChange` to make it editable — a
 * Menu picks the confidence and "Verified" opens the source-citation dialog.
 *
 * @example
 * // read-only, beside a date
 * <ProvenanceMark status="verified" source="birth certificate" />
 *
 * @example
 * // editable, in the add-person form
 * <ProvenanceMark status={st} sources={docs} onChange={(s, src) => save(s, src)} />
 */
export function ProvenanceMark({
  status = "unverified",
  source,
  onChange,
  sources = [],
  size = 16,
  className,
}: ProvenanceMarkProps) {
  const [dialog, setDialog] = useState(false);
  const cfg = PROV[status];
  const classes = [
    "fa-prov",
    `fa-prov--${status}`,
    onChange && "fa-prov--editable",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const trigger = (
    <button
      type="button"
      className={classes}
      aria-label={`${cfg.label}${source ? ` · ${source}` : ""}`}
      style={{ ["--prov-size" as string]: `${size}px` }}
    >
      <ProvIcon status={status} size={size} />
    </button>
  );

  // Read-only: a tooltip explains the state (and its source, when verified).
  if (!onChange) {
    return (
      <Tooltip label={`${cfg.label} · ${source || cfg.hint}`}>{trigger}</Tooltip>
    );
  }

  const pick = (next: ProvenanceStatus) => {
    if (next === "verified") setDialog(true);
    else onChange(next);
  };

  return (
    <>
      <Menu
        align="end"
        trigger={trigger}
        items={ORDER.map((s) => ({
          danger: s === "disputed",
          onSelect: () => pick(s),
          icon: (
            <span className={`fa-prov fa-prov--${s}`} aria-hidden="true">
              <ProvIcon status={s} size={14} />
            </span>
          ),
          label: (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {PROV[s].label}
              {s === "verified" ? "…" : ""}
              {s === status && <span aria-hidden="true"> ✓</span>}
            </span>
          ),
        }))}
      />
      <SourceCiteDialog
        open={dialog}
        sources={sources}
        onClose={() => setDialog(false)}
        onConfirm={(src, id) => {
          setDialog(false);
          onChange("verified", src, id);
        }}
      />
    </>
  );
}

/** Human label per document type — shared with the inline source pickers. */
export const DOC_TYPE_LABEL: Record<DocType, string> = {
  photo: "Photo",
  certificate: "Certificate",
  article: "Article",
  obituary: "Obituary",
  other: "Document",
};

/** "Certificate · 1931" — the secondary line beneath a source's title. */
export function sourceMeta(o: SourceOption): string {
  return [o.type ? DOC_TYPE_LABEL[o.type] : null, o.year ? String(o.year) : null]
    .filter(Boolean)
    .join(" · ");
}

/** Above this many documents the cite dialog grows a search field. */
const SEARCH_THRESHOLD = 8;

export interface SourceCiteDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * Called once the user confirms, with the chosen source's label and id. `id` is
   * `"__new"` when they chose to upload a new document. (The id is optional so
   * existing label-only callers keep working.)
   */
  onConfirm: (source: string, id?: string) => void;
  /** Documents already in the archive that can prove the fact. */
  sources?: SourceOption[];
}

/**
 * SourceCiteDialog — the "Link a source" step behind marking a fact verified.
 *
 * Records are sacred: a verified fact must cite the document that proves it.
 * Lists existing archive documents as a single-select radio group (plus an
 * "upload a new document" affordance), and confirms with the chosen citation.
 *
 * @example
 * <SourceCiteDialog open={open} sources={docs}
 *   onClose={close} onConfirm={(src) => markVerified(src)} />
 */
export function SourceCiteDialog({
  open,
  onClose,
  onConfirm,
  sources = [],
}: SourceCiteDialogProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const rowsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSelected(null);
      setQuery("");
    }
  }, [open]);

  const showSearch = sources.length >= SEARCH_THRESHOLD;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sources;
    return sources.filter((s) =>
      `${s.label} ${s.type ? DOC_TYPE_LABEL[s.type] : ""} ${s.year ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [sources, query]);

  const labelOf = (id: string) =>
    id === "__new"
      ? "a new document"
      : sources.find((s) => s.id === id)?.label ?? "a source";

  const cite = (id: string) => onConfirm(labelOf(id), id);

  // Roving focus across the rendered rows (documents + the upload affordance),
  // mirroring the Combobox's keyboard model so the two source pickers match.
  const rowEls = () =>
    Array.from(rowsRef.current?.querySelectorAll<HTMLButtonElement>("[data-srow]") ?? []);
  const focusRowAt = (idx: number) => {
    const rows = rowEls();
    if (!rows.length) return;
    rows[Math.max(0, Math.min(rows.length - 1, idx))]?.focus();
  };
  const onRowsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const rows = rowEls();
    const cur = rows.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") focusRowAt(cur + 1);
    else if (cur <= 0) searchRef.current?.focus();
    else focusRowAt(cur - 1);
  };
  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusRowAt(0);
    } else if (e.key === "Enter" && filtered.length === 1 && filtered[0]) {
      // Fast path: when the query narrows to a single document, cite it.
      e.preventDefault();
      cite(filtered[0].id);
    }
  };

  const empty = sources.length === 0;
  const noMatch = !empty && filtered.length === 0;
  // The first focusable row when nothing is selected yet (so Tab lands on it).
  const firstId = filtered[0]?.id ?? "__new";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Link a source"
      description="Verified facts cite a document. Choose what proves this."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!selected}
            onClick={() => selected && cite(selected)}
          >
            Mark verified
          </Button>
        </>
      }
    >
      <div className="fa-sourcecite">
        {showSearch && (
          <div className="fa-sourcecite__search">
            <svg
              className="fa-sourcecite__searchicon"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" />
            </svg>
            <input
              ref={searchRef}
              type="search"
              className="fa-sourcecite__searchinput"
              placeholder="Search by title, type, or year…"
              aria-label="Search documents"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              autoFocus
            />
            <span className="fa-sourcecite__count" aria-live="polite">
              {query.trim()
                ? `${filtered.length} of ${sources.length}`
                : `${sources.length} documents`}
            </span>
          </div>
        )}

        <div
          className="fa-sourcecite__rows"
          role="radiogroup"
          aria-label="Documents"
          ref={rowsRef}
          onKeyDown={onRowsKeyDown}
        >
          <div className="fa-sourcecite__scroll">
            {empty ? (
              <div className="fa-sourcecite__placeholder">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 3h7l5 5v13H6z" />
                  <path d="M13 3v5h5M9 13h6M9 17h4" />
                </svg>
                <p className="fa-sourcecite__placeholder-title">
                  No documents in the archive yet
                </p>
                <p className="fa-sourcecite__placeholder-hint">
                  Upload the record that proves this fact to cite it as a source.
                </p>
              </div>
            ) : noMatch ? (
              <div className="fa-sourcecite__placeholder">
                <p className="fa-sourcecite__placeholder-title">
                  No documents match “{query.trim()}”
                </p>
                <p className="fa-sourcecite__placeholder-hint">
                  Try a different title, type, or year.
                </p>
              </div>
            ) : (
              filtered.map((o) => {
                const on = selected === o.id;
                const meta = sourceMeta(o);
                return (
                  <button
                    key={o.id}
                    data-srow
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on || (!selected && o.id === firstId) ? 0 : -1}
                    className={["fa-sourcecite__row", on && "is-selected"]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelected(o.id)}
                  >
                    <span
                      className="fa-sourcecite__dot"
                      style={{ background: `var(--doc-${o.type ?? "other"})` }}
                      aria-hidden="true"
                    />
                    <span className="fa-sourcecite__text">
                      <span className="fa-sourcecite__label">{o.label}</span>
                      {meta && <span className="fa-sourcecite__meta">{meta}</span>}
                    </span>
                    {on && <CheckMark />}
                  </button>
                );
              })
            )}
          </div>

          <button
            data-srow
            type="button"
            role="radio"
            aria-checked={selected === "__new"}
            tabIndex={
              selected === "__new" || (!selected && firstId === "__new") ? 0 : -1
            }
            className={[
              "fa-sourcecite__row",
              "fa-sourcecite__row--new",
              selected === "__new" && "is-selected",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setSelected("__new")}
          >
            <span className="fa-sourcecite__dot fa-sourcecite__dot--upload" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 10.5V3M5 6l3-3 3 3M3.5 13h9" />
              </svg>
            </span>
            <span className="fa-sourcecite__text">
              <span className="fa-sourcecite__label">Upload a new document…</span>
              <span className="fa-sourcecite__meta">Add a record to the archive and cite it</span>
            </span>
            {selected === "__new" && <CheckMark />}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function CheckMark() {
  return (
    <span className="fa-sourcecite__check" aria-hidden="true">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {/* Same centred geometry as the verified provenance check (ICON.check). */}
        <path d="M3.25 8.25l3.25 3.25 6.5-7" />
      </svg>
    </span>
  );
}
