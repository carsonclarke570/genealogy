import { Timeline, TimelineItem, IconBadge, DocChip } from "@family-archive/ui";

const HeartIcon = () => (<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20S4 14.6 4 9.2A3.7 3.7 0 0112 6.6 3.7 3.7 0 0120 9.2C20 14.6 12 20 12 20z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>);
const ShipIcon = () => (<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 17h14l-2 4H7zM7 17V9l5-2 5 2v8M12 4v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const HomeIcon = () => (<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 11l8-7 8 7M6 10v9h12v-9M10 19v-5h4v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const PinIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s6.5-5.6 6.5-10.5a6.5 6.5 0 10-13 0C5.5 15.4 12 21 12 21z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="10.5" r="2" stroke="currentColor" strokeWidth="1.8" /></svg>);

const place = (text: string) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><PinIcon />{text}</span>
);

export function LifeEvents() {
  return (
    <div style={{ width: 460 }}>
      <Timeline>
        <TimelineItem
          icon={<IconBadge icon={<ShipIcon />} color="var(--color-accent)" />}
          date="1910" category="Immigration" categoryColor="var(--color-accent)"
          title="Emigrated from Cork aboard the SS Cymric"
          meta={place("Cork → Boston")}
        />
        <TimelineItem
          icon={<IconBadge icon={<HeartIcon />} color="var(--doc-certificate)" />}
          date="1913" category="Marriage" categoryColor="var(--doc-certificate)"
          title="Married Thomas Reardon at St. Mary’s"
          meta={<><DocChip type="certificate">Marriage certificate</DocChip></>}
        />
        <TimelineItem
          icon={<IconBadge icon={<HomeIcon />} color="var(--color-primary)" />}
          date="1921" category="Moved" categoryColor="var(--color-primary)"
          title="Bought the house on Elm Street"
          meta={place("Dorchester, MA")}
        />
      </Timeline>
    </div>
  );
}
