import { EmptyState, Button } from "@family-archive/ui";

const TreeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="6" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="18" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 7.5v3m0 0H6.5a1 1 0 00-1 1v3m6.5-4h5.5a1 1 0 011 1v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const DocIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 3h7l5 5v13a0 0 0 010 0H6a0 0 0 010 0V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M13 3v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

export function NoPeople() {
  return (
    <div style={{ width: 420 }}>
      <EmptyState
        icon={<TreeIcon />}
        title="No people yet"
        description="Add the first person to begin building your family tree. Everyone you add can be linked, dated, and documented."
        action={<Button variant="primary">Add person</Button>}
      />
    </div>
  );
}

export function NoDocuments() {
  return (
    <div style={{ width: 420 }}>
      <EmptyState
        icon={<DocIcon />}
        title="No documents attached"
        description="Upload a photo, certificate, or article to keep Eleanor’s record complete."
        action={<Button variant="secondary">Upload media</Button>}
      />
    </div>
  );
}

export function NoResults() {
  return (
    <div style={{ width: 420 }}>
      <EmptyState
        title="No matches"
        description="No people match “Whitfeld”. Check the spelling, or search by birthplace or year."
      />
    </div>
  );
}
