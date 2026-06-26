/**
 * Schema-driven field controls for the staged upload's per-person Update stage.
 *
 * These are the generic, reusable pieces the wizard renders the registry with:
 *   - {@link Field}      — one control, chosen by the descriptor's `type`.
 *   - {@link Leaf}       — a person/life leaf: the control + a dirty marker, a
 *                          "was …" note, and a revert affordance once it differs.
 *   - {@link ItemFields} — the row of controls for one collection item.
 *   - {@link Collection} — the add / edit / remove list editor for a collection.
 * Because everything reads the {@link FieldDesc}/{@link Model} registry, a new
 * record model becomes editable with no change to this file.
 */
"use client";

import type { PartialDate, LocationValue } from "@family-archive/ui";
import { Badge, Button, Combobox, DateField, IconButton, Input, LocationField, Select, Textarea } from "@family-archive/ui";
import { Icon } from "../Icon";
import {
  blankItem,
  type CollectionModel,
  type CollItem,
  type FieldDesc,
  type LeafValue,
} from "@/lib/staged-upload/registry";
import { show, valEq } from "@/lib/staged-upload/diff";
import { searchPlaces, type UploadCtx } from "./shared";

const MAX_YEAR = new Date().getFullYear() + 1;

/** One editable control, dispatched on the field descriptor's type. */
export function Field({
  field,
  value,
  onChange,
  ctx,
}: {
  field: FieldDesc;
  value: unknown;
  onChange: (v: unknown) => void;
  ctx: UploadCtx;
}) {
  switch (field.type) {
    case "select":
      return (
        <Select label={field.label} value={value == null ? "" : String(value)} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">—</option>
          {field.options?.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      );
    case "date":
      return (
        <DateField
          label={field.label}
          clearable
          minYear={1700}
          maxYear={MAX_YEAR}
          placeholder="Unknown"
          value={(value as PartialDate | null) ?? null}
          onChange={(v) => onChange(v)}
        />
      );
    case "place":
      return (
        <LocationField
          label={field.label}
          placeholder={field.placeholder}
          value={(value as LocationValue | null) ?? null}
          onChange={(v) => onChange(v)}
          onSearch={searchPlaces}
        />
      );
    case "person":
      return (
        <Combobox
          label={field.label}
          placeholder={field.placeholder || "Search people…"}
          value={value ? String(value) : null}
          onChange={(v) => onChange(v)}
          options={ctx.peopleOpts}
          emptyMessage="No match — add them on the People step."
        />
      );
    case "textarea":
      return (
        <Textarea label={field.label} rows={3} value={value ? String(value) : ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />
      );
    default:
      return (
        <Input
          label={field.label}
          value={value ? String(value) : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          inputMode={field.type === "year" ? "numeric" : undefined}
          hint={field.hint}
        />
      );
  }
}

/** A single person/life leaf: the control plus a dirty marker + revert. */
export function Leaf({
  field,
  pathKey,
  original,
  leaves,
  ctx,
  onSet,
}: {
  field: FieldDesc;
  pathKey: string;
  original: LeafValue | undefined;
  leaves: Record<string, LeafValue>;
  ctx: UploadCtx;
  onSet: (path: string, value: LeafValue) => void;
}) {
  const cur = pathKey in leaves ? leaves[pathKey] : (original ?? null);
  const dirty = !valEq(cur, original ?? null);
  return (
    <div className={"app-leaf" + (dirty ? " dirty" : "")} style={field.half ? { minWidth: 0 } : { gridColumn: "1 / -1", minWidth: 0 }}>
      <Field field={field} value={cur} ctx={ctx} onChange={(v) => onSet(pathKey, v as LeafValue)} />
      {dirty && (
        <div className="app-leaf-meta">
          <span className="app-leaf-was">was {show(original ?? null)}</span>
          <button type="button" className="app-link app-leaf-revert" onClick={() => onSet(pathKey, (original ?? null) as LeafValue)} title="Revert">
            <Icon name="rotate" size={13} /> revert
          </button>
        </div>
      )}
    </div>
  );
}

/** The row of controls for one collection item (relationship, residence, …). */
export function ItemFields({
  model,
  item,
  ctx,
  onChange,
}: {
  model: CollectionModel;
  item: CollItem;
  ctx: UploadCtx;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const fields = model.item.fields.filter((f) => !f.when || f.when(item));
  return (
    <div className="app-fgrid">
      {fields.map((f) => (
        <div key={f.key} style={f.half ? { minWidth: 0 } : { gridColumn: "1 / -1", minWidth: 0 }}>
          <Field field={f} value={item[f.key]} ctx={ctx} onChange={(v) => onChange({ [f.key]: v })} />
        </div>
      ))}
    </div>
  );
}

/** Add / edit / remove editor for a collection model (names, rels, residences, events). */
export function Collection({
  model,
  items,
  ctx,
  onItems,
}: {
  model: CollectionModel;
  items: CollItem[];
  ctx: UploadCtx;
  onItems: (next: CollItem[]) => void;
}) {
  const setItem = (id: string, patch: Record<string, unknown>) => onItems(items.map((it) => (it._id === id ? { ...it, ...patch } : it)));
  const addItem = () => onItems(items.concat([blankItem(model)]));

  return (
    <div className="app-coll">
      {items.length === 0 && <div className="app-coll-empty">{model.emptyHint}</div>}
      <div className="app-coll-list">
        {items.map((it) => {
          if (it._existing && it._removed) {
            return (
              <div key={it._id} className="app-coll-row removed">
                <span className="app-strike">{model.item.title(it, ctx)}</span>
                <Badge tone="danger" dot>
                  Will be removed
                </Badge>
                <button type="button" className="app-link" onClick={() => setItem(it._id, { _removed: false })}>
                  Undo
                </button>
              </div>
            );
          }
          return (
            <div key={it._id} className="app-coll-card">
              <div className="app-coll-cardhead">
                <span className="app-coll-title">{model.item.title(it, ctx)}</span>
                {it._existing ? <Badge>On file</Badge> : <Badge tone="info">New</Badge>}
                <div style={{ flex: 1 }} />
                <IconButton
                  className="app-coll-x"
                  aria-label={it._existing ? "Remove this record" : "Discard"}
                  title={it._existing ? "Remove this record" : "Discard"}
                  onClick={() => (it._existing ? setItem(it._id, { _removed: true }) : onItems(items.filter((x) => x._id !== it._id)))}
                >
                  <Icon name="trash" size={14} />
                </IconButton>
              </div>
              <ItemFields model={model} item={it} ctx={ctx} onChange={(patch) => setItem(it._id, patch)} />
            </div>
          );
        })}
      </div>
      <Button variant="ghost" size="sm" iconStart={<Icon name="plus" size={15} />} onClick={addItem}>
        {model.addLabel}
      </Button>
    </div>
  );
}
