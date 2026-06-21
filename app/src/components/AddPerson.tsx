"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  Input,
  ProvenanceMark,
  RadioGroup,
  Select,
  Switch,
  Textarea,
} from "@family-archive/ui";
import type { ProvenanceStatus } from "@family-archive/ui";
import { sourceOptions } from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import { createPerson } from "@/lib/actions";
import { Icon } from "./Icon";
import type { Screen } from "./AppShell";

interface ProvState {
  status: ProvenanceStatus;
  source?: string;
}

export function AddPerson({
  onNavigate,
  onToast,
}: {
  onNavigate: (screen: Screen, personId?: string) => void;
  onToast: (message: string) => void;
}) {
  const { media } = useDataset();
  const router = useRouter();
  const [prov, setProv] = useState<Record<string, ProvState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const sources = sourceOptions(media);
  const stOf = (k: string): ProvenanceStatus => prov[k]?.status ?? "unverified";
  const setP = (k: string, status: ProvenanceStatus, source?: string) =>
    setProv((s) => ({ ...s, [k]: { status, source } }));

  const handleSubmit = (formData: FormData) =>
    startTransition(async () => {
      const result = await createPerson(formData);
      if (result.ok) {
        setErrors({});
        onToast("Person saved to the family archive");
        router.refresh();
        onNavigate("person", result.id);
      } else {
        setErrors(result.errors);
      }
    });

  const ProvField = ({
    label,
    placeholder,
    k,
    required,
  }: {
    label: string;
    placeholder: string;
    k: string;
    required?: boolean;
  }) => (
    <div style={{ flex: 1 }}>
      <Input
        name={k}
        placeholder={placeholder}
        required={required}
        error={errors[k]}
        label={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            {label}
            <ProvenanceMark
              status={stOf(k)}
              sources={sources}
              onChange={(status, source) => setP(k, status, source)}
              size={13}
            />
          </span>
        }
      />
    </div>
  );

  const RelRow = ({ rel }: { rel: string }) => (
    <div className="app-field-row" style={{ alignItems: "flex-end" }}>
      <div style={{ width: 130, flex: "none" }}>
        <Select defaultValue={rel} aria-label="Relationship type">
          <option>Parent</option>
          <option>Spouse</option>
          <option>Child</option>
          <option>Sibling</option>
        </Select>
      </div>
      <div style={{ flex: 1 }}>
        <Input placeholder="Find or create a person…" />
      </div>
      <Button variant="ghost" size="sm" iconStart={<Icon name="close" size={16} />} aria-label="Remove relationship" />
    </div>
  );

  return (
    <div
      className="app-scroll"
      style={{ height: "100%", overflow: "auto", padding: "var(--space-xl) var(--space-2xl) var(--space-4xl)" }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ marginBottom: "var(--space-md)" }}>
          <Breadcrumb
            items={[
              { label: "Family tree", onClick: () => onNavigate("explorer") },
              { label: "Add a person" },
            ]}
          />
        </div>
        <div className="app-display" style={{ fontSize: "var(--text-display)", marginBottom: 4 }}>
          Add a person
        </div>
        <div className="app-muted" style={{ fontSize: "var(--text-body)", marginBottom: "var(--space-xl)", maxWidth: "60ch" }}>
          Records are sacred — fill what you know, leave the rest blank. Nothing is published outside the family.
        </div>

        <form className="app-form-grid" action={handleSubmit}>
          <input type="hidden" name="prov" value={JSON.stringify(prov)} />
          <div style={{ display: "grid", gap: "var(--space-xl)" }}>
            <Card title="Identity">
              <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginBottom: "var(--space-md)" }}>
                Tap the mark by any field to set its confidence — verified (cite a source), estimated, or disputed.
              </div>
              <div style={{ display: "grid", gap: "var(--space-lg)" }}>
                <div className="app-field-row">
                  <ProvField label="Given names" placeholder="e.g. Eleanor Margaret" k="given" required />
                  <ProvField label="Surname" placeholder="e.g. Whitfield" k="surname" required />
                </div>
                <div className="app-field-row" style={{ alignItems: "flex-end" }}>
                  <ProvField label="Maiden name (optional)" placeholder="e.g. Hartley" k="maiden" />
                  <div style={{ width: 160, flex: "none" }}>
                    <Select label="Sex" name="sex" defaultValue="" required error={errors.sex}>
                      <option value="">—</option>
                      <option value="f">Female</option>
                      <option value="m">Male</option>
                      <option value="o">Other</option>
                    </Select>
                  </div>
                </div>
                <Checkbox
                  name="living"
                  label="Living person"
                  description="Hides sensitive details (certificates, exact dates) from non-curators."
                />
              </div>
            </Card>

            <Card title="Life events">
              <div style={{ display: "grid", gap: "var(--space-lg)" }}>
                <div>
                  <div className="app-label" style={{ marginBottom: "var(--space-sm)" }}>
                    Birth
                  </div>
                  <div className="app-field-row">
                    <ProvField label="Date" placeholder="YYYY-MM-DD" k="birthDate" />
                    <ProvField label="Place" placeholder="City, country" k="birthPlace" />
                  </div>
                </div>
                <div>
                  <div className="app-label" style={{ marginBottom: "var(--space-sm)" }}>
                    Death <span style={{ fontWeight: 400 }}>(if applicable)</span>
                  </div>
                  <div className="app-field-row">
                    <ProvField label="Date" placeholder="YYYY-MM-DD" k="deathDate" />
                    <ProvField label="Place" placeholder="City, country" k="deathPlace" />
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Relationships">
              <div style={{ display: "grid", gap: "var(--space-md)" }}>
                <RelRow rel="Parent" />
                <RelRow rel="Spouse" />
                <div>
                  <Button variant="ghost" size="sm" iconStart={<Icon name="plus" size={16} />}>
                    Add relationship
                  </Button>
                </div>
              </div>
            </Card>

            <Card title="Notes">
              <Textarea name="notes" rows={4} placeholder="Biography, anecdotes, sources to follow up…" />
            </Card>
          </div>

          <div style={{ display: "grid", gap: "var(--space-lg)", position: "sticky", top: 0 }}>
            <Card title="Portrait">
              <button className="app-dropzone" style={{ height: 150, borderRadius: "var(--radius-full)" }}>
                <Icon name="upload" />
                <span style={{ fontSize: "var(--text-body-sm)" }}>Drop a photo</span>
              </button>
            </Card>
            <Card title="Documents">
              <button className="app-dropzone" style={{ height: 96 }}>
                <Icon name="upload" />
                <span style={{ fontSize: "var(--text-body-sm)" }}>Certificates, articles, PDFs</span>
              </button>
            </Card>
            <Card title="Visibility">
              <RadioGroup
                legend=""
                name="visibility"
                defaultValue="family"
                options={[
                  { value: "family", label: "Everyone in the family" },
                  { value: "curators", label: "Curators only", description: "For sensitive records." },
                ]}
              />
              <div style={{ marginTop: "var(--space-md)" }}>
                <Switch label="Notify contributors when saved" />
              </div>
            </Card>
            <Card>
              <div style={{ display: "grid", gap: "var(--space-sm)" }}>
                <Button type="submit" variant="primary" fullWidth loading={pending}>
                  Save person
                </Button>
                <Button type="button" variant="secondary" fullWidth disabled={pending} onClick={() => onNavigate("explorer")}>
                  Cancel
                </Button>
                <div className="app-muted" style={{ fontSize: "var(--text-label)", textAlign: "center" }}>
                  Saved to the family archive only
                </div>
              </div>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
