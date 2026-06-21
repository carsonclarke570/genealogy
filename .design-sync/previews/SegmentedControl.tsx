import { useState } from "react";
import { SegmentedControl } from "@family-archive/ui";

const ClockIcon = () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 5v3l2 1.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const SlidersIcon = () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 5h6M11 5h2M3 11h2M7 11h6M9 3.5v3M5 9.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>);
const CalendarIcon = () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="3" y="4" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1.4" /><path d="M3 7h10M6 2.5v2M10 2.5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>);

export function LayoutSwitch() {
  const [v, setV] = useState("vertical");
  return (
    <SegmentedControl
      aria-label="Tree layout"
      value={v}
      onValueChange={setV}
      items={[
        { value: "vertical", label: "Vertical" },
        { value: "horizontal", label: "Horizontal" },
        { value: "radial", label: "Radial" },
      ]}
    />
  );
}

export function WithIcons() {
  const [v, setV] = useState("river");
  return (
    <SegmentedControl
      aria-label="Timeline mode"
      value={v}
      onValueChange={setV}
      items={[
        { value: "river", label: "River", icon: <ClockIcon /> },
        { value: "lanes", label: "Lanes", icon: <SlidersIcon /> },
        { value: "decades", label: "Decades", icon: <CalendarIcon /> },
      ]}
    />
  );
}

export function Small() {
  const [v, setV] = useState("all");
  return (
    <SegmentedControl
      size="sm"
      aria-label="Filter"
      value={v}
      onValueChange={setV}
      items={[
        { value: "all", label: "All" },
        { value: "living", label: "Living" },
        { value: "deceased", label: "Deceased" },
      ]}
    />
  );
}
