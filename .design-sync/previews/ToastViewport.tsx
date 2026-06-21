import { ToastViewport, Toast } from "@family-archive/ui";

// ToastViewport is position:fixed (correct in a real app). In the preview card
// it would anchor to the harness's transformed wrapper, so we give it a sized,
// relatively-positioned stage whose own transform makes it the containing block
// — the fixed stack then anchors inside this box.
const stage: React.CSSProperties = {
  position: "relative",
  transform: "translateZ(0)",
  width: "100%",
  maxWidth: 480,
  height: 300,
  borderRadius: 10,
  overflow: "hidden",
  background: "var(--color-surface-sunken)",
};

export function Stack() {
  return (
    <div style={stage}>
      <ToastViewport position="bottom">
        <Toast tone="success" title="Saved" onDismiss={() => {}}>Eleanor’s record was updated.</Toast>
        <Toast tone="info" title="Upload started" onDismiss={() => {}}>Scanning 3 documents…</Toast>
        <Toast tone="neutral" onDismiss={() => {}}>Link copied to clipboard.</Toast>
      </ToastViewport>
    </div>
  );
}

export function TopEnd() {
  return (
    <div style={stage}>
      <ToastViewport position="top-end">
        <Toast tone="warning" title="Missing source" onDismiss={() => {}}>This date has no attached document.</Toast>
        <Toast tone="danger" title="Upload failed" onDismiss={() => {}}>The file was larger than 25&nbsp;MB.</Toast>
      </ToastViewport>
    </div>
  );
}
