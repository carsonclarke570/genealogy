import { IconBadge } from "@family-archive/ui";

const HeartIcon = () => (<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20S4 14.6 4 9.2A3.7 3.7 0 0112 6.6 3.7 3.7 0 0120 9.2C20 14.6 12 20 12 20z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>);
const HomeIcon = () => (<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 11l8-7 8 7M6 10v9h12v-9M10 19v-5h4v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const ShipIcon = () => (<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 17h14l-2 4H7zM7 17V9l5-2 5 2v8M12 4v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const CapIcon = () => (<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4L2 9l10 5 10-5zM6 11v5c0 1.2 3 2.6 6 2.6s6-1.4 6-2.6v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>);

const row: React.CSSProperties = { display: "flex", gap: 16, alignItems: "center" };

export function Types() {
  return (
    <div style={row}>
      <IconBadge icon={<HeartIcon />} color="var(--doc-certificate)" title="Marriage" />
      <IconBadge icon={<CapIcon />} color="var(--doc-article)" title="Graduation" />
      <IconBadge icon={<ShipIcon />} color="var(--color-accent)" title="Immigration" />
      <IconBadge icon={<HomeIcon />} color="var(--color-primary)" title="Moved" />
    </div>
  );
}

export function Sizes() {
  return (
    <div style={row}>
      <IconBadge icon={<HeartIcon />} color="var(--doc-certificate)" size={26} />
      <IconBadge icon={<HeartIcon />} color="var(--doc-certificate)" size={34} />
      <IconBadge icon={<HeartIcon />} color="var(--doc-certificate)" size={44} />
    </div>
  );
}
