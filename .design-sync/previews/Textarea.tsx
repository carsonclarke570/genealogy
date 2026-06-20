import { Textarea } from "@family-archive/ui";

const field: React.CSSProperties = { width: 360 };

export function Default() {
  return (
    <div style={field}>
      <Textarea
        label="Notes"
        rows={4}
        defaultValue="Eleanor kept the family letters in a tin box; several survive and are scanned in the archive."
      />
    </div>
  );
}

export function WithHint() {
  return (
    <div style={field}>
      <Textarea label="Biography" rows={4} hint="Plain text; saved with the record" placeholder="What do you know about this person?" />
    </div>
  );
}

export function Invalid() {
  return (
    <div style={field}>
      <Textarea label="Notes" rows={3} defaultValue="x" error="Notes must be at least 10 characters" />
    </div>
  );
}
