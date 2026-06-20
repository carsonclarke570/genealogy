import { Toast } from "@family-archive/ui";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12, width: 380 };

export function Tones() {
  return (
    <div style={col}>
      <Toast tone="success" title="Saved" onDismiss={() => {}}>Eleanor’s record was updated.</Toast>
      <Toast tone="info" title="Upload started" onDismiss={() => {}}>Scanning 3 documents…</Toast>
      <Toast tone="warning" title="Missing source" onDismiss={() => {}}>This date has no attached document.</Toast>
      <Toast tone="danger" title="Upload failed" onDismiss={() => {}}>The file was larger than 25&nbsp;MB.</Toast>
    </div>
  );
}

export function MessageOnly() {
  return (
    <div style={col}>
      <Toast tone="neutral" onDismiss={() => {}}>Link copied to clipboard.</Toast>
    </div>
  );
}
