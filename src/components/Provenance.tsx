import { useEffect, useState } from "react";
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
}

interface StatusConfig {
  icon: ReactNode;
  label: string;
  /** Short read-only hint shown in the tooltip when no source is cited. */
  hint: string;
}

const ICON = {
  // confirmed by a source
  check: (
    <path d="M3.5 8.5l3 3 6-7" />
  ),
  // recorded, no source yet
  ring: <circle cx="8" cy="8" r="5.5" />,
  // approximate
  wave: <path d="M2.5 9c1.1-2 3-2 4 0s2.9 2 4 0 3-2 4 0" />,
  // sources disagree
  alert: <path d="M8 2.5l5.5 10h-11zM8 6.5v3.2M8 11.7v.1" />,
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
   * The citation shown in the read-only tooltip when `status` is `verified`
   * (e.g. "birth certificate"). Ignored when editable.
   */
  source?: string;
  /**
   * Presence makes the mark editable: clicking opens a confidence picker, and
   * choosing "Verified" opens the {@link SourceCiteDialog} to cite a document.
   * Called with the chosen status and, for verified, the linked source label.
   */
  onChange?: (status: ProvenanceStatus, source?: string) => void;
  /** Candidate documents offered by the "Link a source" dialog. */
  sources?: SourceOption[];
  /** Icon size in px. @default 15 */
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
  size = 15,
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
        onConfirm={(src) => {
          setDialog(false);
          onChange("verified", src);
        }}
      />
    </>
  );
}

const DOC_LABEL: Record<DocType, string> = {
  photo: "Photo",
  certificate: "Certificate",
  article: "Article",
  obituary: "Obituary",
  other: "Document",
};

export interface SourceCiteDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the chosen source's label once the user confirms. */
  onConfirm: (source: string) => void;
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

  useEffect(() => {
    if (open) setSelected(null);
  }, [open]);

  const labelOf = (id: string) =>
    id === "__new"
      ? "a new document"
      : sources.find((s) => s.id === id)?.label ?? "a source";

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
            onClick={() => selected && onConfirm(labelOf(selected))}
          >
            Mark verified
          </Button>
        </>
      }
    >
      <div className="fa-sourcecite" role="radiogroup" aria-label="Documents">
        {sources.map((o) => {
          const on = selected === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
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
              <span className="fa-sourcecite__label">{o.label}</span>
              {o.type && (
                <span className="fa-sourcecite__type">{DOC_LABEL[o.type]}</span>
              )}
              {on && <CheckMark />}
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={selected === "__new"}
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
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 10.5V3M5 6l3-3 3 3M3.5 13h9" />
            </svg>
          </span>
          <span className="fa-sourcecite__label">Upload a new document…</span>
          {selected === "__new" && <CheckMark />}
        </button>
      </div>
    </Dialog>
  );
}

function CheckMark() {
  return (
    <span className="fa-sourcecite__check" aria-hidden="true">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 8.5l3 3 6-7" />
      </svg>
    </span>
  );
}
