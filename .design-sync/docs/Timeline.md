---
category: Genealogy
---

Timeline — a vertical, rail-connected list of dated events.

Structure only — genealogy fills it with life events, but it suits any
chronology. It draws the connector between markers and hides the trailing
segment on the last `TimelineItem` automatically (you don't set `last`).

@example
<Timeline>
  <TimelineItem
    icon={<IconBadge icon={<HeartIcon />} color="var(--doc-certificate)" />}
    date="1947" category="Marriage" categoryColor="var(--doc-certificate)"
    title="Married at St. Mary’s, Boston"
    meta={<DocChip type="certificate">Marriage certificate</DocChip>}
  />
  <TimelineItem icon={<IconBadge icon={<HomeIcon />} />} date="1952" title="Bought the house on Elm St." />
</Timeline>

## Props

```ts
interface TimelineProps {
  /** A list of `<TimelineItem>` elements. */
  children: React.ReactNode;
}
```

## Related

`TimelineItem`
