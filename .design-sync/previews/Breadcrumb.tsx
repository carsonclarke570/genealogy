import { Breadcrumb } from "@family-archive/ui";

export function Lineage() {
  return (
    <Breadcrumb
      items={[
        { label: "Family tree", href: "#" },
        { label: "Whitfield line", href: "#" },
        { label: "Eleanor Whitfield", href: "#" },
        { label: "Aoife Reardon" },
      ]}
    />
  );
}

export function Short() {
  return (
    <Breadcrumb
      items={[
        { label: "Family tree", href: "#" },
        { label: "Eleanor Whitfield" },
      ]}
    />
  );
}
