import { Dialog, Button } from "@family-archive/ui";

// The Dialog backdrop is position:fixed (correct in a real app). In the preview
// card it would resolve against the harness's transformed wrapper, so we give it
// a sized, relatively-positioned stage (its own transform makes it the containing
// block) — the open modal then centers inside this box.
const stage: React.CSSProperties = {
  position: "relative",
  transform: "translateZ(0)",
  width: "100%",
  maxWidth: 560,
  height: 360,
  borderRadius: 10,
  overflow: "hidden",
  background: "var(--color-surface)",
};

export function ConfirmDelete() {
  return (
    <div style={stage}>
      <Dialog
        open
        onClose={() => {}}
        title="Delete this record?"
        description="This removes Eleanor Margaret Whitfield and detaches her 3 documents. This can’t be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => {}}>Cancel</Button>
            <Button variant="danger" onClick={() => {}}>Delete record</Button>
          </>
        }
      />
    </div>
  );
}
