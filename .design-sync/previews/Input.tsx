import { Input } from "@family-archive/ui";

const field: React.CSSProperties = { width: 300 };

export function Default() {
  return (
    <div style={field}>
      <Input label="Full name" defaultValue="Eleanor Margaret Whitfield" />
    </div>
  );
}

export function WithHint() {
  return (
    <div style={field}>
      <Input
        label="Birthplace"
        hint="Town and country, if known"
        placeholder="Cork, Ireland"
      />
    </div>
  );
}

export function Required() {
  return (
    <div style={field}>
      <Input label="Birth year" required placeholder="1888" />
    </div>
  );
}

export function Invalid() {
  return (
    <div style={field}>
      <Input
        label="Email"
        defaultValue="eleanor[at]example"
        error="That doesn’t look like an email address"
      />
    </div>
  );
}

export function Disabled() {
  return (
    <div style={field}>
      <Input label="Record ID" disabled defaultValue="P-00417" />
    </div>
  );
}
