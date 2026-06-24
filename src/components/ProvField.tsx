import type { ReactNode } from "react";
import { Input } from "./Input";
import { LocationField, formatLocation } from "./LocationField";
import type { LocationValue, LocationSuggestion } from "./LocationField";
import { ProvenanceMark } from "./Provenance";
import type { ProvenanceStatus, SourceOption } from "./Provenance";

export interface ProvLabelProps {
  /** The visible field label. */
  label: ReactNode;
  /** Current confidence for the fact this field records. */
  status: ProvenanceStatus;
  /** Documents the mark can cite as the fact's source. */
  sources: SourceOption[];
  /** Fired when the confidence or cited source changes. */
  onChange: (status: ProvenanceStatus, sourceLabel?: string, sourceId?: string) => void;
}

/**
 * A field label with its confidence mark sitting inline beside it — the way
 * every provenance-bearing field announces "how do we know this?". Pair it with
 * any control by passing it as that control's `label`.
 */
export function ProvLabel({ label, status, sources, onChange }: ProvLabelProps) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {label}
      <ProvenanceMark status={status} sources={sources} onChange={onChange} size={13} />
    </span>
  );
}

export interface ProvFieldProps {
  label: ReactNode;
  placeholder?: string;
  /** The form field `name`, and the provenance key the mark reads/writes under. */
  fieldKey: string;
  required?: boolean;
  defaultValue?: string;
  error?: string;
  status: ProvenanceStatus;
  sources: SourceOption[];
  /** Fired with the field key plus the new confidence / cited source. */
  onProvChange: (fieldKey: string, status: ProvenanceStatus, sourceLabel?: string, sourceId?: string) => void;
}

/**
 * ProvField — a text {@link Input} carrying its provenance mark in the label.
 *
 * The everyday pairing for a recorded fact: the value on the left, a confidence
 * mark on the label that opens to set status and cite a source. Uncontrolled
 * (it submits via `name={fieldKey}` inside a form); keep it module-scoped in the
 * consumer so React preserves its identity and never resets `defaultValue`.
 */
export function ProvField({
  label,
  placeholder,
  fieldKey,
  required,
  defaultValue,
  error,
  status,
  sources,
  onProvChange,
}: ProvFieldProps) {
  return (
    <div style={{ flex: 1 }}>
      <Input
        name={fieldKey}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        error={error}
        label={
          <ProvLabel
            label={label}
            status={status}
            sources={sources}
            onChange={(s, srcLabel, srcId) => onProvChange(fieldKey, s, srcLabel, srcId)}
          />
        }
      />
    </div>
  );
}

export interface ProvLocationFieldProps {
  label: ReactNode;
  /** Shown as the picker's hint line. */
  placeholder?: string;
  /** The form field `name` the place label submits under, and the provenance key. */
  fieldKey: string;
  value: LocationValue | null;
  onChange: (value: LocationValue | null) => void;
  status: ProvenanceStatus;
  sources: SourceOption[];
  onProvChange: (fieldKey: string, status: ProvenanceStatus, sourceLabel?: string, sourceId?: string) => void;
  onSearch: (query: string) => Promise<LocationSuggestion[]>;
}

/**
 * ProvLocationField — the location-aware sibling of {@link ProvField}.
 *
 * A structured {@link LocationField} (country → address) that still submits a
 * plain label string through a hidden input, so a server form sees an unchanged
 * free-text place while the picker gets full geocoder UX. The label prefers the
 * value's own `label`, falling back to its composed parts.
 */
export function ProvLocationField({
  label,
  placeholder,
  fieldKey,
  value,
  onChange,
  status,
  sources,
  onProvChange,
  onSearch,
}: ProvLocationFieldProps) {
  // Prefer the value's own label, else its composed parts — the inverse
  // precedence of formatLocation, which leads with the parts.
  const submitted = value ? value.label.trim() || formatLocation(value) : "";
  return (
    <div style={{ flex: 1 }}>
      <input type="hidden" name={fieldKey} value={submitted} />
      <LocationField
        value={value}
        onChange={onChange}
        onSearch={onSearch}
        hint={placeholder}
        label={
          <ProvLabel
            label={label}
            status={status}
            sources={sources}
            onChange={(s, srcLabel, srcId) => onProvChange(fieldKey, s, srcLabel, srcId)}
          />
        }
      />
    </div>
  );
}
